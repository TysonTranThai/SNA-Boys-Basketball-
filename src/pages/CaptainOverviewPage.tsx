import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Calendar,
  ClipboardCheck,
  Clock,
  Film,
  MapPin,
  Megaphone,
  Plus,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react'
import { useTeam } from '@/hooks/useTeam'
import { useTeamData } from '@/hooks/useTeamData'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Avatar } from '@/components/ui/Avatar'
import { setSnaTitle } from '@/lib/brand'
import { EVENT_TYPE_META, dayLabel, formatTime, relativeTime } from '@/lib/utils'
import type { Game, TeamEvent } from '@/types'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

interface UpcomingItem {
  id: string
  kind: 'practice' | 'event' | 'game'
  title: string
  date: string
  time: string | null
  location: string | null
}

export default function CaptainOverviewPage() {
  const { team, profile } = useTeam()
  const data = useTeamData()
  const navigate = useNavigate()
  setSnaTitle('Captain')

  const firstName = profile?.full_name.split(' ')[0] ?? 'Captain'
  const today = new Date().toISOString().slice(0, 10)

  const activePlayers = data.players.filter((p) => p.is_active).length

  const record = useMemo(() => {
    const wins = data.games.filter((g) => g.result === 'win').length
    const losses = data.games.filter((g) => g.result === 'loss').length
    const ties = data.games.filter((g) => g.result === 'tie').length
    return { wins, losses, ties }
  }, [data.games])

  const todayEvents = useMemo(
    () => data.events.filter((e) => e.date === today).sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')),
    [data.events, today],
  )

  const upcomingItems = useMemo<UpcomingItem[]>(() => {
    const fromEvents: UpcomingItem[] = data.events
      .filter((e) => e.date >= today)
      .map((e: TeamEvent) => ({
        id: e.id,
        kind: e.type === 'practice' ? 'practice' : 'event',
        title: e.title,
        date: e.date,
        time: e.start_time,
        location: e.location,
      }))
    const fromGames: UpcomingItem[] = data.games
      .filter((g) => g.status === 'upcoming' && g.date >= today)
      .map((g: Game) => ({
        id: g.id,
        kind: 'game',
        title: `VS ${g.opponent}`,
        date: g.date,
        time: g.time,
        location: g.location,
      }))
    return [...fromEvents, ...fromGames]
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
      .slice(0, 5)
  }, [data.events, data.games, today])

  // Latest event with marks → today's attendance summary
  const attendanceEvent = useMemo(() => {
    const marked = new Set(data.attendance.map((a) => a.event_id))
    const todayEvent = todayEvents.find((e) => marked.has(e.id))
    if (todayEvent) return todayEvent
    return data.events.filter((e) => marked.has(e.id)).sort((a, b) => b.date.localeCompare(a.date))[0]
  }, [data.events, data.attendance, todayEvents])

  const attendanceSummary = useMemo(() => {
    if (!attendanceEvent) return null
    const rows = data.attendance.filter((a) => a.event_id === attendanceEvent.id)
    return {
      present: rows.filter((a) => a.status === 'present').length,
      late: rows.filter((a) => a.status === 'late').length,
      absent: rows.filter((a) => a.status === 'absent').length,
      excused: rows.filter((a) => a.status === 'excused').length,
      sent_home: rows.filter((a) => a.status === 'sent_home').length,
      total: rows.length,
    }
  }, [data.attendance, attendanceEvent])

  const activity = useMemo(() => {
    const items: { id: string; text: string; time: string }[] = []
    const latestMark = [...data.attendance].sort((a, b) => b.marked_at.localeCompare(a.marked_at))[0]
    if (latestMark) items.push({ id: 'att', text: 'Attendance marked', time: relativeTime(latestMark.marked_at) })
    const latestMedia = data.media[0]
    if (latestMedia) items.push({ id: 'media', text: `Highlight added: ${latestMedia.title}`, time: relativeTime(latestMedia.created_at) })
    const latestResult = [...data.games]
      .filter((g) => g.result && g.status === 'completed')
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
    if (latestResult) items.push({ id: 'game', text: `Result updated: VS ${latestResult.opponent}`, time: relativeTime(latestResult.updated_at) })
    const latestAnnouncement = data.announcements[0]
    if (latestAnnouncement) items.push({ id: 'ann', text: `Announcement posted: ${latestAnnouncement.title}`, time: relativeTime(latestAnnouncement.created_at) })
    return items.slice(0, 5)
  }, [data])

  if (data.loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const todayEvent = todayEvents[0]

  const quickActions = [
    { label: 'Add Player', icon: UserPlus, to: '/team', state: { openAddPlayer: true } },
    { label: 'Take Attendance', icon: ClipboardCheck, to: '/attendance', state: { autoSelectToday: true } },
    { label: 'Add Practice', icon: Calendar, to: '/schedule', state: { openCreate: true, presetType: 'practice' } },
    { label: 'Add Game', icon: Trophy, to: '/games', state: { openCreate: true } },
    { label: 'Post Announcement', icon: Megaphone, to: '/announcements', state: { openCreate: true } },
    { label: 'Add Highlight', icon: Film, to: '/media', state: { openCreate: true } },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-sna-gold">SNA Captain</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {greeting()}, {firstName}.
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {team?.name}
            {team?.season ? ` · ${team.season} Season` : ''}
          </p>
        </div>
        <Button onClick={() => navigate('/portal/captain/players', { state: { openAddPlayer: true } })}>
          <UserPlus className="h-4 w-4" /> Add Player
        </Button>
      </div>

      {/* Team overview */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Players" value={activePlayers} sub="active on the roster" icon={<Users className="h-6 w-6" />} />
        <StatCard label="Attendance" value={`${data.teamRate}%`} sub="season average" icon={<ClipboardCheck className="h-6 w-6" />} accent />
        <StatCard label="Record" value={`${record.wins}–${record.losses}`} sub={record.ties > 0 ? `${record.ties} ties` : 'this season'} icon={<Trophy className="h-6 w-6" />} />
        <StatCard
          label={todayEvent ? 'Today' : 'Upcoming'}
          value={todayEvent ? EVENT_TYPE_META[todayEvent.type].label : `${upcomingItems.length}`}
          sub={todayEvent?.start_time ? formatTime(todayEvent.start_time) : todayEvent ? dayLabel(todayEvent.date) : 'events on the schedule'}
          icon={<Calendar className="h-6 w-6" />}
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {quickActions.map(({ label, icon: Icon, to, state }) => (
          <button
            key={label}
            onClick={() => navigate(to, state ? { state } : undefined)}
            className="card group flex items-center gap-2.5 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--team-primary)]/50 hover:shadow-md"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-team-soft text-[var(--team-primary)] transition-transform group-hover:scale-110">
              <Icon className="h-4.5 w-4.5" style={{ height: 18, width: 18 }} />
            </span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
          </button>
        ))}
      </div>

      {/* Today / attendance */}
      <div className="grid gap-6 lg:grid-cols-2">
        {todayEvent ? (
          <Card>
            <CardHeader
              title={`Today's ${EVENT_TYPE_META[todayEvent.type].label}`}
              subtitle={todayEvent.description ?? undefined}
              action={
                <Button size="sm" onClick={() => navigate('/portal/attendance', { state: { eventId: todayEvent.id } })}>
                  <ClipboardCheck className="h-3.5 w-3.5" /> Take Attendance
                </Button>
              }
            />
            <div className="grid gap-4 p-5 sm:grid-cols-3">
              <div>
                <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <Clock className="h-3 w-3" /> Time
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {formatTime(todayEvent.start_time)}
                  {todayEvent.end_time ? ` – ${formatTime(todayEvent.end_time)}` : ''}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <MapPin className="h-3 w-3" /> Location
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{todayEvent.location ?? 'TBD'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Attendance</p>
                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {attendanceSummary?.total ?? 0} of {activePlayers} marked
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No event today</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Add a practice or take attendance from the schedule.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate('/portal/schedule', { state: { openCreate: true } })}>
              <Plus className="h-3.5 w-3.5" /> Add event
            </Button>
          </Card>
        )}

        <Card>
          <CardHeader
            title={attendanceEvent ? `Attendance · ${dayLabel(attendanceEvent.date)}` : 'Attendance'}
            subtitle={attendanceEvent ? attendanceEvent.title : undefined}
            action={
              <Button variant="secondary" size="sm" onClick={() => navigate('/portal/attendance')}>
                Manage Attendance <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            }
          />
          {attendanceSummary ? (
            <div className="grid grid-cols-5 divide-x divide-slate-100 text-center dark:divide-slate-800">
              <div className="p-5">
                <p className="tabular text-2xl font-black text-emerald-600 dark:text-emerald-400">{attendanceSummary.present}</p>
                <p className="mt-0.5 text-xs text-slate-400">Present</p>
              </div>
              <div className="p-5">
                <p className="tabular text-2xl font-black text-amber-600 dark:text-amber-400">{attendanceSummary.late}</p>
                <p className="mt-0.5 text-xs text-slate-400">Late</p>
              </div>
              <div className="p-5">
                <p className="tabular text-2xl font-black text-rose-600 dark:text-rose-400">{attendanceSummary.absent}</p>
                <p className="mt-0.5 text-xs text-slate-400">Absent</p>
              </div>
              <div className="p-5">
                <p className="tabular text-2xl font-black text-slate-500 dark:text-slate-400">{attendanceSummary.excused}</p>
                <p className="mt-0.5 text-xs text-slate-400">Excused</p>
              </div>
              <div className="p-5">
                <p className="tabular text-2xl font-black text-orange-600 dark:text-orange-400">{attendanceSummary.sent_home}</p>
                <p className="mt-0.5 text-xs text-slate-400">Sent home</p>
              </div>
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                title="No attendance yet"
                description="Pick an event and mark who's in — stats update automatically."
                action={
                  <Button size="sm" onClick={() => navigate('/portal/attendance', { state: { autoSelectToday: true } })}>
                    <ClipboardCheck className="h-3.5 w-3.5" /> Take attendance
                  </Button>
                }
              />
            </div>
          )}
        </Card>
      </div>

      {/* Upcoming + activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Upcoming" action={<Link to="/portal/schedule" className="text-xs font-semibold text-[var(--team-primary)] hover:underline">Full schedule</Link>} />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {upcomingItems.length === 0 && (
              <div className="p-5">
                <EmptyState title="Nothing scheduled yet" description="Add practices and games so the team knows what's next." />
              </div>
            )}
            {upcomingItems.map((item) => (
              <div key={`${item.kind}-${item.id}`} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-team-soft text-[var(--team-primary)]">
                  {item.kind === 'game' ? <Trophy className="h-4.5 w-4.5" style={{ height: 18, width: 18 }} /> : <Calendar className="h-4.5 w-4.5" style={{ height: 18, width: 18 }} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item.kind === 'game' ? item.title : `${EVENT_TYPE_META[item.kind === 'practice' ? 'practice' : 'other'].icon} ${item.title}`}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {dayLabel(item.date)}
                    {item.time ? ` · ${formatTime(item.time)}` : ''}
                    {item.location ? ` · ${item.location}` : ''}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent Activity" />
          {activity.length === 0 ? (
            <div className="p-5">
              <EmptyState title="Nothing yet" description="Your actions will show up here as the season gets going." />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activity.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <p className="truncate text-sm text-slate-700 dark:text-slate-200">{a.text}</p>
                  <span className="shrink-0 text-xs text-slate-400">{a.time}</span>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {data.players.filter((p) => p.is_active).slice(0, 4).map((p) => (
                  <Avatar key={p.id} name={p.full_name} src={p.photo_url} size="xs" className="ring-2 ring-white dark:ring-slate-900" />
                ))}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activePlayers} active players on the {team?.sport ?? 'SNA'} roster
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
