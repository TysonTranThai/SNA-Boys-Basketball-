import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, Users } from 'lucide-react'
import { usePublicData } from '@/hooks/usePublicData'
import { SectionTitle } from './HomePage'
import { Avatar } from '@/components/ui/Avatar'
import { setSnaTitle } from '@/lib/brand'
import { cn } from '@/lib/utils'
import { seasonRecord, aggregatePlayerStats, statCategories, statLabel, statAbbrev, attendanceRate } from '@/lib/publicStats'

export default function PublicStatsPage() {
  const { team, games, events, roster, playerStats, attendance, loading } = usePublicData()
  setSnaTitle('Stats')

  const record = seasonRecord(games)
  const completed = games.filter((g) => g.status === 'completed').sort((a, b) => b.date.localeCompare(a.date))
  const leaders = attendance.slice(0, 10)
  const categories = statCategories(team?.sport)
  const statLines = aggregatePlayerStats(playerStats, roster)
  const gamesPlayed = completed.length
  const practices = events.filter((e) => e.type === 'practice').length
  const rate = attendanceRate(attendance)

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-56 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    )
  }

  const teamStats = [
    { label: 'Games played', value: gamesPlayed },
    { label: 'Wins', value: record.wins },
    { label: 'Losses', value: record.losses },
    { label: 'Win rate', value: `${record.winRate}%` },
    { label: 'Practices', value: practices },
    { label: 'Team attendance', value: `${rate}%` },
    { label: 'Players', value: roster.length },
    { label: 'Highlights', value: playerStats.length ? '—' : '—' },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <SectionTitle kicker="Numbers" title="SNA stats" />

      {/* Team statistics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {teamStats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="tabular text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Attendance leaders */}
      <div className="mt-14">
        <SectionTitle kicker="Attendance" title="Attendance leaders" />
        {leaders.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-10 text-center">
            <Users className="h-8 w-8 text-slate-300" />
            <p className="font-semibold">No attendance data yet</p>
            <p className="text-sm text-slate-400">The leaderboard fills in as the captain marks attendance.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            {leaders.map((p, i) => (
              <div key={p.player_id} className={cn('flex items-center gap-4 px-5 py-3.5', i > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black', i === 0 ? 'bg-[var(--team-secondary)] text-slate-900' : i < 3 ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800')}>
                  {i + 1}
                </span>
                <Avatar name={p.full_name} src={p.photo_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{p.full_name}</p>
                  <p className="text-xs text-slate-400">{p.present_or_late}/{p.marked} attended</p>
                </div>
                <p className="tabular text-base font-black text-[var(--team-primary)]">{Math.round(p.rate ?? 0)}%</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Player leaders */}
      {categories.length > 0 && statLines.length > 0 && (
        <div className="mt-14">
          <SectionTitle kicker="Players" title="Player leaders" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const rows = statLines
                .filter((l) => (l.totals[cat] ?? 0) > 0)
                .sort((a, b) => (b.totals[cat] ?? 0) - (a.totals[cat] ?? 0))
                .slice(0, 5)
              if (rows.length === 0) return null
              return (
                <div key={cat} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">{statLabel(cat)}</p>
                  <div className="mt-3 space-y-2.5">
                    {rows.map((l, i) => (
                      <div key={l.playerId} className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="w-5 text-sm font-black text-slate-300">{i + 1}</span>
                          <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{l.name}</span>
                        </div>
                        <span className="tabular text-sm font-black text-[var(--team-primary)]">
                          {(l.totals[cat] / Math.max(l.games, 1)).toFixed(1)} <span className="text-[10px] font-bold text-slate-400">{statAbbrev(cat)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Game-by-game */}
      {completed.length > 0 && (
        <div className="mt-14">
          <SectionTitle kicker="Scoreboard" title="Game by game" />
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            {completed.map((g, i) => (
              <div key={g.id} className={cn('flex items-center justify-between gap-4 px-5 py-4', i > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{team?.name ?? 'SNA Boys'} vs {g.opponent}</p>
                  <p className="text-xs text-slate-400">{g.date} · {g.home_away === 'away' ? 'Away' : 'Home'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular text-base font-black text-slate-900 dark:text-white">{g.our_score ?? '—'}</span>
                  <span className="text-xs font-semibold text-slate-400">–</span>
                  <span className="tabular text-base font-black text-slate-500">{g.opponent_score ?? '—'}</span>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-black uppercase', g.result === 'win' ? 'bg-emerald-500/10 text-emerald-600' : g.result === 'loss' ? 'bg-rose-500/10 text-rose-600' : 'bg-slate-500/10 text-slate-500')}>
                    {g.result === 'win' ? 'Win' : g.result === 'loss' ? 'Loss' : 'Tie'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {gamesPlayed === 0 && (
        <div className="card mt-14 flex flex-col items-center gap-2 p-10 text-center">
          <BarChart3 className="h-8 w-8 text-slate-300" />
          <p className="font-semibold">No stats yet</p>
          <p className="text-sm text-slate-400">Game results and player stats appear here as the season progresses.</p>
          <Link to="/games" className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--team-primary)] hover:underline">
            View games <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
