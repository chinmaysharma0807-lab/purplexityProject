import { tavily } from '@tavily/core';
import express from "express";
import { groq } from "@ai-sdk/groq"
import { streamText } from "ai"
import { PROMPT_TEMPLATE } from './prompt';
import { SYSTEM_PROMPT } from "./prompt";
import { middleware } from './middleware';
import cors from "cors"
import { prisma } from './db';

// import { generateText } from "ai";
const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
const app = express()


app.use(express.json())
app.use(cors({
    origin: "http://localhost:5173",
    exposedHeaders: ["x-conversation-id"]
}));

function makeSlug(query: string){
    return query.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0,50) + "-" + Math.random().toString(36).slice(2,8)
}

//ROUTES->

//EndPoint-1 get past converesation
app.get("/conversations", middleware, async (req,res)=>{
    const conversations = await prisma.conversation.findMany({
        where: {userId: req.userId},
        select: {id: true, title: true, slug: true},
        orderBy: {createdAt: "desc"}
    })
    res.json({ conversations })
})

//EndPoint-2 gets messages in the conversation
app.get("/conversations/:id", middleware , async(req,res)=>{
    const conversation = await prisma.conversation.findFirst({
        where: {
            id: String(req.params.id),
            userId: req.userId
        },
        include:{
            Message: {orderBy:{createdAt: "asc"}}
        }
    })
    if(!conversation){
        res.status(404).json({message: "Not found"})
        return
    }
    res.json({conversation})
})


//EndPoint 3 new
app.post("/purplexity_ask", middleware , async (req, res) => {
    //get the query from the user
    const query = req.body.query;
    if(!query){
        res.status(400).json({message: "query is required"})
        return
    }
    const conversation = await prisma.conversation.create({
        data:{
            title: query.slice(0,80),
            slug: makeSlug(query),
            userId: req.userId!
        }
    })
    //make sure the user has access/credits to hit the end point
    //check if we have a web search indexed for a similar query
    await prisma.message.create({
        data:{
            conversationId: conversation.id,
            role: "User",
            content: query
        }
    })
    //web search to gather sources
    const webSearchResponse = await client.search(query, {
        searchDepth: "advanced"
    })
    const webSearchResult = webSearchResponse.results;

    //do some context engineering on the prompt + web search responses
    //hit the LLM and search and stream back the response
    //HIT THE llm? LLM api/openrouter/vercel ai gateway
    const prompt = PROMPT_TEMPLATE
        .replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResult))
        .replace("{{USER_QUERY}}", query)

    const result = streamText({
        model: groq("openai/gpt-oss-120b"),
        system: SYSTEM_PROMPT,
        prompt: prompt,
    });
    res.header(`Cache-Control`,`no-cache`)
    res.header(`Content-Type`,`text/plain; charset=utf-8`);
    res.header("x-conversation-id", conversation.id)

    let fullAnswer = ""

    for await (const textpart of result.textStream) {
        fullAnswer += textpart
        res.write(textpart);
    }

    res.write("\n<SOURCES>\n")

    //aslo stream back the sources and the follow up questions that we can get from another parallel LLM call
    res.write(JSON.stringify(webSearchResult.map(result => ({url: result.url}))))

    res.write("\n</SOURCES>\n")
    await prisma.message.create({
        data:{
            conversationId: conversation.id,
            role: "Assistant",
            content: fullAnswer
        }
    })
    //event stream ends
    res.end()

})


app.post("/purplexity_ask_follow_up", middleware , async(req,res) => {
    //get the existing chat from the db
    const { conversationId,query } = req.body

    if(!conversationId || !query){
        res.status(400).json({message: "conversationId and query are required"})
        return 
    }

    const conversation = await prisma.conversation.findFirst({
        where:{ id: conversationId, userId: req.userId },
        include: {
            Message: {orderBy: {createdAt: "asc"}, take:10 }
        }
    })
    if(!conversation){
        res.status(404).json({message: "Not found"})
        return
    }
    await prisma.message.create({
        data:{ conversationId, role: "User", content: query}
    })
    ///forward the full history to llm
    const webSearchResponse = await client.search(query, {searchDepth: "advanced"})
    const webSearchResult = webSearchResponse.results


    //todo: Do context engineering here.
    const history = conversation.Message.map(m => ({
        role: m.role==="User" ? "user" as const : "assistant" as const,
        content: m.content
    }))

    
    //stream the response to the user
    const result = streamText({
        model: groq("openai/gpt-oss-120b"),
        system: SYSTEM_PROMPT,
        messages:[
            ...history,
            {
                role: "user",
                content: PROMPT_TEMPLATE
                .replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResult))
                .replace("{{USER_QUERY}}",query)
            }
        ]
    })

    res.header("Cache-Control", "no-cache")
    res.header("Content-Type","text/plain; charset=utf-8")

    let fullAnswer = ""

    for await (const textpart of result.textStream){
        fullAnswer += textpart
        res.write(textpart)
    }

    res.write("\n<SOURCES>\n")
    res.write(JSON.stringify(webSearchResult.map(r => ({ url: r.url, title: r.title}))))
    res.write("\n</SOURCES>\n")

    await prisma.message.create({
        data:{
            conversationId, role: "Assistant", content: fullAnswer
        }
    })
    res.end()
})
app.listen(process.env.PORT || 3001);