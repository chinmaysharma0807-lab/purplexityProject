import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router"
import type { User } from "@supabase/supabase-js"
import {
  ArrowUp, ChevronDown, Globe, Images, Monitor, Plus,
  Search, Sparkles, Square, Video, ExternalLink,
} from "lucide-react"

import Sidebar from "@/components/Sidebar"
import { createClient } from "@/lib/client"
import { ask, askFollowUp, getConversation, getConversations, type ConversationSummary } from "@/lib/api"
import { parseAnswer, type Source } from "@/lib/parse"

const supabase = createClient()

type Turn = { query: string; raw: string; done: boolean }
type Tab = "Answer" | "Links" | "Images" | "Videos"

const TABS: { label: Tab; icon: typeof Sparkles }[] = [
  { label: "Answer", icon: Sparkles },
  { label: "Links", icon: Globe },
  { label: "Images", icon: Images },
  { label: "Videos", icon: Video },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const params = useParams()

  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [conversationId, setConversationId] = useState<string | null>(params.id ?? null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])

  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<Tab>("Answer")
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  function refreshConversations() {
    getConversations().then(setConversations).catch(() => {})
  }

  // auth: read once, then follow changes (the OAuth redirect resolves async)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null),
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    refreshConversations()
  }, [user])

  // /c/:id loads that thread; / clears it
  useEffect(() => {
    if (!user) return

    if (!params.id) {
      setTurns([])
      setConversationId(null)
      return
    }

    getConversation(params.id)
      .then((conversation) => {
        const loaded: Turn[] = []
        for (const message of conversation.Message) {
          if (message.role === "User") {
            loaded.push({ query: message.content, raw: "", done: true })
          } else if (loaded.length) {
            loaded[loaded.length - 1]!.raw = message.content
          }
        }
        setTurns(loaded)
        setConversationId(conversation.id)
        setTab("Answer")
      })
      .catch(() => setError("Could not load that thread"))
  }, [user, params.id])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [turns])

  async function submit() {
    const query = input.trim()
    if (!query || busy) return

    if (!user) {
      navigate("/auth")
      return
    }

    setInput("")
    setError(null)
    setBusy(true)
    setTab("Answer")
    setTurns((prev) => [...prev, { query, raw: "", done: false }])

    const append = (chunk: string) =>
      setTurns((prev) =>
        prev.map((turn, i) => (i === prev.length - 1 ? { ...turn, raw: turn.raw + chunk } : turn)),
      )

    try {
      const id = conversationId
        ? await askFollowUp(conversationId, query, append)
        : await ask(query, append)

      if (id && !conversationId) {
        setConversationId(id)
        window.history.replaceState(null, "", `/c/${id}`)
      }

      refreshConversations()
    } catch {
      setError("Something went wrong. Check that the backend is running on port 3001.")
    } finally {
      setBusy(false)
      setTurns((prev) => prev.map((t, i) => (i === prev.length - 1 ? { ...t, done: true } : t)))
    }
  }

  const parsedTurns = turns.map((turn) => ({ ...turn, ...parseAnswer(turn.raw) }))

  // de-duplicate sources across every turn in the thread
  const allSources: Source[] = []
  for (const turn of parsedTurns) {
    for (const source of turn.sources) {
      if (!allSources.some((s) => s.url === source.url)) allSources.push(source)
    }
  }

  const hasTurns = parsedTurns.length > 0

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0d0f10]">
      <Sidebar
        email={user?.email}
        conversations={conversations}
        activeId={conversationId}
        onNewChat={() => navigate("/")}
        onSelect={(id) => navigate(`/c/${id}`)}
        onSignIn={() => navigate("/auth")}
        onSignOut={async () => {
          await supabase.auth.signOut()
          setConversations([])
          navigate("/")
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-800/80 px-6">
          <nav className="flex gap-6">
            {TABS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => setTab(label)}
                className={`flex items-center gap-2 border-b-2 py-4 text-sm transition-colors ${
                  tab === label
                    ? "border-teal-400 text-zinc-100"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon className="size-4" />
                {label}
                {label === "Links" && allSources.length > 0 && (
                  <span className="rounded-full bg-zinc-800 px-1.5 text-[11px] text-zinc-400">
                    {allSources.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {user?.email && (
            <span className="truncate text-xs text-zinc-500">{user.email}</span>
          )}
        </header>

        <div ref={scrollRef} className="flex min-h-0 flex-1 gap-6 overflow-y-auto px-6 py-8">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
            {!hasTurns && !authLoading && tab === "Answer" && (
              <div className="mt-24 text-center">
                <h1 className="text-3xl font-medium text-zinc-100">Where knowledge begins</h1>
                <p className="mt-2 text-sm text-zinc-500">
                  {user ? "Ask anything to get started." : "Sign in to start asking questions."}
                </p>
              </div>
            )}

            {tab === "Answer" &&
              parsedTurns.map((turn, i) => (
                <article key={i} className="flex flex-col gap-4">
                  <div className="flex justify-end">
                    <p className="max-w-[80%] rounded-2xl bg-zinc-800/80 px-4 py-2.5 text-[15px] text-zinc-100">
                      {turn.query}
                    </p>
                  </div>

                  {!turn.answer && !turn.done && (
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <Sparkles className="size-4 animate-pulse text-teal-400" />
                      Searching the web and thinking…
                    </div>
                  )}

                  {turn.answer && (
                    <div className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-200">
                      {turn.answer}
                    </div>
                  )}

                  {turn.followUps.length > 0 && (
                    <div className="mt-2 border-t border-zinc-800 pt-3">
                      <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Related</p>
                      <div className="flex flex-col">
                        {turn.followUps.map((q) => (
                          <button
                            key={q}
                            onClick={() => setInput(q)}
                            className="flex items-center justify-between border-b border-zinc-800/60 py-2.5 text-left text-sm text-zinc-300 last:border-0 hover:text-teal-400"
                          >
                            {q}
                            <Plus className="size-4 shrink-0 text-zinc-600" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              ))}

            {tab === "Links" && (
              <div className="flex flex-col gap-2">
                {allSources.length === 0 && (
                  <p className="mt-16 text-center text-sm text-zinc-500">
                    Ask something first — sources from the web will show up here.
                  </p>
                )}
                {allSources.map((source, i) => (
                  <a
                    key={`${source.url}-${i}`}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start gap-3 rounded-xl border border-zinc-800 bg-[#141718] p-4 hover:border-zinc-700"
                  >
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-zinc-800 text-[11px] text-zinc-400">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-zinc-200 group-hover:text-teal-400">
                        {source.title ?? source.url}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-zinc-500">{source.url}</span>
                    </span>
                    <ExternalLink className="size-4 shrink-0 text-zinc-600" />
                  </a>
                ))}
              </div>
            )}

            {(tab === "Images" || tab === "Videos") && (
              <div className="mt-20 flex flex-col items-center text-center">
                {tab === "Images" ? (
                  <Images className="mb-3 size-8 text-zinc-700" />
                ) : (
                  <Video className="mb-3 size-8 text-zinc-700" />
                )}
                <p className="text-sm text-zinc-400">No {tab.toLowerCase()} yet</p>
                <p className="mt-1 max-w-sm text-xs text-zinc-600">
                  The backend returns web sources only. Enable{" "}
                  <code className="text-zinc-500">includeImages</code> on the Tavily search call to
                  populate this tab.
                </p>
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            )}
          </div>

          {tab === "Answer" && (
            <aside className="hidden w-[330px] shrink-0 xl:block">
              <div className="sticky top-0 rounded-xl border border-zinc-800 bg-[#141718] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300">Sources</span>
                  <span className="text-sm text-zinc-500">{allSources.length}</span>
                </div>

                <ul className="mt-3 flex flex-col gap-2">
                  {allSources.slice(0, 8).map((source, i) => (
                    <li key={`${source.url}-${i}`}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                      >
                        {source.title ?? source.url}
                      </a>
                    </li>
                  ))}
                  {allSources.length === 0 && (
                    <li className="px-2 py-1.5 text-xs text-zinc-600">No sources yet</li>
                  )}
                </ul>
              </div>
            </aside>
          )}
        </div>

        <div className="px-6 pb-6">
          <div className="mx-auto w-full max-w-3xl rounded-2xl border border-zinc-800 bg-[#141718] p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              rows={1}
              placeholder={hasTurns ? "Ask a follow-up" : "Ask anything…"}
              className="w-full resize-none bg-transparent px-1 text-[15px] text-zinc-100 outline-none placeholder:text-zinc-500"
            />

            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-800">
                  <Plus className="size-4" />
                </button>
                <span className="flex items-center gap-1.5 rounded-full bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-300">
                  <Search className="size-3.5" />
                  Search
                  <ChevronDown className="size-3.5 text-zinc-500" />
                </span>
                <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-zinc-400">
                  <Monitor className="size-3.5" />
                  Computer
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-zinc-400">
                  Model
                  <ChevronDown className="size-3.5 text-zinc-500" />
                </span>
                <button
                  onClick={submit}
                  disabled={busy || !input.trim()}
                  className="grid size-8 place-items-center rounded-lg bg-zinc-200 text-zinc-900 disabled:bg-zinc-700 disabled:text-zinc-500"
                >
                  {busy ? <Square className="size-3.5" /> : <ArrowUp className="size-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
