import { Link } from 'react-router-dom'
import { ArrowRight, Calendar, MapPin, Trophy, Users, Play, Film, BarChart3 } from 'lucide-react'
import { usePublicData } from '@/hooks/usePublicData'
import { EnterTeamButton } from '@/components/layout/PublicLayout'
import { TeamMark } from '@/components/layout/AppLayout'
import { setSnaTitle, snaBrand } from '@/lib/brand'
import { Avatar } from '@/components/ui/Avatar'
import { shortDayLabel, formatTime, cn } from '@/lib/utils'
import { seasonRecord, aggregatePlayerStats, statCategories, statLabel, statAbbrev, attendanceRate } from '@/lib/publicStats'
import type { MediaItem } from '@/types'

export function MediaThumb({ media, className }: { media: MediaItem; className?: string }) {
  return (
    <div className={cn('group relative overflow-hidden rounded-xl bg-slate-900', className)}>
      {media.thumbnail_url ? (
        <img src={media.thumbnail_url} alt={media.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--team-primary)]/30 to-slate-900">
          <Film className="h-8 w-8 text-white/60" />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg transition-transform group-hover:scale-110">
          <Play className="ml-0.5 h-5 w-5" />
        </span>
      </div>
      <span className="absolute bottom-2 left-2 right-2 truncate rounded-lg bg-black/70 px-2 py-1 text-xs font-semibold text-white">
        {media.title}
      </span>
    </div>
  )
}

export function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--team-primary)]">{kicker}</p>
      <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
    </div>
  )
}

