import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Reject non-HTTPS Supabase URLs — all Supabase projects serve over HTTPS. */
const url = (() => {
  if (!rawUrl) return rawUrl
  if (/^https:\/\//i.test(rawUrl)) return rawUrl
  console.error(
    `[supabase] VITE_SUPABASE_URL must use HTTPS — got: ${rawUrl}`,
  )
  return undefined
})()

/** True when the app is running without a configured Supabase project. */
export const isSupabaseConfigured = Boolean(url && anonKey)

/** Bound every Supabase request so a cold start or broken connection cannot
    leave an auth/data loading state pending forever. */
const SUPABASE_REQUEST_TIMEOUT_MS = 10_000
const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController()
  let timedOut = false
  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, SUPABASE_REQUEST_TIMEOUT_MS)
  const upstreamSignal = init?.signal
  const abort = () => controller.abort()

  if (upstreamSignal) {
    if (upstreamSignal.aborted) controller.abort()
    else upstreamSignal.addEventListener('abort', abort, { once: true })
  }

  try {
    return await globalThis.fetch(input, { ...init, signal: controller.signal })
  } catch (error) {
    if (timedOut) throw new Error('Supabase request timed out.')
    throw error
  } finally {
    globalThis.clearTimeout(timeoutId)
    upstreamSignal?.removeEventListener('abort', abort)
  }
}

export const supabase: SupabaseClient = createClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
  {
    global: { fetch: fetchWithTimeout },
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
