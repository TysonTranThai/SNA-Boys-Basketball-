import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ArrowRight, Home, Trophy, Users, BarChart3, Calendar, Film } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePublicData } from '@/hooks/usePublicData'
import { TeamMark } from './AppLayout'
import { snaBrand, setSnaTitle } from '@/lib/brand'
import { cn } from '@/lib/utils'

const PUBLIC_NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
  { to: '/schedule', label: 'Schedule', icon: Calendar },
  { to: '/games', label: 'Games', icon: Trophy },
  { to: '/highlights', label: 'Highlights', icon: Film },
]

export function EnterTeamButton({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const { session } = useAuth()
  const navigate = useNavigate()

  const go = () => {
    // Already signed in → straight into the portal; otherwise show team entry.
    navigate(session ? '/portal' : '/login')
  }

  return (
    <button
      onClick={go}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold text-white shadow-lg shadow-[var(--team-primary)]/25 transition-all duration-150 hover:-translate-y-0.5 hover:brightness-110 active:scale-95',
        size === 'lg' ? 'px-8 py-4 text-base' : size === 'sm' ? 'px-4 py-2 text-sm' : 'px-5 py-2.5 text-sm',
        className,
      )}
      style={{ backgroundColor: 'var(--team-primary, #C8102E)' }}
    >
      Enter Team
      <ArrowRight className={cn(size === 'sm' ? 'h-4 w-4' : 'h-4 w-4')} />
    </button>
  )
}

export default function PublicLayout() {
  const { team } = usePublicData()
  setSnaTitle()

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#0b1220] dark:text-slate-100">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-[#0b1220]/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <TeamMark team={team} className="h-9 w-9" />
            <span className="text-lg font-black tracking-tight">
              {team?.name ?? snaBrand.name}
              {team?.season && <span className="ml-2 hidden text-xs font-semibold text-slate-400 sm:inline">{team.season}</span>}
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {PUBLIC_NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                    isActive ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <EnterTeamButton />
        </div>
        {/* Mobile nav */}
        <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {PUBLIC_NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  isActive ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                )
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-12 sm:px-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <TeamMark team={team} className="h-12 w-12" />
            <div>
              <p className="text-xl font-black tracking-tight">{team?.name ?? snaBrand.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {team ? `${team.sport}${team.season ? ` · ${team.season}` : ''}` : snaBrand.tagline}
              </p>
            </div>
          </div>
          <p className="max-w-md text-center text-sm font-medium text-slate-700 dark:text-slate-200">
            Ready? Enter the {team?.name ?? 'SNA Boys'} team portal.
          </p>
          <EnterTeamButton size="lg" />
          <p className="mt-2 text-xs text-slate-400">
            © {new Date().getFullYear()} {team?.name ?? snaBrand.name} · Team members only
          </p>
        </div>
      </footer>
    </div>
  )
}
