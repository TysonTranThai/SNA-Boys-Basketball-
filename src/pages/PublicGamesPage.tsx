import { Trophy } from 'lucide-react'
import { usePublicData } from '@/hooks/usePublicData'
import { SectionTitle } from './HomePage'
import { TeamMark } from '@/components/layout/AppLayout'
import { setSnaTitle } from '@/lib/brand'
import { cn, formatTime, shortDayLabel } from '@/lib/utils'
import { seasonRecord } from '@/lib/publicStats'

export default function PublicGamesPage() {
  const { team, games, loading } = usePublicData()
  setSnaTitle('Games')

  const record = seasonRecord(games)
  const upcoming = games
    .filter((g) => g.status === 'upcoming')
    .sort((a, b) => a.date.localeCompare(b.date))
  const completed = games
    .filter((g) => g.status === 'completed')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-56 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      {/* Season record */}
      <SectionTitle kicker="Season" title="Season record" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { value: record.wins, label: 'Wins', accent: true },
          { value: record.losses, label: 'Losses', accent: false },
          { value: `${record.winRate}%`, label: 'Win rate', accent: true },
        ].map((s) => (
          <div key={s.label} className="card flex flex-col items-center justify-center p-8 text-center">
            <p className={cn('tabular text-5xl font-black', s.accent ? 'text-[var(--team-primary)]' : 'text-slate-900 dark:text-white')}>{s.value}</p>
            <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>
      {record.total === 0 && (
        <p className="mt-3 text-center text-sm text-slate-400">No completed games yet — check back after the season starts.</p>
      )}

      {/* Upcoming */}
      <div className="mt-14">
        <SectionTitle kicker="Next up" title="Upcoming games" />
        {upcoming.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-10 text-center">
            <Trophy className="h-8 w-8 text-slate-300" />
            <p className="font-semibold">No upcoming games</p>
            <p className="text-sm text-slate-400">Check back soon for the next {team?.name ?? 'SNA Boys'} matchup.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming.map((g) => (
              <div key={g.id} className="card flex flex-col items-center gap-6 p-8 sm:flex-row sm:justify-center sm:gap-14">
                <div className="flex flex-col items-center gap-1 text-center">
                  <TeamMark team={team} className="h-12 w-12" />
                  <p className="mt-1 text-lg font-black">{team?.name ?? 'SNA Boys'}</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-black text-white dark:bg-white dark:text-slate-900">VS</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--team-primary)]">{shortDayLabel(g.date)}</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <p className="text-2xl font-black">{g.opponent}</p>
                  {g.is_friendly && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-600">Friendly</span>}
                  <p className="text-sm text-slate-500 dark:text-slate-400">{g.time ? formatTime(g.time) : 'Time TBA'}</p>
                  {g.location && <p className="text-sm text-slate-400">{g.location}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {completed.length > 0 && (
        <div className="mt-14">
          <SectionTitle kicker="Scoreboard" title="Recent results" />
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            {completed.map((g, i) => (
              <div key={g.id} className={cn('flex flex-wrap items-center justify-between gap-4 px-5 py-4', i > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{team?.name ?? 'SNA Boys'} vs {g.opponent}</p>
                  <p className="text-xs text-slate-400">{shortDayLabel(g.date)} · {g.home_away === 'away' ? 'Away' : g.home_away === 'neutral' ? 'Neutral' : 'Home'}{g.is_friendly && ' · Friendly'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular text-lg font-black text-slate-900 dark:text-white">{g.our_score ?? '—'}</span>
                  <span className="text-sm font-semibold text-slate-400">–</span>
                  <span className="tabular text-lg font-black text-slate-500">{g.opponent_score ?? '—'}</span>
                  <span className={cn('ml-2 rounded-full px-2.5 py-0.5 text-xs font-black uppercase', g.result === 'win' ? 'bg-emerald-500/10 text-emerald-600' : g.result === 'loss' ? 'bg-rose-500/10 text-rose-600' : 'bg-slate-500/10 text-slate-500')}>
                    {g.result === 'win' ? 'Win 🏆' : g.result === 'loss' ? 'Loss' : 'Tie'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
