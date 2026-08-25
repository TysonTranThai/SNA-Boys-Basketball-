import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { fetchTeam } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { contrastText, shadeColor } from '@/lib/utils'
import type { Profile, Role, Team } from '@/types'
import { useAuth } from './useAuth'

interface TeamContextValue {
  profile: Profile | null
  team: Team | null
  role: Role | null
  isCaptain: boolean
  loading: boolean
  /** True while the profile row is being created right after signup. */
  profilePending: boolean
  /** Set when the profile/team could not be loaded after retries. */
  error: string | null
  refresh: () => Promise<void>
}

const TeamContext = createContext<TeamContextValue>({
  profile: null,
  team: null,
  role: null,
  isCaptain: false,
  loading: true,
  profilePending: false,
  error: null,
  refresh: async () => {},
})

/** Push team colors into CSS variables so any element can use them. */
function applyTeamColors(team: Team | null) {
  if (!team) return
  const root = document.documentElement
  root.style.setProperty('--team-primary', team.primary_color)
  root.style.setProperty('--team-primary-hover', shadeColor(team.primary_color, -0.1))
  root.style.setProperty('--team-primary-active', shadeColor(team.primary_color, -0.2))
  root.style.setProperty('--team-primary-soft', shadeColor(team.primary_color, 0.88))
  root.style.setProperty('--team-secondary', team.secondary_color)
  root.style.setProperty('--team-accent', team.accent_color)
  root.style.setProperty('--team-contrast', contrastText(team.primary_color))
}

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [profilePending, setProfilePending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guards against stale async loads: when sign-in/join triggers several
  // overlapping profile fetches, only the most recent one may write state.
  // Otherwise an in-flight pre-join fetch (team_id null) can land AFTER a
  // post-join refresh and bounce the user back to /no-team until they reload.
  const loadSeq = useRef(0)
  const load = useCallback(async () => {
    const seq = ++loadSeq.current
    const stale = () => seq !== loadSeq.current

    if (!user) {
      setProfile(null)
      setTeam(null)
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    try {
      const fetchProfile = async (): Promise<Profile | null> => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        if (error) throw error
        return data
      }

      let myProfile: Profile | null = null
      let lastError: unknown = null

      // Supabase free-tier cold starts and network blips throw transient
      // errors. Retry the fetch itself with backoff instead of giving up on
      // the first attempt (which would bounce the signed-in user into a
      // permanent loading state).
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          myProfile = await fetchProfile()
          break
        } catch (err) {
          lastError = err
          if (stale()) return
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
          if (stale()) return
        }
      }

      // A profile is created by DB trigger on signup; wait briefly in case it
      // hasn't propagated yet.
      if (!myProfile) {
        setProfilePending(true)
        for (let attempt = 0; attempt < 5 && !myProfile; attempt++) {
          await new Promise((r) => setTimeout(r, 700))
          if (stale()) {
            setProfilePending(false)
            return
          }
          try {
            myProfile = await fetchProfile()
          } catch (err) {
            lastError = err
          }
        }
        setProfilePending(false)
      }

      // Only the most recent load may write state — a stale in-flight fetch
      // (e.g. the pre-join profile with team_id null) must never overwrite the
      // fresh post-join one.
      if (stale()) return

      if (!myProfile) {
        // Exhausted all retries. Surface a friendly error instead of leaving
        // the guards stuck on an infinite loader.
        setProfile(null)
        setTeam(null)
        setError(
          lastError instanceof Error
            ? lastError.message
            : "We couldn't load your profile. Please try again.",
        )
        return
      }

      setProfile(myProfile)
      setError(null)
      if (myProfile.team_id) {
        try {
          const t = await fetchTeam(myProfile.team_id)
          if (stale()) return
          setTeam(t)
          applyTeamColors(t)
        } catch (err) {
          if (stale()) return
          setTeam(null)
          setError(err instanceof Error ? err.message : "We couldn't load your team. Please try again.")
        }
      } else {
        setTeam(null)
      }
    } finally {
      if (!stale()) setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load, session])

  const value = useMemo<TeamContextValue>(
    () => ({
      profile,
      team,
      role: profile?.role ?? null,
      isCaptain: profile?.role === 'captain',
      loading,
      profilePending,
      error,
      refresh: load,
    }),
    [profile, team, loading, profilePending, error, load],
  )

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
}

export function useTeam() {
  return useContext(TeamContext)
}
