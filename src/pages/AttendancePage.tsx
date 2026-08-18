import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { format, parseISO, startOfWeek } from 'date-fns'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, Calendar, Check, ClipboardCheck, Eraser, Trophy } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Select, Field } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Avatar } from '@/components/ui/Avatar'
import { AttendanceBadge, AttendanceStatusButtons } from '@/components/cards/AttendanceBadge'
import { ConfirmDialog } from '@/components/ui/Modal'
import { useTeam } from '@/hooks/useTeam'
import { useTeamData } from '@/hooks/useTeamData'
import { useToast } from '@/hooks/useToast'
import { clearAttendance, saveAttendance } from '@/lib/api'
import { EVENT_TYPE_META, LATE_TIERS, cn, formatDate, formatTime, percent } from '@/lib/utils'
import type { AttendanceStatus } from '@/types'

type Tab = 'mark' | 'stats'

export default function AttendancePage() {
  const [tab, setTab] = useState<Tab>('mark')
  const location = useLocation()

  useEffect(() => {
    const state = location.state as { autoSelectToday?: boolean } | null
    if (state?.autoSelectToday) setTab('mark')
  }, [location.state])

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Mark attendance fast, then watch the stats update automatically." />
      <div className="mb-6 grid w-full max-w-sm grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {(['mark', 'stats'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors',
              tab === t ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
            )}
          >
            {t === 'mark' ? <ClipboardCheck className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
            {t === 'mark' ? 'Mark Attendance' : 'Stats'}
          </button>
        ))}
      </div>

      {tab === 'mark' ? <MarkAttendance /> : <AttendanceStats />}
    </div>
  )
}

/* --------------------------- mark attendance --------------------------- */

