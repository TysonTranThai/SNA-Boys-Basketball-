import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format, parseISO, startOfWeek } from 'date-fns'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'
import { useTeam } from '@/hooks/useTeam'
import { useTeamData } from '@/hooks/useTeamData'
import { useToast } from '@/hooks/useToast'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { setSnaTitle } from '@/lib/brand'
import { cn, percent } from '@/lib/utils'
import type { PlayerWithStats } from '@/types'

type SortKey = 'full_name' | 'attendanceRate' | 'present' | 'late' | 'absent' | 'excused' | 'total'

export default function ReportsPage() {
  const { team } = useTeam()
  const data = useTeamData()
  const { success, error: toastError } = useToast()
  setSnaTitle('Reports')

  const [sortKey, setSortKey] = useState<SortKey>('attendanceRate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const active = useMemo(() => data.players.filter((p) => p.is_active), [data.players])

  const totalMarked = data.attendance.length
  const present = data.attendance.filter((a) => a.status === 'present').length
  const late = data.attendance.filter((a) => a.status === 'late').length
  const absent = data.attendance.filter((a) => a.status === 'absent').length
  const excused = data.attendance.filter((a) => a.status === 'excused').length

  const record = useMemo(() => {
    const wins = data.games.filter((g) => g.result === 'win' && !g.is_friendly).length
    const losses = data.games.filter((g) => g.result === 'loss' && !g.is_friendly).length
    const ties = data.games.filter((g) => g.result === 'tie' && !g.is_friendly).length
    const decided = wins + losses
    return { wins, losses, ties, winRate: decided > 0 ? percent(wins, decided) : 0 }
  }, [data.games])

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

  const sortedPlayers = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...active].sort((a, b) => {
      if (sortKey === 'full_name') return a.full_name.localeCompare(b.full_name) * dir
      if (sortKey === 'attendanceRate') return (a.attendanceRate - b.attendanceRate) * dir
      return ((a[sortKey] as number) - (b[sortKey] as number)) * dir
    })
  }, [active, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(key === 'full_name' ? 'asc' : 'desc')
    }
  }

  const exportCsv = () => {
    try {
      const header = ['Name', 'Jersey', 'Position', 'Attendance %', 'Present', 'Late', 'Sent home', 'Absent', 'Excused', 'Total']
      const rows = data.players.map((p: PlayerWithStats) => [
        p.full_name,
        p.jersey_number ?? '',
        p.position ?? '',
        `${p.attendanceRate}`,
        p.present,
        p.late,
        p.sent_home,
        p.absent,
        p.excused,
        p.total,
      ])
      const csv = [header, ...rows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SNA-attendance-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      success('Attendance report exported.')
    } catch {
      toastError('Couldn’t export the report.')
    }
  }

  if (data.loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  const dist = [
    { label: 'Present', value: present, color: 'bg-emerald-500', pct: percent(present, totalMarked) },
    { label: 'Late', value: late, color: 'bg-amber-500', pct: percent(late, totalMarked) },
    { label: 'Absent', value: absent, color: 'bg-rose-500', pct: percent(absent, totalMarked) },
    { label: 'Excused', value: excused, color: 'bg-slate-400', pct: percent(excused, totalMarked) },
  ]

  const SortTh = ({ label, k, className }: { label: string; k: SortKey; className?: string }) => (
    <th className={cn('px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400', className)}>
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200">
        {label}
        {sortKey === k && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
    </th>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle={`SNA ${team?.sport ?? 'Basketball'} · ${team?.season ?? '2026–2027'} — season overview and player attendance.`}
        actions={
          <Button variant="secondary" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      {/* Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Team Attendance</p>
          <p className="tabular mt-1.5 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{data.teamRate}%</p>
          <p className="mt-1 text-xs text-slate-400">{totalMarked} total marks</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Season Record</p>
          <p className="tabular mt-1.5 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {record.wins}–{record.losses}
          </p>
          <p className="mt-1 text-xs text-slate-400">{record.ties > 0 ? `${record.ties} ties · ` : ''}{record.winRate}% win rate</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Active Players</p>
          <p className="tabular mt-1.5 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{active.length}</p>
          <p className="mt-1 text-xs text-slate-400">on the SNA roster</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Events</p>
          <p className="tabular mt-1.5 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{data.events.length}</p>
          <p className="mt-1 text-xs text-slate-400">{data.games.length} games scheduled</p>
        </Card>
      </div>

      {/* Distribution + trend */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Attendance Breakdown" subtitle="All marks this season" />
          <div className="space-y-4 p-5">
            {dist.map((d) => (
              <div key={d.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <span className={cn('h-2.5 w-2.5 rounded-full', d.color)} /> {d.label}
                  </span>
                  <span className="tabular font-semibold text-slate-800 dark:text-slate-100">{d.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className={cn('h-full rounded-full', d.color)} style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            ))}
            <p className="pt-1 text-xs text-slate-400">“Attendance” counts present + late.</p>
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Attendance Trend" subtitle="Weekly attendance rate" />
          <div className="p-4">
            {weekly.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">Not enough data yet — take attendance to see trends.</p>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={weekly} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="reportFill" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="rate" stroke="var(--team-primary)" strokeWidth={2.5} fill="url(#reportFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Player attendance table */}
      <Card className="overflow-hidden">
        <CardHeader title="Player Attendance" subtitle="Active players, sorted by attendance" />
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-100 dark:border-slate-800">
              <tr>
                <SortTh label="Player" k="full_name" />
                <SortTh label="Rate" k="attendanceRate" className="hidden sm:table-cell" />
                <SortTh label="Present" k="present" className="hidden md:table-cell" />
                <SortTh label="Late" k="late" className="hidden md:table-cell" />
                <SortTh label="Absent" k="absent" className="hidden md:table-cell" />
                <SortTh label="Excused" k="excused" className="hidden md:table-cell" />
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedPlayers.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="tabular text-xs font-bold text-slate-400">{p.jersey_number != null ? `#${p.jersey_number}` : ''}</span>
                      <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{p.full_name}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className={cn('tabular rounded-full px-2 py-0.5 text-xs font-bold', p.attendanceRate >= 90 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : p.attendanceRate >= 75 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400')}>
                      {p.attendanceRate}%
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 tabular text-sm text-emerald-600 dark:text-emerald-400 md:table-cell">{p.present}</td>
                  <td className="hidden px-4 py-3 tabular text-sm text-amber-600 dark:text-amber-400 md:table-cell">{p.late}</td>
                  <td className="hidden px-4 py-3 tabular text-sm text-rose-600 dark:text-rose-400 md:table-cell">{p.absent}</td>
                  <td className="hidden px-4 py-3 tabular text-sm text-slate-500 dark:text-slate-400 md:table-cell">{p.excused}</td>
                  <td className="px-4 py-3 text-right tabular text-sm font-semibold text-slate-800 dark:text-slate-100">{p.total}</td>
                </tr>
              ))}
              {sortedPlayers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                    No active players yet — add players to see the report.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
