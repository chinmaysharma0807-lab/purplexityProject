import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/client'

const supabase = createClient()

export default function Auth() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // already signed in? don't show a login screen
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/")
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) navigate("/")
      },
    )

    return () => subscription.unsubscribe()
  }, [navigate])

  async function loginWithGithub() {
    setBusy(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.origin },
    })

    if (error) {
      setError("Could not start sign in. Please try again.")
      setBusy(false)
    }
  }

  return (
    <div className="grid h-full place-items-center bg-[#0d0f10] px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 grid size-12 place-items-center rounded-xl border border-zinc-800 bg-[#141718] text-teal-400">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18" />
            </svg>
          </div>
          <h1 className="text-2xl font-medium text-zinc-100">Purplexity</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Sign in to ask questions and keep your threads.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#141718] p-6">
          <button
            onClick={loginWithGithub}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
            )}
            {busy ? "Redirecting…" : "Continue with GitHub"}
          </button>

          {error && (
            <p className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <p className="mt-5 text-center text-xs leading-5 text-zinc-600">
            We only read your public GitHub profile.
          </p>
        </div>

        <button
          onClick={() => navigate("/")}
          className="mt-6 w-full text-center text-xs text-zinc-500 hover:text-zinc-300"
        >
          Back to home
        </button>
      </div>
    </div>
  )
}
