import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  fetchPublicAttendanceSummary,
  fetchPublicEvents,
  fetchPublicGames,
  fetchPublicMedia,
  fetchPublicPlayerStats,
  fetchPublicRoster,
  fetchPublicTeam,
  type PublicAttendanceSummary,
} from '@/lib/api'
import type { Game, MediaItem, PlayerStat, Profile, Team, TeamEvent } from '@/types'

export interface PublicData {
  team: Team | null
  games: Game[]
  events: TeamEvent[]
  media: MediaItem[]
  roster: Profile[]
  playerStats: PlayerStat[]
  attendance: PublicAttendanceSummary[]
  loading: boolean
  error: string | null
  refresh: () => void
}

const PublicDataContext = createContext<PublicData>({
  team: null,
  games: [],
  events: [],
  media: [],
  roster: [],
  playerStats: [],
  attendance: [],
  loading: true,
  error: null,
  refresh: () => {},
})

export function PublicDataProvider({ children }: { children: ReactNode }) {
  const [team, setTeam] = useState<Team | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [events, setEvents] = useState<TeamEvent[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [roster, setRoster] = useState<Profile[]>([])
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([])
  const [attendance, setAttendance] = useState<PublicAttendanceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const errors: string[] = []
    const safe = async <T,>(fn: () => Promise<T>, label: string, fallback: T): Promise<T> => {
      try {
        return await fn()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed'
        errors.push(`${label}: ${msg}`)
        return fallback
      }
    }

    ;(async () => {
      const t = await safe(() => fetchPublicTeam(), 'team', null)
      if (cancelled) return
      setTeam(t)
      if (t) {
        const [g, e, m, r, s, a] = await Promise.all([
          safe(() => fetchPublicGames(t.id), 'games', [] as Game[]),
          safe(() => fetchPublicEvents(t.id), 'events', [] as TeamEvent[]),
          safe(() => fetchPublicMedia(t.id), 'media', [] as MediaItem[]),
          safe(() => fetchPublicRoster(t.id), 'roster', [] as Profile[]),
          safe(() => fetchPublicPlayerStats(t.id), 'stats', [] as PlayerStat[]),
          safe(() => fetchPublicAttendanceSummary(t.id), 'attendance', [] as PublicAttendanceSummary[]),
        ])
        if (cancelled) return
        setGames(g)
        setEvents(e)
        setMedia(m)
        setRoster(r)
        setPlayerStats(s)
        setAttendance(a)
      } else {
        setGames([])
        setEvents([])
        setMedia([])
        setRoster([])
        setPlayerStats([])
        setAttendance([])
      }
      if (errors.length > 0) setError(errors.join('\n'))
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [tick])

  const value = useMemo(
    () => ({ team, games, events, media, roster, playerStats, attendance, loading, error, refresh }),
    [team, games, events, media, roster, playerStats, attendance, loading, error, refresh],
  )

  return <PublicDataContext.Provider value={value}>{children}</PublicDataContext.Provider>
}

export function usePublicData() {
  return useContext(PublicDataContext)
}
