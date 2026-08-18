import { useEffect, useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { joinInProgress } from '@/lib/joinState'
import { snaBrand } from '@/lib/brand'

export default function LoginPage() {
  const { signInAnonymously, signOut } = useAuth()
  const { success, error: toastError } = useToast()
  const [code, setCode] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ code?: string }>({})
  const [busy, setBusy] = useState(false)

  // Reset the join-hold flag once this page unmounts (it stays set through a
  // successful join so PublicOnly holds the login page until the hard
  // navigation replaces the page).
  useEffect(() => {
    return () => {
      joinInProgress.current = false
    }
  }, [])

  const handleCode = async (e: FormEvent) => {
    e.preventDefault()
    if (code.trim().length < 4) {
      setFieldErrors({ code: 'Enter the team code from your captain.' })
      return
    }
    setBusy(true)
    let rpcFailed = false
    // Hold the login page mounted (PublicOnly skips its redirect) until the
    // join settles, then let the guards chain /login -> /portal ->
    // /portal/pick-identity in sequence. We must NOT call navigate() here: it would
    // race the finally-block re-render (PublicOnly releasing the flag), and
    // two navigations in one tick make the browser throttle and blank the
    // page.
    joinInProgress.current = true
    try {
      // Code-first entry: anonymous account, no email or password needed.
      await signInAnonymously()
      const { error } = await supabase.rpc('join_team_with_code', { p_code: code.trim().toUpperCase() })
      if (error) {
        rpcFailed = true
        const msg = error.message.includes('INVITE_INVALID')
          ? 'That team code wasn’t found. Double-check it with your captain.'
          : error.message.includes('ALREADY_IN_TEAM')
            ? 'This device already belongs to a team.'
            : error.message
        throw new Error(msg)
      }
      success('You’re in! Who are you?')
      // Hard navigation: reload the app into /pick-identity. The session is
      // persisted by Supabase, so on boot every guard evaluates settled
      // state (session + profile + team all loaded) and lands on the
      // identity picker. A soft navigate() here races the async profile
      // load (the session change kicks one off) and the guards ping-pong
      // /login <-> /dashboard in an endless loop that blanks the page.
      const u = new URL(window.location.href)
      u.searchParams.set('joined', '1')
      u.hash = '#/portal/pick-identity'
      window.location.replace(u.toString())
    } catch (err) {
      // A failed join leaves a stray anonymous session that silently redirects
      // the next visit to /no-team. Sign out so the user can retry cleanly.
      // isAnonymous is read from the session at failure time — the closure
      // value predates the anonymous sign-in.
      if (rpcFailed) {
        const { data: u } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
        if (u.user?.is_anonymous) {
          try {
            await signOut()
          } catch {
            /* best-effort cleanup */
          }
        }
      }
      toastError(err instanceof Error ? err.message : 'Couldn’t join the team.')
    } finally {
      setBusy(false)
      // Release the login hold. On success the page is being replaced by the
      // reload above; on failure the login page must behave normally again.
      joinInProgress.current = false
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10 dark:bg-[#0b1220]">
      <div className="mb-8 flex flex-col items-center gap-4">
        <img
          src={snaBrand.logo}
          alt="SNA"
          className="h-9 max-w-[220px] object-contain"
          draggable={false}
        />
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome to SNA</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{snaBrand.tagline}</p>
        </div>
      </div>

      <div className="card w-full max-w-md p-6 sm:p-8">
        <form onSubmit={handleCode} className="space-y-4" noValidate>
          <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Enter your team's code to jump straight in — no email or password needed.
          </p>
          <Field label="Team code" required error={fieldErrors.code} hint="Ask your captain — it's in Team Settings. Codes look like: ABC123XY">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123XY"
              className="text-center font-mono text-lg uppercase tracking-[0.3em]"
              maxLength={12}
              autoFocus
            />
          </Field>
          <Button type="submit" className="w-full" size="lg" loading={busy}>
            <KeyRound className="h-4 w-4" /> Enter Team
          </Button>
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            Then just tap your name on the roster to claim your spot.
          </p>
        </form>
      </div>

    </div>
  )
}
