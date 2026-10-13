import type { NextFunction, Request, Response } from "express";
import { createSupabaseClient } from "./client";
import { prisma } from "./db"

const client = createSupabaseClient();
export async function middleware(req:Request,res:Response,next:NextFunction){
    const token = req.headers.authorization?.replace("Bearer ", "")

    const data = await client.auth.getUser(token)
    const userId = data.data.user?.id
    if(userId){
        const user = data.data.user!
        await prisma.user.upsert({
            where: { id: user.id },
            update:{},
            create:{
                id: data.data.user?.id,
                supabaseId: data.data.user!.id,
                email: data.data.user?.email ?? "",
                provider: "Github",
                name: data.data.user?.user_metadata.full_name ?? ""
            }
        })
        req.userId = user.id
        next()
    }else{
        res.status(403).json({
            message: "Incorrect Inputs"
        })
    }
}