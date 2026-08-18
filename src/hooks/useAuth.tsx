import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { friendlyError, signOut as apiSignOut } from '@/lib/api'

interface AuthContextValue {
  session: Session | null
  user: User | null
  initializing: boolean
  /** True for code-first (anonymous) accounts with no email/password. */
  isAnonymous: boolean
  signInAnonymously: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  initializing: true,
  isAnonymous: false,
  signInAnonymously: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    let active = true
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session)
      })
      .finally(() => {
        if (active) setInitializing(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) setInitializing(false)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      initializing,
      // Anonymous (code-first) users carry is_anonymous=true; app_metadata is
      // empty for them, so the provider check never matched.
      isAnonymous: session?.user?.is_anonymous === true,
      signInAnonymously: async () => {
        const { error } = await supabase.auth.signInAnonymously()
        if (error) throw friendlyError(error, 'Couldn’t start an anonymous session.')
      },
      signOut: async () => apiSignOut(),
    }),
    [session, initializing],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