export default function HomePage() {
  const { team, games, events, media, roster, playerStats, attendance, loading } = usePublicData()
  setSnaTitle()

  const record = seasonRecord(games)
  const completed = games.filter((g) => g.status === 'completed').sort((a, b) => b.date.localeCompare(a.date))
  const nextGame = games
    .filter((g) => g.status === 'upcoming')
    .sort((a, b) => a.date.localeCompare(b.date))[0]
  const upcomingEvents = events
    .filter((e) => e.date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4)
  const highlights = media.slice(0, 6)
  const topAttendance = attendance.slice(0, 5)
  const categories = statCategories(team?.sport)
  const statLines = aggregatePlayerStats(playerStats, roster)

  const leaderFor = (cat: string) =>
    statLines
      .filter((l) => (l.totals[cat] ?? 0) > 0)
      .sort((a, b) => (b.totals[cat] ?? 0) - (a.totals[cat] ?? 0))
      .slice(0, 3)
      .map((l) => ({ name: l.name, value: l.totals[cat] ?? 0, games: Math.max(l.games, 1) }))

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    )
  }

  const heroSport = team ? team.sport.toUpperCase() : snaBrand.sport.toUpperCase()

  return (
    <div>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(ellipse at top, var(--team-primary) 0%, transparent 60%), radial-gradient(ellipse at bottom right, var(--team-secondary) 0%, transparent 55%)' }}
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
          <TeamMark team={team} className="h-20 w-20" />
          <p className="mt-6 text-xs font-black uppercase tracking-[0.35em] text-[var(--team-secondary)]">
            {heroSport}
            {team?.season ? ` · ${team.season}` : ''}
          </p>
          <h1 className="mt-3 text-5xl font-black tracking-tight sm:text-7xl">
            {team?.name ?? 'SNA Boys'}
          </h1>
          <p className="mt-4 max-w-lg text-lg font-medium text-slate-300">
            {team?.sport ? `${team.sport} — built together, compete together.` : 'Built together. Compete together.'}
          </p>
          <div className="mt-8">
            <EnterTeamButton size="lg" />
          </div>
          <p className="mt-4 text-xs text-slate-400">Players &amp; staff only</p>
        </div>
      </section>

      {/* ---------------- Season record ---------------- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
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
      </section>

      {/* ---------------- By the numbers ---------------- */}
      <section className="bg-slate-50 py-16 dark:bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle kicker="Team" title="SNA by the numbers" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { value: roster.length, label: 'Players' },
              { value: completed.length, label: 'Games played' },
              { value: record.wins, label: 'Wins' },
              { value: record.losses, label: 'Losses' },
              { value: events.filter((e) => e.type === 'practice').length, label: 'Practices' },
              { value: `${attendanceRate(attendance)}%`, label: 'Attendance' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-900">
                <p className="tabular text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Attendance leaders ---------------- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle kicker="Attendance" title="Attendance leaders" />
          <Link to="/stats" className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--team-primary)] hover:underline">
            View full leaderboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {topAttendance.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-10 text-center">
            <Users className="h-8 w-8 text-slate-300" />
            <p className="font-semibold">No attendance data yet</p>
            <p className="text-sm text-slate-400">Leaderboard appears once the captain starts marking attendance.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            {topAttendance.map((p, i) => (
              <div key={p.player_id} className={cn('flex items-center gap-4 px-5 py-4', i > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black', i === 0 ? 'bg-[var(--team-secondary)] text-slate-900' : i < 3 ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800')}>
                  {i + 1}
                </span>
                <Avatar name={p.full_name} src={p.photo_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{p.full_name}</p>
                  <p className="text-xs text-slate-400">
                    {p.present_or_late}/{p.marked} attended
                  </p>
                </div>
                <p className="tabular text-lg font-black text-[var(--team-primary)]">{Math.round(p.rate ?? 0)}%</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------------- Player leaders ---------------- */}
      {categories.length > 0 && statLines.length > 0 && (
        <section className="bg-slate-50 py-16 dark:bg-slate-900/50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionTitle kicker="Players" title="Player leaders" />
              <Link to="/stats" className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--team-primary)] hover:underline">
                <BarChart3 className="h-4 w-4" /> Full stats
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => {
                const leaders = leaderFor(cat)
                if (leaders.length === 0) return null
                return (
                  <div key={cat} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">{statLabel(cat)}</p>
                    <div className="mt-3 space-y-2.5">
                      {leaders.map((l, i) => (
                        <div key={l.name} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-5 text-sm font-black text-slate-300">{i + 1}</span>
                            <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{l.name}</span>
                          </div>
                          <span className="tabular text-sm font-black text-[var(--team-primary)]">
                            {(l.value / l.games).toFixed(1)} <span className="text-[10px] font-bold text-slate-400">{statAbbrev(cat)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Next game ---------------- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionTitle kicker="Next up" title="Next game" />
        {nextGame ? (
          <Link to="/games" className="card group block overflow-hidden transition-all hover:shadow-xl">
            <div className="flex flex-col items-center gap-6 p-8 sm:flex-row sm:justify-center sm:gap-14">
              <div className="flex flex-col items-center gap-1 text-center">
                <TeamMark team={team} className="h-14 w-14" />
                <p className="mt-2 text-xl font-black">{team?.name ?? 'SNA Boys'}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Home · {nextGame.home_away === 'away' ? 'Away' : nextGame.home_away === 'neutral' ? 'Neutral' : ''}</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-black text-white dark:bg-white dark:text-slate-900">VS</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--team-primary)]">{shortDayLabel(nextGame.date)}</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <p className="text-2xl font-black">{nextGame.opponent}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{nextGame.time ? formatTime(nextGame.time) : 'Time TBA'}</p>
                {nextGame.location && (
                  <p className="flex items-center gap-1 text-sm text-slate-400">
                    <MapPin className="h-3.5 w-3.5" /> {nextGame.location}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-center gap-1.5 border-t border-slate-100 py-3 text-sm font-bold text-[var(--team-primary)] group-hover:underline dark:border-slate-800">
              View game <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ) : (
          <div className="card flex flex-col items-center gap-2 p-10 text-center">
            <Trophy className="h-8 w-8 text-slate-300" />
            <p className="font-semibold">No upcoming games</p>
            <p className="text-sm text-slate-400">Check back soon for the next {team?.name ?? 'SNA Boys'} matchup.</p>
          </div>
        )}
      </section>

      {/* ---------------- Recent results ---------------- */}
      {completed.length > 0 && (
        <section className="bg-slate-50 py-16 dark:bg-slate-900/50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionTitle kicker="Scoreboard" title="Recent results" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {completed.slice(0, 3).map((g) => (
                <div key={g.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wide', g.result === 'win' ? 'bg-emerald-500/10 text-emerald-600' : g.result === 'loss' ? 'bg-rose-500/10 text-rose-600' : 'bg-slate-500/10 text-slate-500')}>
                      {g.result === 'win' ? 'Win 🏆' : g.result === 'loss' ? 'Loss' : 'Tie'}
                    </span>
                    <span className="text-xs text-slate-400">{shortDayLabel(g.date)}</span>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold">{team?.name ?? 'SNA Boys'}</span>
                      <span className="tabular font-black">{g.our_score ?? '—'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-slate-500">
                      <span>{g.opponent}</span>
                      <span className="tabular font-bold">{g.opponent_score ?? '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Schedule preview ---------------- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle kicker="Schedule" title="Upcoming" />
          <Link to="/schedule" className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--team-primary)] hover:underline">
            View full schedule <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-10 text-center">
            <Calendar className="h-8 w-8 text-slate-300" />
            <p className="font-semibold">Nothing scheduled yet</p>
            <p className="text-sm text-slate-400">Practices and games will appear here.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            {upcomingEvents.map((e, i) => (
              <div key={e.id} className={cn('flex items-center gap-4 px-5 py-4', i > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-slate-100 py-2 dark:bg-slate-800">
                  <span className="text-[10px] font-black uppercase text-slate-400">{shortDayLabel(e.date).split(' ')[0]}</span>
                  <span className="text-lg font-black leading-none">{e.date.slice(8, 10)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {e.type === 'practice' ? '🏃' : e.type === 'tournament' ? '🏆' : e.type === 'friendly' ? '🏅' : '📌'} {e.title}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {e.start_time ? formatTime(e.start_time) : '—'}
                    {e.location ? ` · ${e.location}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------------- Highlights ---------------- */}
      {highlights.length > 0 && (
        <section className="bg-slate-50 py-16 dark:bg-slate-900/50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionTitle kicker="Media" title="Latest highlights" />
              <Link to="/highlights" className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--team-primary)] hover:underline">
                All highlights <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {highlights.map((m) => (
                <Link key={m.id} to="/highlights" className="block">
                  <MediaThumb media={m} className="aspect-video" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Roster preview ---------------- */}
      {roster.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle kicker="Roster" title="The team" />
            <Link to="/team" className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--team-primary)] hover:underline">
              View full roster <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {roster.slice(0, 8).map((p) => (
              <div key={p.id} className="card flex items-center gap-3 p-4">
                <Avatar name={p.full_name} src={p.photo_url} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {p.jersey_number != null && <span className="text-[var(--team-primary)]">#{p.jersey_number} </span>}
                    {p.full_name}
                  </p>
                  <p className="truncate text-xs text-slate-400">{p.position ?? '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- Final CTA ---------------- */}
      <section className="bg-slate-950 py-16 text-center text-white">
        <h2 className="text-3xl font-black tracking-tight">Ready?</h2>
        <p className="mt-2 text-slate-300">Enter the {team?.name ?? 'SNA Boys'} team portal.</p>
        <div className="mt-6">
          <EnterTeamButton size="lg" />
        </div>
      </section>
    </div>
  )
}
