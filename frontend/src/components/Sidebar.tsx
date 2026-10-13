import { useState } from "react"
import { Plus, MessageSquare, Layers, CircleDot, Folder, History, CircleUser, LogOut, X } from "lucide-react"
import { useNavigate } from "react-router"
import type { ConversationSummary } from "@/lib/api"

type Props = {
  email?: string | null
  conversations: ConversationSummary[]
  activeId: string | null
  onNewChat: () => void
  onSelect: (id: string) => void
  onSignIn: () => void
  onSignOut: () => void
}

export default function Sidebar({
  email,
  conversations,
  activeId,
  onNewChat,
  onSelect,
  onSignIn,
  onSignOut,
}: Props) {
  const navigate = useNavigate()
  const [panel, setPanel] = useState<null | "threads" | "library">(null)

  const railItems = [
    { key: "threads" as const, icon: MessageSquare, label: "Threads", action: () => toggle("threads") },
    { key: "spaces", icon: Layers, label: "Spaces", action: () => setPanel(null) },
    { key: "discover", icon: CircleDot, label: "Discover", action: () => setPanel(null) },
    { key: "library" as const, icon: Folder, label: "Library", action: () => toggle("library") },
    { key: "history", icon: History, label: "History", action: () => toggle("threads") },
  ]

  function toggle(next: "threads" | "library") {
    setPanel((current) => (current === next ? null : next))
  }

  return (
    <div className="flex h-full shrink-0">
      <aside className="flex w-[62px] shrink-0 flex-col items-center border-r border-zinc-800/80 bg-[#0a0c0d] py-4">
        <button
          onClick={() => navigate("/")}
          title="Purplexity"
          className="mb-5 grid size-8 place-items-center rounded-md text-teal-400 hover:bg-zinc-800/60"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <button
          onClick={onNewChat}
          title="New thread"
          className="mb-4 grid size-9 place-items-center rounded-lg border border-zinc-700/70 text-zinc-300 hover:bg-zinc-800/60"
        >
          <Plus className="size-4" />
        </button>

        <nav className="flex flex-col items-center gap-1">
          {railItems.map(({ key, icon: Icon, label, action }) => (
            <button
              key={key}
              title={label}
              onClick={action}
              className={`grid size-9 place-items-center rounded-lg transition-colors ${
                panel === key
                  ? "bg-zinc-800 text-teal-400"
                  : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              <Icon className="size-[18px]" />
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-1">
          {email ? (
            <button
              onClick={onSignOut}
              title={`Sign out (${email})`}
              className="grid size-9 place-items-center rounded-full text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
            >
              <LogOut className="size-5" />
            </button>
          ) : (
            <button
              onClick={onSignIn}
              title="Sign in"
              className="grid size-9 place-items-center rounded-full text-teal-400 hover:bg-zinc-800/60"
            >
              <CircleUser className="size-6" />
            </button>
          )}
          <span className="text-[10px] text-teal-400">{email ? "Sign Out" : "Sign In"}</span>
        </div>
      </aside>

      {panel && (
        <div className="flex w-64 shrink-0 flex-col border-r border-zinc-800/80 bg-[#0a0c0d]">
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-sm font-medium text-zinc-200">
              {panel === "threads" ? "Threads" : "Library"}
            </span>
            <button
              onClick={() => setPanel(null)}
              className="grid size-6 place-items-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {conversations.length === 0 && (
              <p className="px-2 py-3 text-xs text-zinc-600">
                {email ? "No threads yet. Ask something to start one." : "Sign in to see your threads."}
              </p>
            )}

            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className={`mb-0.5 block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  activeId === conversation.id
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                }`}
              >
                {conversation.title ?? "Untitled thread"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
