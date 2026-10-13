import axios from "axios"
import { createClient } from "@/lib/client"
import { BACKEND_URL } from "@/lib/config"

const supabase = createClient()

export type ConversationSummary = {
  id: string
  title: string | null
  slug: string
}

export type StoredMessage = {
  id: number
  role: "User" | "Assistant"
  content: string
  createdAt: string
}

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  return { Authorization: `Bearer ${session?.access_token ?? ""}` }
}

export async function getConversations(): Promise<ConversationSummary[]> {
  const res = await axios.get(`${BACKEND_URL}/conversations`, {
    headers: await authHeader(),
  })
  return res.data.conversations
}

export async function getConversation(id: string) {
  const res = await axios.get(`${BACKEND_URL}/conversations/${id}`, {
    headers: await authHeader(),
  })
  return res.data.conversation as ConversationSummary & { Message: StoredMessage[] }
}

/**
 * Streams a response body chunk by chunk.
 * axios buffers the whole response, so streaming has to use fetch.
 */
async function streamRequest(
  path: string,
  body: unknown,
  onChunk: (text: string) => void,
): Promise<string | null> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok || !res.body) {
    throw new Error(`Request failed with status ${res.status}`)
  }

  const conversationId = res.headers.get("x-conversation-id")
  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    // stream:true so multi-byte characters split across chunks decode correctly
    onChunk(decoder.decode(value, { stream: true }))
  }

  return conversationId
}

export function ask(query: string, onChunk: (text: string) => void) {
  return streamRequest("/purplexity_ask", { query }, onChunk)
}

export function askFollowUp(
  conversationId: string,
  query: string,
  onChunk: (text: string) => void,
) {
  return streamRequest("/purplexity_ask_follow_up", { conversationId, query }, onChunk)
}
