import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import PublicLayout from '@/components/layout/PublicLayout'
import { PublicDataProvider } from '@/hooks/usePublicData'
import { TeamDataProvider } from '@/hooks/useTeamData'
import { useAuth } from '@/hooks/useAuth'
import { useTeam } from '@/hooks/useTeam'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/Skeleton'
import { missingConfigVar } from '@/lib/supabase'
import { joinInProgress } from '@/lib/joinState'
import { Database, ExternalLink } from 'lucide-react'

/* ------------------------------ guards -------------------------------- */

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0b1220]">
      <div className="w-full max-w-sm space-y-4 p-6">
        <div className="flex items-center justify-center gap-2">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-team" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  )
}

/** Requires a signed-in session; redirects to the team entry otherwise. */
function RequireAuth() {
  const { session, initializing } = useAuth()
  const { profile } = useTeam()
  const location = useLocation()

  if (initializing) return <FullScreenLoader />

  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  // Signed in but the profile row hasn't arrived yet — it's created by a DB
  // trigger on signup, and useTeam polls for it. Hold on a loader instead of
  // redirecting back to /login: a signed-in user on the public page makes
  // PublicOnly send them straight back to the portal, and the two guards
  // ping-pong forever, rendering nothing.
  if (!profile) return <FullScreenLoader />

  return <Outlet />
}

/** Requires a team; redirects to the no-team page (captain bootstrap /
    back-to-code), or to the roster identity picker when a code-first
    player hasn't claimed their name yet. */
function RequireTeam() {
  const { profile, loading } = useTeam()
  const location = useLocation()
  if (loading) return <FullScreenLoader />
  if (!profile?.team_id) return <Navigate to="/portal/no-team" replace />
  if (
    profile.role === 'player' &&
    !profile.full_name &&
    location.pathname !== '/portal/pick-identity'
  ) {
    return <Navigate to="/portal/pick-identity" replace />
  }
  return <Outlet />
}

function RequireCaptain({ children }: { children: React.ReactNode }) {
  const { isCaptain, loading } = useTeam()
  if (loading) return <FullScreenLoader />
  // The spec demands an explicit rejection message: a player hitting a
  // captain-only area sees "Access restricted" rather than a silent redirect.
  if (!isCaptain) return <RestrictedPage />
  return <>{children}</>
}

function RequirePlayer({ children }: { children: React.ReactNode }) {
  const { role, loading } = useTeam()
  if (loading) return <FullScreenLoader />
  if (role !== 'player') return <Navigate to="/portal/dashboard" replace />
  return <>{children}</>
}

/** Public pages should not be shown to signed-in users. */
function PublicOnly({ children }: { children: React.ReactNode }) {
  const { session, initializing } = useAuth()
  if (initializing) return <FullScreenLoader />
  // While a code-join is in flight, stay on the login page — the handler
  // performs the single final navigation itself (see joinState.ts).
  if (session && !joinInProgress.current) return <Navigate to="/portal" replace />
  return <>{children}</>
}

/** /portal — send the signed-in user to their home based on role. */
function PortalHome() {
  const { isCaptain, loading } = useTeam()
  if (loading) return <FullScreenLoader />
  return <Navigate to={isCaptain ? '/portal/captain' : '/portal/dashboard'} replace />
}

/* ------------------------- config-required ----------------------------- */

