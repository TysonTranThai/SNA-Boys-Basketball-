import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True when the app is running without a configured Supabase project. */
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient = createClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

/** Return the Vite env var key that is missing, or null if all present. */
export function missingConfigVar(): string | null {
  if (!url) return 'VITE_SUPABASE_URL'
  if (!anonKey) return 'VITE_SUPABASE_ANON_KEY'
  return null
}
