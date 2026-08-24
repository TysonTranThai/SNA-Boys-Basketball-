import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  fetchAnnouncements,
  fetchAttendance,
  fetchEvents,
  fetchGames,
  fetchMedia,
  fetchRoster,
} from '@/lib/api'
import { percent, totalLateMarks } from '@/lib/utils'
import type {
  Announcement,
  AttendanceRecord,
  Game,
  MediaItem,
  PlayerWithStats,
  Profile,
  TeamEvent,
} from '@/types'
import { useTeam } from './useTeam'

interface TeamData {
  players: PlayerWithStats[]
  attendance: AttendanceRecord[]
  events: TeamEvent[]
  games: Game[]
  media: MediaItem[]
  announcements: Announcement[]
  teamRate: number
  loading: boolean
  error: string | null
  refresh: () => void
}

const TeamDataContext = createContext<TeamData>({
  players: [],
  attendance: [],
  events: [],
  games: [],
  media: [],
  announcements: [],
  teamRate: 0,
  loading: true,
  error: null,
  refresh: () => {},
})

export function computePlayerStats(profiles: Profile[], attendance: AttendanceRecord[]): PlayerWithStats[] {
  const byPlayer = new Map<string, { present: number; late: number; absent: number; excused: number; sent_home: number }>()
  for (const row of attendance) {
    const agg = byPlayer.get(row.player_id) ?? { present: 0, late: 0, absent: 0, excused: 0, sent_home: 0 }
    agg[row.status] += 1
    byPlayer.set(row.player_id, agg)
  }
  return profiles.map((p) => {
    const agg = byPlayer.get(p.id) ?? { present: 0, late: 0, absent: 0, excused: 0, sent_home: 0 }
    const total = agg.present + agg.late + agg.absent + agg.excused + agg.sent_home
    const records = attendance.filter((a) => a.player_id === p.id)
    const lateMarks = totalLateMarks(records)
    return { ...p, ...agg, total, attendanceRate: percent(agg.present + agg.late, total), lateMarks }
  })
}

export function TeamDataProvider({ children }: { children: ReactNode }) {
  const { team } = useTeam()
  const [players, setPlayers] = useState<Profile[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [events, setEvents] = useState<TeamEvent[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!team) return
    let cancelled = false
    setLoading(true)

    const queries = [
      { key: 'players' as const, fn: () => fetchRoster(team.id) },
      { key: 'attendance' as const, fn: () => fetchAttendance(team.id) },
      { key: 'events' as const, fn: () => fetchEvents(team.id) },
      { key: 'games' as const, fn: () => fetchGames(team.id) },
      { key: 'media' as const, fn: () => fetchMedia(team.id) },
      { key: 'announcements' as const, fn: () => fetchAnnouncements(team.id) },
    ]

    const errors: string[] = []
    const runQuery = async (fn: () => Promise<unknown>, label: string): Promise<unknown> => {
      try {
        return await fn()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed'
        // Keep the portal alive — surface all errors at once so the
        // captain sees what's wrong instead of a blank screen.
        errors.push(`${label}: ${msg}`)
        return []
      }
    }

    Promise.all(
      queries.map((q) => runQuery(q.fn, q.key)),
    )
      .then((results) => {
        if (cancelled) return
        setPlayers(results[0] as Profile[])
        setAttendance(results[1] as AttendanceRecord[])
        setEvents(results[2] as TeamEvent[])
        setGames((results[3] as Game[] ?? []).map((game) => ({ ...game, eligible_player_ids: game.eligible_player_ids ?? [] })))
        setMedia(results[4] as MediaItem[])
        setAnnouncements(results[5] as Announcement[])
        if (errors.length > 0) setError(errors.join('\n'))
        else setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Couldn’t load team data.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [team, tick])

  const value = useMemo<TeamData>(() => {
    const playersWithStats = computePlayerStats(players, attendance)
    const marked = attendance.length
    const present = attendance.filter((a) => a.status === 'present').length
    const late = attendance.filter((a) => a.status === 'late').length
    const teamRate = marked > 0 ? percent(present + late, marked) : 0
    return {
      players: playersWithStats,
      attendance,
      events,
      games,
      media,
      announcements,
      teamRate,
      loading,
      error,
      refresh,
    }
  }, [players, attendance, events, games, media, announcements, loading, error, refresh])

  return <TeamDataContext.Provider value={value}>{children}</TeamDataContext.Provider>
}

export function useTeamData() {
  return useContext(TeamDataContext)
}