function ConfigRequired() {
  const missing = missingConfigVar()
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-[#0b1220]">
      <div className="card w-full max-w-lg p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
          <Database className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Supabase isn't configured yet</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          SNA needs a Supabase project to store your team's data. Add the missing{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold dark:bg-slate-800">{missing}</code>{' '}
          variable to a <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold dark:bg-slate-800">.env</code>{' '}
          file (see <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold dark:bg-slate-800">.env.example</code>),
          run the migrations in <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold dark:bg-slate-800">supabase/migrations</code>,
          then restart the dev server.
        </p>
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-team px-4 py-2.5 text-sm font-semibold text-team-contrast"
        >
          Create a Supabase project <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  )
}

/* -------------------------------- app ---------------------------------- */

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const NoTeamPage = lazy(() => import('@/pages/NoTeamPage'))
const PickIdentityPage = lazy(() => import('@/pages/PickIdentityPage'))
const RestrictedPage = lazy(() => import('@/pages/RestrictedPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const CaptainOverviewPage = lazy(() => import('@/pages/CaptainOverviewPage'))
const PlayersManagementPage = lazy(() => import('@/pages/PlayersManagementPage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))
const TeamPage = lazy(() => import('@/pages/TeamPage'))
const AttendancePage = lazy(() => import('@/pages/AttendancePage'))
const MyAttendancePage = lazy(() => import('@/pages/MyAttendancePage'))
const SchedulePage = lazy(() => import('@/pages/SchedulePage'))
const GamesPage = lazy(() => import('@/pages/GamesPage'))
const MediaPage = lazy(() => import('@/pages/MediaPage'))
const AnnouncementsPage = lazy(() => import('@/pages/AnnouncementsPage'))
const PenaltiesPage = lazy(() => import('@/pages/PenaltiesPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))

const HomePage = lazy(() => import('@/pages/HomePage'))
const PublicTeamPage = lazy(() => import('@/pages/PublicTeamPage'))
const PublicStatsPage = lazy(() => import('@/pages/PublicStatsPage'))
const PublicSchedulePage = lazy(() => import('@/pages/PublicSchedulePage'))
const PublicGamesPage = lazy(() => import('@/pages/PublicGamesPage'))
const PublicHighlightsPage = lazy(() => import('@/pages/PublicHighlightsPage'))

function PageSuspense({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<FullScreenLoader />}>{children}</Suspense>
}

export default function App() {
  if (!isSupabaseConfigured) return <ConfigRequired />

  return (
    <Routes>
      {/* ---------------- Public SNA website ---------------- */}
      <Route element={<PublicDataProvider><PublicLayout /></PublicDataProvider>}>
        <Route path="/" element={<PageSuspense><HomePage /></PageSuspense>} />
        <Route path="/team" element={<PageSuspense><PublicTeamPage /></PageSuspense>} />
        <Route path="/stats" element={<PageSuspense><PublicStatsPage /></PageSuspense>} />
        <Route path="/schedule" element={<PageSuspense><PublicSchedulePage /></PageSuspense>} />
        <Route path="/games" element={<PageSuspense><PublicGamesPage /></PageSuspense>} />
        <Route path="/highlights" element={<PageSuspense><PublicHighlightsPage /></PageSuspense>} />
      </Route>

      {/* ---------------- Team entry ---------------- */}
      <Route path="/login" element={<PublicOnly><PageSuspense><LoginPage /></PageSuspense></PublicOnly>} />

      {/* ---------------- Team portal (players & captains) ---------------- */}
      <Route element={<RequireAuth />}>
        <Route element={<RequireTeam />}>
          <Route path="/portal/no-team" element={<PageSuspense><NoTeamPage /></PageSuspense>} />
          <Route path="/portal/pick-identity" element={<PageSuspense><PickIdentityPage /></PageSuspense>} />
          <Route element={<TeamDataProvider><Outlet /></TeamDataProvider>}>
            <Route path="/portal" element={<PortalHome />} />
            <Route element={<AppLayout />}>
              <Route path="/portal/dashboard" element={<PageSuspense><DashboardPage /></PageSuspense>} />
              <Route path="/portal/captain" element={<RequireCaptain><PageSuspense><CaptainOverviewPage /></PageSuspense></RequireCaptain>} />
              <Route path="/portal/captain/players" element={<RequireCaptain><PageSuspense><PlayersManagementPage /></PageSuspense></RequireCaptain>} />
              <Route path="/portal/captain/reports" element={<RequireCaptain><PageSuspense><ReportsPage /></PageSuspense></RequireCaptain>} />
              <Route path="/portal/team" element={<PageSuspense><TeamPage /></PageSuspense>} />
              <Route path="/portal/attendance" element={<RequireCaptain><PageSuspense><AttendancePage /></PageSuspense></RequireCaptain>} />
              <Route path="/portal/my-attendance" element={<RequirePlayer><PageSuspense><MyAttendancePage /></PageSuspense></RequirePlayer>} />
              <Route path="/portal/schedule" element={<PageSuspense><SchedulePage /></PageSuspense>} />
              <Route path="/portal/games" element={<PageSuspense><GamesPage /></PageSuspense>} />
              <Route path="/portal/penalties" element={<PageSuspense><PenaltiesPage /></PageSuspense>} />
              <Route path="/portal/media" element={<PageSuspense><MediaPage /></PageSuspense>} />
              <Route path="/portal/announcements" element={<PageSuspense><AnnouncementsPage /></PageSuspense>} />
              <Route path="/portal/settings" element={<RequireCaptain><PageSuspense><SettingsPage /></PageSuspense></RequireCaptain>} />
              <Route path="/portal/profile" element={<RequirePlayer><PageSuspense><ProfilePage /></PageSuspense></RequirePlayer>} />
            </Route>
          </Route>
        </Route>
      </Route>

      {/* Legacy portal paths redirect to the /portal equivalents */}
      <Route path="/dashboard" element={<Navigate to="/portal/dashboard" replace />} />
      <Route path="/captain" element={<Navigate to="/portal/captain" replace />} />
      <Route path="/captain/players" element={<Navigate to="/portal/captain/players" replace />} />
      <Route path="/captain/reports" element={<Navigate to="/portal/captain/reports" replace />} />
      <Route path="/attendance" element={<Navigate to="/portal/attendance" replace />} />
      <Route path="/my-attendance" element={<Navigate to="/portal/my-attendance" replace />} />
      <Route path="/media" element={<Navigate to="/portal/media" replace />} />
      <Route path="/announcements" element={<Navigate to="/portal/announcements" replace />} />
      <Route path="/penalties" element={<Navigate to="/portal/penalties" replace />} />
      <Route path="/settings" element={<Navigate to="/portal/settings" replace />} />
      <Route path="/profile" element={<Navigate to="/portal/profile" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
