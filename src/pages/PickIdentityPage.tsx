import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, KeyRound, Search, ShieldCheck, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/hooks/useAuth'
import { useTeam } from '@/hooks/useTeam'
import { useToast } from '@/hooks/useToast'
import { claimRosterIdentity, fetchRoster, promoteToCaptain } from '@/lib/api'
import type { Profile } from '@/types'

export default function PickIdentityPage() {
  const { team, refresh } = useTeam()
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const navigate = useNavigate()

  const [roster, setRoster] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [claiming, setClaiming] = useState<string | null>(null)
  const [captainPrompt, setCaptainPrompt] = useState(false)
  const [captainCode, setCaptainCode] = useState('')
  const [promoting, setPromoting] = useState(false)

  useEffect(() => {
    if (!team) return
    let cancelled = false
    setLoading(true)
    fetchRoster(team.id)
      .then((players) => {
        if (!cancelled) setRoster(players)
      })
      .catch(() => {
        /* retry on refresh; page shows empty state */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [team])

  // The team captain is shown on the roster too (badged, not claimable — a
  // player must never claim the captain's identity). Claimable = captain-added
  // player entries that no account is linked to yet.
  const captain = useMemo(() => roster.find((p) => p.role === 'captain'), [roster])
  const claimable = useMemo(
    () => roster.filter((p) => p.auth_user_id === null && p.is_active && p.role !== 'captain'),
    [roster],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return claimable
    return claimable.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        (p.position ?? '').toLowerCase().includes(q) ||
        String(p.jersey_number ?? '').includes(q),
    )
  }, [claimable, query])

  const captainVisible = useMemo(() => {
    if (!captain) return false
    const q = query.trim().toLowerCase()
    return !q || captain.full_name.toLowerCase().includes(q)
  }, [captain, query])

  const handleClaim = async (p: Profile) => {
    setClaiming(p.id)
    try {
      await claimRosterIdentity(p.id)
      await refresh()
      success(`You're in as ${p.full_name}. Welcome to the team! 🎉`)
      navigate('/portal/dashboard')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t claim that spot.')
      setClaiming(null)
    }
  }

  // The captain can tap their own name to go straight to the captain area.
  // Anyone else gets a passcode prompt — with the right captain code they
  // become the captain (the DB links them to the spot).
  const handleCaptainTap = (p: Profile) => {
    if (p.auth_user_id === user?.id) {
      navigate('/portal/dashboard')
      return
    }
    setCaptainCode('')
    setCaptainPrompt(true)
  }

  const handleCaptainSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (captainCode.trim().length < 4) return
    setPromoting(true)
    try {
      await promoteToCaptain(captainCode.trim())
      await refresh()
      setCaptainPrompt(false)
      success('Welcome back, Captain! 🎉')
      navigate('/portal/dashboard')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t verify the captain code.')
      setPromoting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-10">
        <Skeleton className="mb-2 h-8 w-56" />
        <Skeleton className="mb-8 h-4 w-80" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-10">
      <div className="mb-2 flex items-center gap-2 text-[var(--team-primary)]">
        <UserCheck className="h-5 w-5" />
        <span className="text-sm font-bold uppercase tracking-wide">Almost in</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Who are you?</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Tap your name on the {team?.name ?? 'team'} roster to claim your spot. Your attendance and stats link to this name.
      </p>

      <div className="relative mt-6 mb-5 max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your name…" className="pl-10" />
      </div>

      {claimable.length === 0 && !captainVisible ? (
        <EmptyState
          icon={<UserCheck className="h-6 w-6" />}
          title="You're not on the roster yet"
          description="Ask your captain to add you to the team first — then come back and tap your name. If you were added just now, refresh this page."
          action={
            <Button variant="secondary" onClick={() => navigate('/portal/dashboard')}>
              Continue without picking <ArrowRight className="h-4 w-4" />
            </Button>
          }
        />
      ) : filtered.length === 0 && !captainVisible ? (
        <EmptyState title="No players match that search" description="Try a different spelling — or ask your captain to add you." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {captainVisible && captain && (
            <button
              key={captain.id}
              onClick={() => handleCaptainTap(captain)}
              className="card group flex items-center gap-3 p-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--team-primary)]/50 hover:shadow-md"
            >
              <Avatar name={captain.full_name} src={captain.photo_url} size="md" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="block text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">{captain.full_name}</span>
                  <span className="shrink-0 rounded-full bg-sna-gold/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sna-gold">Captain</span>
                </span>
              </span>
              <ShieldCheck className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-sna-gold dark:text-slate-600" />
            </button>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => handleClaim(p)}
              disabled={claiming !== null}
              className="card group flex items-center gap-3 p-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--team-primary)]/50 hover:shadow-md disabled:opacity-60"
            >
              <Avatar name={p.full_name} src={p.photo_url} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">{p.full_name}</span>
                <span className="block text-xs leading-snug text-slate-500 dark:text-slate-400">
                  {[p.position, p.jersey_number != null ? `#${p.jersey_number}` : null].filter(Boolean).join(' · ') || 'Player'}
                </span>
              </span>
              {claiming === p.id ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--team-primary)] border-t-transparent" />
              ) : (
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-[var(--team-primary)] dark:text-slate-600" />
              )}
            </button>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        Only unclaimed player spots are shown. If your spot says it's taken, it's linked to another device.
      </p>

      {/* Captain passcode prompt */}
      <Modal
        open={captainPrompt}
        onClose={() => setCaptainPrompt(false)}
        title="Captain access"
        description="Enter the captain code to unlock the captain's spot."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCaptainPrompt(false)} disabled={promoting}>
              Cancel
            </Button>
            <Button type="submit" form="captain-code-form" loading={promoting}>
              <KeyRound className="h-4 w-4" /> Unlock
            </Button>
          </>
        }
      >
        <form id="captain-code-form" onSubmit={handleCaptainSubmit} className="space-y-4" noValidate>
          <Input
            type="password"
            value={captainCode}
            onChange={(e) => setCaptainCode(e.target.value.toUpperCase())}
            placeholder="CAPTAIN CODE"
            className="text-center font-mono text-lg uppercase tracking-[0.3em]"
            maxLength={20}
            autoFocus
          />
        </form>
      </Modal>
    </div>
  )
}
