import { useMemo } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, Clock, MapPin, Trophy, Users } from 'lucide-react'
import { useTeam } from '@/hooks/useTeam'
import { useTeamData } from '@/hooks/useTeamData'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Avatar } from '@/components/ui/Avatar'
import { AttendanceBadge } from '@/components/cards/AttendanceBadge'
import { MediaCard } from '@/components/cards/MediaCard'
import { setSnaTitle } from '@/lib/brand'
import {
  EVENT_TYPE_META,
  dayLabel,
  formatTime,
  relativeTime,
} from '@/lib/utils'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const { team, profile, isCaptain } = useTeam()
  const data = useTeamData()
  const navigate = useNavigate()
  setSnaTitle('Home')

  const firstName = profile?.full_name.split(' ')[0] ?? 'there'
  const today = new Date().toISOString().slice(0, 10)

  const nextEvent = useMemo(() => {
    const ev = data.events
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time ?? '').localeCompare(b.start_time ?? ''))[0]
    const game = data.games
      .filter((g) => g.status === 'upcoming' && g.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0]
    return { ev, game }
  }, [data.events, data.games, today])

  const latestAnnouncement = data.announcements[0]
  const latestMedia = data.media[0]

  const myAttendance = data.attendance.filter((a) => a.player_id === profile?.id)
  const present = myAttendance.filter((a) => a.status === 'present').length
  const late = myAttendance.filter((a) => a.status === 'late').length
  const absent = myAttendance.filter((a) => a.status === 'absent').length
  const excused = myAttendance.filter((a) => a.status === 'excused').length
  const rate = myAttendance.length > 0 ? Math.round(((present + late) / myAttendance.length) * 100) : 0

  const ev = nextEvent.ev
  const game = nextEvent.game
  const next = ev ?? game

  // Captains live in the SNA Captain control center (after all hooks).
  if (isCaptain) return <Navigate to="/portal/captain" replace />

  if (data.loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full sm:col-span-2" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {greeting()}, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          SNA {team?.sport ?? 'Basketball'}
          {team?.season ? ` · ${team.season} Season` : ''}
        </p>
      </div>

      {/* Attendance summary + next event */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-5 sm:col-span-1">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-team-soft text-2xl font-black text-[var(--team-primary)]">
            {rate}%
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Your Attendance</p>
            <div className="mt-2 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
              <p className="text-emerald-600 dark:text-emerald-400">{present} Present</p>
              <p className="text-amber-600 dark:text-amber-400">{late} Late</p>
              <p className="text-rose-600 dark:text-rose-400">{absent} Absent</p>
              <p className="text-slate-400">{excused} Excused</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Next Event</p>
          {next ? (
            <>
              <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                {ev ? `${EVENT_TYPE_META[ev.type].icon} ${ev.title}` : `VS ${game?.opponent}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {dayLabel(next.date)}{ev ? (ev.start_time ? ` · ${formatTime(ev.start_time)}` : '') : game?.time ? ` · ${formatTime(game.time)}` : ''}</span>
                {next.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {next.location}</span>}
              </div>
              <Button size="sm" variant="secondary" className="mt-4" onClick={() => navigate('/schedule')}>
                View Schedule <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Nothing scheduled yet — enjoy the break!</p>
          )}
        </Card>
      </div>

      {/* Latest update + latest highlight */}
      <div className="grid gap-4 sm:grid-cols-2">
        {latestAnnouncement && (
          <Card>
            <CardHeader title="Latest Team Update" action={<Link to="/portal/announcements" className="text-xs font-semibold text-[var(--team-primary)] hover:underline">All updates</Link>} />
            <div className="p-5">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{latestAnnouncement.title}</p>
              <p className="mt-1 line-clamp-3 text-sm text-slate-500 dark:text-slate-400">{latestAnnouncement.content}</p>
              <p className="mt-2 text-xs text-slate-400">{relativeTime(latestAnnouncement.created_at)}</p>
            </div>
          </Card>
        )}
        {latestMedia && (
          <Card>
            <CardHeader title="Latest Highlight" action={<Link to="/portal/media" className="text-xs font-semibold text-[var(--team-primary)] hover:underline">All media</Link>} />
            <div className="p-5">
              <MediaCard item={latestMedia} />
            </div>
          </Card>
        )}
      </div>

      {/* My last few attendance records */}
      {myAttendance.length > 0 && (
        <Card>
          <CardHeader title="Recent Attendance" action={<Link to="/portal/my-attendance" className="text-xs font-semibold text-[var(--team-primary)] hover:underline">Full history</Link>} />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[...myAttendance]
              .sort((a, b) => b.marked_at.localeCompare(a.marked_at))
              .slice(0, 4)
              .map((a) => {
                const event = data.events.find((e) => e.id === a.event_id)
                return (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{event?.title ?? 'Event'}</p>
                      <p className="text-xs text-slate-400">{event ? dayLabel(event.date) : ''}</p>
                    </div>
                    <AttendanceBadge status={a.status} />
                  </div>
                )
              })}
          </div>
        </Card>
      )}

      {/* Empty states */}
      {myAttendance.length === 0 && data.announcements.length === 0 && data.media.length === 0 && (
        <Card className="p-6">
          <EmptyState
            title="Welcome to SNA"
            description="Your captain hasn't posted anything yet — check back soon for practices, games and team updates."
          />
        </Card>
      )}

      {/* Teammates */}
      <Card>
        <CardHeader title="Teammates" action={<Link to="/portal/team" className="text-xs font-semibold text-[var(--team-primary)] hover:underline">View roster</Link>} />
        <div className="flex flex-wrap gap-3 p-5">
          {data.players.filter((p) => p.is_active).slice(0, 8).map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 dark:border-slate-700">
              <Avatar name={p.full_name} src={p.photo_url} size="xs" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{p.full_name}</span>
              {p.jersey_number != null && <span className="text-[10px] font-bold text-slate-400">#{p.jersey_number}</span>}
            </div>
          ))}
          {data.players.filter((p) => p.is_active).length === 0 && (
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <Users className="h-4 w-4" /> The roster is empty — check back soon.
            </p>
          )}
          {data.players.filter((p) => p.is_active).length > 8 && (
            <Link to="/portal/team" className="flex items-center gap-1 text-xs font-semibold text-[var(--team-primary)] hover:underline">
              <Trophy className="h-3.5 w-3.5" /> See all teammates
            </Link>
          )}
        </div>
      </Card>
    </div>
  )
}
