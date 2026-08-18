import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Lock } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { AttendanceBadge } from '@/components/cards/AttendanceBadge'
import { useTeam } from '@/hooks/useTeam'
import { useTeamData } from '@/hooks/useTeamData'
import { EVENT_TYPE_META, dayLabel, totalLateMarks } from '@/lib/utils'

export default function MyAttendancePage() {
  const { profile } = useTeam()
  const data = useTeamData()

  const myRows = useMemo(
    () => data.attendance.filter((a) => a.player_id === profile?.id),
    [data.attendance, profile?.id],
  )

  const eventById = useMemo(() => new Map(data.events.map((e) => [e.id, e])), [data.events])

  const present = myRows.filter((a) => a.status === 'present').length
  const late = myRows.filter((a) => a.status === 'late').length
  const absent = myRows.filter((a) => a.status === 'absent').length
  const excused = myRows.filter((a) => a.status === 'excused').length
  const sentHome = myRows.filter((a) => a.status === 'sent_home').length
  const lateMarks = totalLateMarks(myRows)
  const rate = myRows.length > 0 ? Math.round(((present + late) / myRows.length) * 100) : 0

  const grouped = useMemo(() => {
    const months = new Map<string, typeof myRows>()
    for (const row of myRows) {
      const ev = eventById.get(row.event_id)
      if (!ev) continue
      const key = format(parseISO(ev.date), 'MMMM yyyy')
      const list = months.get(key) ?? []
      list.push(row)
      months.set(key, list)
    }
    return [...months.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [myRows, eventById])

  if (data.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="My Attendance" subtitle="Your complete attendance history — tracked by your captain." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-6 p-6">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-team-soft text-3xl font-black text-[var(--team-primary)]">
            {rate}%
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Attendance Rate</p>
            <div className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
              <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {present} Present</p>
              <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" /> {late} Late</p>
              <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-500" /> {absent} Absent</p>
              <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-500" /> {sentHome} Sent home</p>
              <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-400" /> {excused} Excused</p>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-center p-6">
          <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Lock className="h-4 w-4" /> Recorded by your captain
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Attendance is marked at each practice and event. Late counts toward your rate, absent and excused do not. Talk to your captain about any corrections.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-emerald-600 dark:text-emerald-400">Present = counts</span>
            <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-amber-600 dark:text-amber-400">Late = counts</span>
            <span className="rounded-lg bg-rose-500/10 px-2 py-1 text-rose-600 dark:text-rose-400">Absent = doesn't count</span>
            <span className="rounded-lg bg-orange-500/10 px-2 py-1 text-orange-600 dark:text-orange-400">Sent home = doesn't count</span>
            <span className="rounded-lg bg-slate-500/10 px-2 py-1 text-slate-500 dark:text-slate-400">Excused = doesn't count</span>
          </div>
          {lateMarks > 0 && (
            <p className="mt-3 text-sm font-semibold text-amber-600 dark:text-amber-400">
              ⚠️ {lateMarks} late mark{lateMarks > 1 ? 's' : ''} — see Penalties for what that means.
            </p>
          )}
        </Card>
      </div>

      {myRows.length === 0 ? (
        <EmptyState
          title="No attendance records yet"
          description="Once your captain starts taking attendance, your history will show up here."
        />
      ) : (
        grouped.map(([month, rows]) => (
          <Card key={month} className="mb-4">
            <CardHeader title={month} subtitle={`${rows.length} events`} />
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {[...rows]
                .sort((a, b) => {
                  const ea = eventById.get(a.event_id)
                  const eb = eventById.get(b.event_id)
                  return (eb?.date ?? '').localeCompare(ea?.date ?? '')
                })
                .map((row) => {
                  const ev = eventById.get(row.event_id)
                  return (
                    <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{ev ? EVENT_TYPE_META[ev.type].icon : '📌'}</span>
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{ev?.title ?? 'Event'}</p>
                          <p className="text-xs text-slate-400">{ev ? dayLabel(ev.date) : ''}</p>
                        </div>
                      </div>
                      <AttendanceBadge status={row.status} />
                    </li>
                  )
                })}
            </ul>
          </Card>
        ))
      )}
    </div>
  )
}
