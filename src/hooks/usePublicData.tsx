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
    ;(async () => {
      try {
        const t = await fetchPublicTeam()
        if (cancelled) return
        setTeam(t)
        if (t) {
          const [g, e, m, r, s, a] = await Promise.all([
            fetchPublicGames(t.id),
            fetchPublicEvents(t.id),
            fetchPublicMedia(t.id),
            fetchPublicRoster(t.id),
            fetchPublicPlayerStats(t.id),
            fetchPublicAttendanceSummary(t.id),
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
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Couldn’t load the public site.')
      } finally {
        if (!cancelled) setLoading(false)
      }
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
