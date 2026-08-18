import {
  AlertTriangle,
  BarChart3,
  Calendar,
  ClipboardCheck,
  Film,
  LayoutDashboard,
  Megaphone,
  Settings,
  ShieldCheck,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

/**
 * Two completely different experiences:
 * - Captains land on the SNA Captain control center (/portal/captain) with
 *   management routes: Attendance, Players, Schedule, Games, Media,
 *   Announcements, Reports, Settings.
 * - Players get a read-focused home with their own attendance and profile.
 */
export const NAV_ITEMS: Record<'captain' | 'player', NavItem[]> = {
  captain: [
    { to: '/portal/captain', label: 'Overview', icon: ShieldCheck },
    { to: '/portal/attendance', label: 'Attendance', icon: ClipboardCheck },
    { to: '/portal/captain/players', label: 'Players', icon: Users },
    { to: '/portal/schedule', label: 'Schedule', icon: Calendar },
    { to: '/portal/games', label: 'Games', icon: Trophy },
    { to: '/portal/media', label: 'Media', icon: Film },
    { to: '/portal/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/portal/penalties', label: 'Penalties', icon: AlertTriangle },
    { to: '/portal/captain/reports', label: 'Reports', icon: BarChart3 },
    { to: '/portal/settings', label: 'Settings', icon: Settings },
  ],
  player: [
    { to: '/portal/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/portal/my-attendance', label: 'My Attendance', icon: ClipboardCheck },
    { to: '/portal/team', label: 'Team', icon: Users },
    { to: '/portal/schedule', label: 'Schedule', icon: Calendar },
    { to: '/portal/games', label: 'Games', icon: Trophy },
    { to: '/portal/media', label: 'Media', icon: Film },
    { to: '/portal/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/portal/penalties', label: 'Penalties', icon: AlertTriangle },
    { to: '/portal/profile', label: 'Profile', icon: User },
  ],
}

/** Coaches get member-level navigation (read-only team views). */
export function navKey(role: 'captain' | 'player' | 'coach' | null): 'captain' | 'player' {
  return role === 'captain' ? 'captain' : 'player'
}

/** Items shown in the mobile bottom bar; the rest live in the menu drawer. */
export function bottomNav(role: 'captain' | 'player' | 'coach' | null): NavItem[] {
  if (role === 'captain') {
    return [
      { to: '/portal/captain', label: 'Home', icon: ShieldCheck },
      { to: '/portal/attendance', label: 'Attendance', icon: ClipboardCheck },
      { to: '/portal/captain/players', label: 'Players', icon: Users },
      { to: '/portal/schedule', label: 'Schedule', icon: Calendar },
    ]
  }
  return [
    { to: '/portal/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/portal/schedule', label: 'Schedule', icon: Calendar },
    { to: '/portal/games', label: 'Games', icon: Trophy },
    { to: '/portal/media', label: 'Media', icon: Film },
  ]
}

/** Document title segment for a route path. */
export function titleForPath(pathname: string): string | undefined {
  const p = pathname.replace(/\/+$/, '')
  if (p === '/login') return undefined
  if (p === '/portal/no-team') return 'Captain Setup'
  if (p === '/portal/pick-identity') return 'Who Are You'
  if (p === '/portal/dashboard') return 'Home'
  if (p === '/portal/captain') return 'Captain'
  if (p === '/portal/captain/players') return 'Players'
  if (p === '/portal/captain/reports') return 'Reports'
  if (p === '/portal/team') return 'Team'
  if (p === '/portal/attendance') return 'Attendance'
  if (p === '/portal/my-attendance') return 'My Attendance'
  if (p === '/portal/schedule') return 'Schedule'
  if (p === '/portal/games') return 'Games'
  if (p === '/portal/penalties') return 'Penalties'
  if (p === '/portal/media') return 'Media'
  if (p === '/portal/announcements') return 'Announcements'
  if (p === '/portal/settings') return 'Settings'
  if (p === '/portal/profile') return 'Profile'
  return undefined
}
