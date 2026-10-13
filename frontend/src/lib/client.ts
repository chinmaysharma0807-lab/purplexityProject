import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    "https://kcixhygtssyxfdhowtfn.supabase.co",
    "sb_publishable_oE6jTv9cH58LWyauyguhCw_wiMBtkLp"
  )
}
