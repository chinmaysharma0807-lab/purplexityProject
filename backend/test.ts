import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { SYSTEM_PROMPT } from "./prompt";

const { text } = await generateText({
  model: groq("openai/gpt-oss-120b"),
  system: SYSTEM_PROMPT,
  prompt: "What is the best resource for learning golang",
});

console.log(text);