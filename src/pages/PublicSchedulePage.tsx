import { Calendar } from 'lucide-react'
import { usePublicData } from '@/hooks/usePublicData'
import { SectionTitle } from './HomePage'
import { setSnaTitle } from '@/lib/brand'
import { cn, formatTime, shortDayLabel } from '@/lib/utils'
import type { TeamEvent } from '@/types'

function groupByDate(events: TeamEvent[]): { date: string; items: TeamEvent[] }[] {
  const groups = new Map<string, TeamEvent[]>()
  for (const e of events) {
    const list = groups.get(e.date) ?? []
    list.push(e)
    groups.set(e.date, list)
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, items]) => ({ date, items }))
}

export default function PublicSchedulePage() {
  const { team, events, loading } = usePublicData()
  setSnaTitle('Schedule')

  const upcoming = events
    .filter((e) => e.date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time ?? '').localeCompare(b.start_time ?? ''))
  const groups = groupByDate(upcoming)

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-56 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <SectionTitle kicker="Schedule" title="Upcoming events" />
      {groups.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center">
          <Calendar className="h-8 w-8 text-slate-300" />
          <p className="font-semibold">Nothing scheduled yet</p>
          <p className="text-sm text-slate-400">Practices and games will appear here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(({ date, items }) => (
            <div key={date}>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[var(--team-primary)]">{shortDayLabel(date)}</p>
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                {items.map((e, i) => (
                  <div key={e.id} className={cn('flex items-center gap-4 px-5 py-4', i > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                    <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-slate-100 py-2 dark:bg-slate-800">
                      <span className="text-[10px] font-black uppercase text-slate-400">{shortDayLabel(e.date).split(' ')[0]}</span>
                      <span className="text-lg font-black leading-none">{e.date.slice(8, 10)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                        {e.type === 'practice' ? '🏃' : e.type === 'tournament' ? '🏆' : '📌'} {e.title}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {e.start_time ? formatTime(e.start_time) : '—'}
                        {e.end_time ? ` – ${formatTime(e.end_time)}` : ''}
                        {e.location ? ` · ${e.location}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {team && (
        <p className="mt-10 text-center text-xs text-slate-400">
          Schedule for {team.name} · {team.season ?? 'current season'}
        </p>
      )}
    </div>
  )
}
