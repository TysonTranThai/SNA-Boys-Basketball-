import { Users } from 'lucide-react'
import { usePublicData } from '@/hooks/usePublicData'
import { SectionTitle } from './HomePage'
import { Avatar } from '@/components/ui/Avatar'
import { setSnaTitle } from '@/lib/brand'
import { cn } from '@/lib/utils'

export default function PublicTeamPage() {
  const { team, roster, loading } = usePublicData()
  setSnaTitle('Team')

  const sorted = [...roster].sort((a, b) => {
    if (a.role === 'captain') return -1
    if (b.role === 'captain') return 1
    return (a.jersey_number ?? 999) - (b.jersey_number ?? 999)
  })

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-56 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <SectionTitle kicker="Roster" title={`The ${team?.name ?? 'SNA Boys'} team`} />
      {sorted.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center">
          <Users className="h-8 w-8 text-slate-300" />
          <p className="font-semibold">No roster yet</p>
          <p className="text-sm text-slate-400">Players appear here once the captain builds the team.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((p) => (
            <div key={p.id} className="card flex flex-col items-center gap-3 p-5 text-center">
              <div className="relative">
                <Avatar name={p.full_name} src={p.photo_url} size="lg" />
                {p.role === 'captain' && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-sna-gold px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-900">
                    C
                  </span>
                )}
              </div>
              <div>
                <p className={cn('text-sm font-bold text-slate-900 dark:text-white', p.role === 'captain' && 'text-sna-gold')}>
                  {p.full_name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {p.jersey_number != null && <span className="font-bold text-[var(--team-primary)]">#{p.jersey_number} </span>}
                  {p.position || (p.role === 'captain' ? 'Captain' : 'Player')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
