import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Moon, MoreHorizontal, Sun, X } from 'lucide-react'
import { bottomNav, navKey, NAV_ITEMS, titleForPath } from './navigation'
import { NotificationsBell } from './NotificationsBell'
import { OfflineBanner } from './OfflineBanner'
import { useAuth } from '@/hooks/useAuth'
import { useTeam } from '@/hooks/useTeam'
import { useTheme } from '@/hooks/useTheme'
import { Avatar } from '@/components/ui/Avatar'
import { snaBrand, setSnaTitle } from '@/lib/brand'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const { team, profile, isCaptain, role } = useTeam()
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const items = NAV_ITEMS[navKey(role)]
  const bottom = bottomNav(role)

  useEffect(() => {
    setSnaTitle(titleForPath(location.pathname))
  }, [location.pathname])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen">
      <OfflineBanner />

      {/* ---------------- Desktop sidebar ---------------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <TeamLogo className="h-9 w-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{team?.name ?? snaBrand.name}</p>
            {team?.season && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{team.season}</p>}
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-team-soft text-[var(--team-primary)]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                )
              }
            >
              <item.icon className="h-4.5 w-4.5" style={{ height: 18, width: 18 }} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3 dark:border-slate-800">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Avatar name={profile?.full_name ?? user?.email ?? '?'} src={profile?.photo_url} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {profile?.full_name || user?.email?.split('@')[0]}
              </p>
              <p className="text-xs capitalize text-slate-500 dark:text-slate-400">
                {isCaptain ? 'SNA Captain' : 'Player'}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 px-2 text-[10px] font-medium uppercase tracking-wider text-slate-300 dark:text-slate-600">
            {snaBrand.tagline}
          </p>
        </div>
      </aside>

      {/* ---------------- Main column ---------------- */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80">
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <TeamLogo className="h-7 w-7" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">{team?.name ?? snaBrand.name}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NotificationsBell />
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-10 lg:pt-8">
          <Outlet />
        </main>
      </div>

      {/* ---------------- Mobile bottom nav ---------------- */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-5">
          {bottom.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                  isActive ? 'text-[var(--team-primary)]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <MoreHorizontal className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      {/* ---------------- Mobile drawer ---------------- */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="animate-fade-in absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="animate-scale-in absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <TeamLogo className="h-8 w-8" />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{team?.name ?? snaBrand.name}</p>
                  {team?.season && <p className="text-xs text-slate-500">{team.season}</p>}
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                      isActive
                        ? 'bg-team-soft text-[var(--team-primary)]'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                    )
                  }
                >
                  <item.icon className="h-4.5 w-4.5" style={{ height: 18, width: 18 }} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="border-t border-slate-100 p-4 dark:border-slate-800">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** SNA logo: team logo when set, otherwise the SNA monogram. */
export function TeamLogo({ className }: { className?: string }) {
  const { team } = useTeam()
  return <TeamMark team={team} className={className} />
}

/** Team-agnostic logo (works on the public site without an authed team). */
export function TeamMark({ team, className }: { team: { logo_url: string | null; name: string } | null; className?: string }) {
  if (team?.logo_url) {
    return <img src={team.logo_url} alt={team.name} className={cn('rounded-xl object-contain', className)} />
  }
  return (
    <div
      className={cn(
        'sna-accent flex shrink-0 items-center justify-center rounded-xl text-sm font-black text-white shadow-sm',
        className,
      )}
      aria-label={snaBrand.name}
    >
      S
    </div>
  )
}