function MarkAttendance() {
  const { team } = useTeam()
  const data = useTeamData()
  const { success, error: toastError } = useToast()
  const location = useLocation()

  const [eventId, setEventId] = useState<string>('')
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({})
  const [minutesLate, setMinutesLate] = useState<Record<string, number | null>>({})
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)

  const activePlayers = useMemo(() => data.players.filter((p) => p.is_active), [data.players])
  const events = useMemo(() => data.events, [data.events])

  // Choose initial event: state override → today → most recent event
  useEffect(() => {
    if (events.length === 0) return
    const state = location.state as { eventId?: string; autoSelectToday?: boolean } | null
    const today = new Date().toISOString().slice(0, 10)
    const todaysEvent = events.find((e) => e.date === today)?.id
    const pick =
      state?.eventId ??
      (state?.autoSelectToday
        ? todaysEvent
        : todaysEvent ?? [...events].sort((a, b) => b.date.localeCompare(a.date))[0]?.id)
    if (pick) setEventId(pick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length === 0])

  // Load existing attendance for the selected event
  useEffect(() => {
    if (!eventId) return
    const rows = data.attendance.filter((a) => a.event_id === eventId)
    const map: Record<string, AttendanceStatus> = {}
    const mins: Record<string, number | null> = {}
    for (const r of rows) {
      map[r.player_id] = r.status
      if (r.status === 'late') mins[r.player_id] = r.minutes_late
    }
    setStatuses(map)
    setMinutesLate(mins)
    setDirty(false)
  }, [eventId, data.attendance])

  const currentEvent = events.find((e) => e.id === eventId)

  const counts = useMemo(() => {
    const c = { present: 0, late: 0, absent: 0, excused: 0, sent_home: 0 }
    for (const s of Object.values(statuses)) c[s] += 1
    return c
  }, [statuses])

  const marked = Object.keys(statuses).length

  const setStatus = (playerId: string, status: AttendanceStatus) => {
    setStatuses((prev) => ({ ...prev, [playerId]: status }))
    if (status !== 'late') {
      setMinutesLate((prev) => ({ ...prev, [playerId]: null }))
    }
    setDirty(true)
  }

  const setLateMinutes = (playerId: string, minutes: number | null) => {
    setMinutesLate((prev) => ({ ...prev, [playerId]: minutes }))
    setDirty(true)
  }

  const handleSave = async () => {
    if (!team || !eventId) return
    setSaving(true)
    try {
      const rows = Object.entries(statuses).map(([player_id, status]) => ({
        event_id: eventId,
        player_id,
        status,
        minutes_late: status === 'late' ? (minutesLate[player_id] ?? null) : null,
      }))
      await saveAttendance(team.id, rows)
      setDirty(false)
      data.refresh()
      success(`Attendance saved — ${marked} players marked.`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t save attendance.')
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    if (!team || !eventId) return
    setSaving(true)
    try {
      await clearAttendance(team.id, eventId)
      setStatuses({})
      setDirty(false)
      data.refresh()
      setClearOpen(false)
      success('Attendance cleared for this event.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t clear attendance.')
    } finally {
      setSaving(false)
    }
  }

  if (data.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full max-w-md" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="h-6 w-6" />}
        title="No events to take attendance for"
        description="Create a practice in the Schedule first — attendance is always tied to an event."
      />
    )
  }

  return (
    <div className="space-y-6">
      <Field label="Event">
        <Select value={eventId} onChange={(e) => setEventId(e.target.value)} className="max-w-md">
          {[...events]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((e) => (
              <option key={e.id} value={e.id}>
                {formatDate(e.date)} · {e.title} {e.start_time ? `· ${formatTime(e.start_time)}` : ''}
              </option>
            ))}
        </Select>
      </Field>

      {currentEvent && (
        <Card>
          <CardHeader
            title={`${EVENT_TYPE_META[currentEvent.type].icon} ${currentEvent.title}`}
            subtitle={`${formatDate(currentEvent.date, 'EEEE, MMMM d')}${currentEvent.start_time ? ` · ${formatTime(currentEvent.start_time)}–${currentEvent.end_time ? formatTime(currentEvent.end_time) : '?'}` : ''}${currentEvent.location ? ` · ${currentEvent.location}` : ''}`}
          />

          {/* Progress summary */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{marked}/{activePlayers.length} marked</span>
              <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-emerald-600 dark:text-emerald-400">{counts.present} ✓</span>
              <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-amber-600 dark:text-amber-400">{counts.late} ⏰</span>
              <span className="rounded-lg bg-orange-500/10 px-2.5 py-1 text-orange-600 dark:text-orange-400">{counts.sent_home} 🏠</span>
              <span className="rounded-lg bg-rose-500/10 px-2.5 py-1 text-rose-600 dark:text-rose-400">{counts.absent} ✕</span>
              <span className="rounded-lg bg-slate-500/10 px-2.5 py-1 text-slate-500 dark:text-slate-400">{counts.excused} —</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setClearOpen(true)} disabled={marked === 0 || saving}>
                <Eraser className="h-3.5 w-3.5" /> Clear
              </Button>
              <Button size="sm" onClick={handleSave} loading={saving} disabled={!dirty || marked === 0}>
                <Check className="h-3.5 w-3.5" /> {dirty ? 'Save Attendance' : 'Saved ✓'}
              </Button>
            </div>
          </div>

          {/* Player rows */}
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {activePlayers.map((p, i) => (
              <li
                key={p.id}
                className={cn(
                  'animate-fade-in-up flex flex-col gap-3 px-5 py-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between',
                  statuses[p.id] && 'bg-[color-mix(in_srgb,var(--team-primary)_2%,transparent)]',
                )}
                style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={p.full_name} src={p.photo_url} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {p.full_name}
                      {p.jersey_number != null && <span className="ml-1.5 text-xs font-bold text-slate-400">#{p.jersey_number}</span>}
                    </p>
                    <p className="text-xs text-slate-400">{p.position ?? '—'}</p>
                  </div>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:min-w-[360px]">
                  <AttendanceStatusButtons value={statuses[p.id] ?? null} onChange={(s) => setStatus(p.id, s)} />
                  {statuses[p.id] === 'late' && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">How late?</span>
                      {LATE_TIERS.map((t) => {
                        const selected = minutesLate[p.id] === t.minutes
                        return (
                          <button
                            key={t.minutes}
                            type="button"
                            onClick={() => setLateMinutes(p.id, t.minutes)}
                            aria-pressed={selected}
                            className={cn(
                              'rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors',
                              selected
                                ? 'border-amber-500 bg-amber-500 text-white'
                                : 'border-slate-200 bg-white text-slate-500 hover:border-amber-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-amber-500/50',
                            )}
                          >
                            {t.label}
                            {t.marks > 0 && <span className="ml-1">+{t.marks} mark{t.marks > 1 ? 's' : ''}</span>}
                            {t.laps > 0 && <span className="ml-1 text-slate-400">· {t.laps} laps</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {activePlayers.length === 0 && (
            <div className="p-5">
              <EmptyState title="No active players" description="Add players to the roster before taking attendance." />
            </div>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={handleClear}
        loading={saving}
        title="Clear attendance?"
        message="All attendance marks for this event will be removed. This can't be undone."
        confirmLabel="Clear"
      />
    </div>
  )
}

/* ------------------------------ statistics ----------------------------- */

function AttendanceStats() {
  const data = useTeamData()

  const [playerFilter, setPlayerFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const active = data.players.filter((p) => p.is_active)
  const totalMarked = data.attendance.length
  const present = data.attendance.filter((a) => a.status === 'present').length
  const late = data.attendance.filter((a) => a.status === 'late').length
  const absent = data.attendance.filter((a) => a.status === 'absent').length
  const excused = data.attendance.filter((a) => a.status === 'excused').length

  const weekly = useMemo(() => {
    const byWeek = new Map<string, { present: number; late: number; total: number; label: string; sort: string }>()
    for (const e of data.events) {
      const weekDate = startOfWeek(parseISO(e.date), { weekStartsOn: 1 })
      const sort = weekDate.toISOString().slice(0, 10)
      const label = format(weekDate, 'MMM d')
      const rows = data.attendance.filter((a) => a.event_id === e.id)
      if (rows.length === 0) continue
      const w = byWeek.get(sort) ?? { present: 0, late: 0, total: 0, label, sort }
      w.total += rows.length
      w.present += rows.filter((r) => r.status === 'present').length
      w.late += rows.filter((r) => r.status === 'late').length
      byWeek.set(sort, w)
    }
    return [...byWeek.values()]
      .sort((a, b) => a.sort.localeCompare(b.sort))
      .map((w) => ({ week: w.label, rate: percent(w.present + w.late, w.total) }))
  }, [data.events, data.attendance])

  const leaderboard = useMemo(
    () => [...active].sort((a, b) => b.attendanceRate - a.attendanceRate || b.total - a.total).slice(0, 10),
    [active],
  )

  const history = useMemo(() => {
    const eventById = new Map(data.events.map((e) => [e.id, e]))
    return data.attendance
      .filter((a) => (playerFilter === 'all' ? true : a.player_id === playerFilter))
      .filter((a) => (statusFilter === 'all' ? true : a.status === statusFilter))
      .map((a) => {
        const ev = eventById.get(a.event_id)
        const player = data.players.find((p) => p.id === a.player_id)
        return { ...a, event: ev, playerName: player?.full_name ?? 'Unknown' }
      })
      .sort((a, b) => b.marked_at.localeCompare(a.marked_at))
      .slice(0, 60)
  }, [data.attendance, data.events, data.players, playerFilter, statusFilter])

  const dist = [
    { label: 'Present', value: present, color: 'bg-emerald-500', pct: percent(present, totalMarked) },
    { label: 'Late', value: late, color: 'bg-amber-500', pct: percent(late, totalMarked) },
    { label: 'Absent', value: absent, color: 'bg-rose-500', pct: percent(absent, totalMarked) },
    { label: 'Excused', value: excused, color: 'bg-slate-400', pct: percent(excused, totalMarked) },
  ]

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Team Attendance</p>
          <p className="tabular mt-1.5 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{data.teamRate}%</p>
          <p className="mt-1 text-xs text-slate-400">{totalMarked} total marks</p>
        </Card>
        {dist.map((d) => (
          <Card key={d.label} className="p-5">
            <div className="flex items-center gap-2">
              <span className={cn('h-2.5 w-2.5 rounded-full', d.color)} />
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{d.label}</p>
            </div>
            <p className="tabular mt-1.5 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{d.value}</p>
            <p className="mt-1 text-xs text-slate-400">{d.pct}% of marks</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Trend chart */}
        <Card className="lg:col-span-3">
          <CardHeader title="Attendance Trend" subtitle="Weekly attendance rate" />
          <div className="p-4">
            {weekly.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">Not enough data yet — take attendance to see trends.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={weekly} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--team-primary)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--team-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'currentColor' }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'currentColor' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, 'Attendance']}
                    contentStyle={{ borderRadius: 12, border: '1px solid rgb(148 163 184 / 0.3)', fontSize: 12, background: '#ffffff', color: '#0f172a' }}
                  />
                  <Area type="monotone" dataKey="rate" stroke="var(--team-primary)" strokeWidth={2.5} fill="url(#attendanceFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Leaderboard */}
        <Card className="lg:col-span-2">
          <CardHeader title="Attendance Ranking" subtitle="Active players" />
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {leaderboard.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                  i === 0 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                )}>
                  {i === 0 ? <Trophy className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <Avatar name={p.full_name} src={p.photo_url} size="xs" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">{p.full_name}</span>
                <span className="tabular text-sm font-bold text-slate-900 dark:text-white">{p.attendanceRate}%</span>
              </li>
            ))}
            {leaderboard.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">No players yet.</p>}
          </ul>
        </Card>
      </div>

      {/* History with filters */}
      <Card>
        <CardHeader title="Attendance Log" subtitle="Every mark, filtered" />
        <div className="grid gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:grid-cols-2">
          <Field label="Player">
            <Select value={playerFilter} onChange={(e) => setPlayerFilter(e.target.value)}>
              <option value="all">Everyone</option>
              {data.players.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
            </Select>
          </Field>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {history.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                  {h.event?.title ?? 'Event'}
                  <span className="ml-2 text-xs font-normal text-slate-400">{h.playerName}</span>
                </p>
                <p className="text-xs text-slate-400">
                  {h.event ? formatDate(h.event.date) : ''} · {formatDate(h.marked_at, 'MMM d, h:mm a')}
                </p>
              </div>
              <AttendanceBadge status={h.status} />
            </li>
          ))}
          {history.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">No attendance records match your filters.</p>}
        </ul>
      </Card>
    </div>
  )
}
