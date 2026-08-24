import { supabase } from './supabase'
import type {
  Announcement,
  AppNotification,
  AttendanceRecord,
  Game,
  MediaItem,
  PlayerStat,
  Profile,
  Role,
  Team,
  TeamEvent,
} from '@/types'

/** Map Supabase/RPC errors to human-readable messages. Never expose raw SQL. */
export class AppError extends Error {
  code: string | null
  constructor(message: string, code: string | null = null) {
    super(message)
    this.name = 'AppError'
    this.code = code
  }
}

export function friendlyError(error: { message?: string; code?: string } | null, fallback: string): AppError {
  const msg = error?.message ?? ''
  const code = error?.code ?? null

  const known: Record<string, string> = {
    NOT_AUTHENTICATED: 'Please sign in to continue.',
    ALREADY_HAS_TEAM: 'This account already belongs to a team.',
    ALREADY_IN_TEAM: 'This account already belongs to a team.',
    INVITE_INVALID: 'That invite code wasn’t found. Double-check it with your captain.',
    INVALID_CAPTAIN_CODE: 'That captain code isn’t right — ask your captain.',
    NO_CAPTAIN_SPOT: 'This team doesn’t have a captain spot yet.',
    NOT_IN_TEAM: 'Join the team with its code first, then tap the captain.',
    PROFILE_MISSING: 'Your profile is still being created — try again in a moment.',
    FORBIDDEN: 'You don’t have permission to do that.',
    INVALID_ROLE: 'That role isn’t allowed.',
    IDENTITY_TAKEN: 'That spot is already taken — it may be linked to another device. Ask your captain if you need a different one.',
    PLAYER_NOT_FOUND: 'That player wasn’t found on the roster.',
    PLAYER_INACTIVE: 'That player isn’t on the active roster.',
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password. Try again.',
    'auth/invalid-login-credentials': 'Incorrect email or password.',
    'auth/email-already-in-use': 'An account with that email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/rate-limit': 'Too many attempts — please wait a moment and try again.',
    '23505': 'That already exists — check for duplicates.',
    PGRST202:
      'That feature isn’t set up in your database yet — run the latest supabase/migrations/*.sql file in your Supabase SQL Editor, then try again.',
  }

  if (code && known[code]) return new AppError(known[code], code)
  if (msg.includes('new row violates row-level security policy')) {
    return new AppError('You don’t have permission to do that.', 'RLS')
  }
  if (msg.includes('permission denied')) {
    return new AppError('You don’t have permission to do that.', 'PERMISSION_DENIED')
  }
  if (msg.toLowerCase().includes('anonymous sign-ins are disabled')) {
    return new AppError('Anonymous sign-ins are disabled. Ask your captain to enable them in Supabase (Authentication → Providers).', 'ANON_DISABLED')
  }
  const tooMany = msg.match(/^TOO_MANY_ATTEMPTS:(\d+)$/)
  if (tooMany) {
    const mins = Number(tooMany[1])
    return new AppError(
      mins <= 1
        ? 'Too many wrong attempts — try again in 1 minute.'
        : `Too many wrong attempts — try again in ${mins} minutes.`,
      'TOO_MANY_ATTEMPTS',
    )
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return new AppError('Couldn’t reach the server. Check your connection and try again.', 'NETWORK')
  }
  if (msg) return new AppError(msg, code)
  return new AppError(fallback, code)
}

function requireData<T>(data: T | null, fallback: string): T {
  if (!data) throw new AppError(fallback)
  return data
}

/* ------------------------------ auth ---------------------------------- */

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) throw friendlyError(error, 'Couldn’t create your account.')
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw friendlyError(error, 'Couldn’t sign you in.')
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw friendlyError(error, 'Couldn’t sign you out.')
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw friendlyError(error, 'Couldn’t send a reset link.')
}

/* ------------------------- team & roster ------------------------------ */

export async function fetchTeam(teamId: string): Promise<Team> {
  const { data, error } = await supabase.from('teams').select('*').eq('id', teamId).maybeSingle()
  if (error) throw friendlyError(error, 'Couldn’t load your team.')
  return requireData(data, 'Team not found.')
}

export async function updateTeam(teamId: string, patch: Partial<Team>) {
  const { error } = await supabase.from('teams').update(patch).eq('id', teamId)
  if (error) throw friendlyError(error, 'Couldn’t save team settings.')
}

export async function fetchRoster(teamId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('team_id', teamId)
    .order('jersey_number', { ascending: true, nullsFirst: false })
  if (error) throw friendlyError(error, 'Couldn’t load the roster.')
  return data ?? []
}

export async function addPlayer(teamId: string, player: Partial<Profile>) {
  const { data, error } = await supabase.from('profiles').insert({ team_id: teamId, ...player }).select('id').single()
  if (error) throw friendlyError(error, 'Couldn’t add the player.')
  return data as { id: string }
}

export async function updatePlayer(profileId: string, patch: Partial<Profile>) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', profileId)
  if (error) throw friendlyError(error, 'Couldn’t save changes.')
}

export async function setPlayerActive(playerId: string, active: boolean) {
  const { error } = await supabase.rpc('set_player_active', { p_player_id: playerId, p_active: active })
  if (error) throw friendlyError(error, 'Couldn’t update the player.')
}

/** Permanently delete a player and their attendance history (captain only).
    The captain spot itself can never be deleted. */
export async function deletePlayer(playerId: string) {
  const { error } = await supabase.rpc('delete_player', { p_player_id: playerId })
  if (error) {
    if (error.code === 'PGRST202') {
      throw new AppError(
        'Permanent delete isn’t set up yet — run supabase/migrations/0006_delete_player.sql in your Supabase SQL Editor, then try again.',
        'PGRST202',
      )
    }
    throw friendlyError(error, 'Couldn’t delete the player.')
  }
}

export async function setPlayerRole(playerId: string, role: Role) {
  const { error } = await supabase.rpc('set_player_role', { p_player_id: playerId, p_role: role })
  if (error) throw friendlyError(error, 'Couldn’t update the role.')
}

/** Link the signed-in user's account to a roster entry (code-first entry). */
export async function claimRosterIdentity(profileId: string) {
  const { error } = await supabase.rpc('claim_roster_identity', { p_profile_id: profileId })
  if (error) throw friendlyError(error, 'Couldn’t claim that spot.')
}

/** A stable per-browser identifier used for captain-code lockout. It lives in
    localStorage, so clearing the site's storage resets the counter — the same
    trade-off as any cookie-based lockout. */
function getDeviceId(): string {
  const KEY = 'sna_device_id'
  let id = localStorage.getItem(KEY)
  if (!id) {
    // Must call crypto.randomUUID() WITH its receiver — tearing it off and
    // calling it detached throws "TypeError: Illegal invocation".
    try {
      id = crypto.randomUUID()
    } catch {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    }
    localStorage.setItem(KEY, id)
  }
  return id
}

/** Unlock the captain's spot with the team's captain passcode. 3 wrong codes
    on this device trigger a 30-minute lockout, enforced by the database.
    The function returns OK/INVALID/LOCKED (wrong codes aren't exceptions —
    raising would roll back the attempt counter). */
export async function promoteToCaptain(code: string) {
  const { data, error } = await supabase.rpc('promote_to_captain', {
    p_code: code,
    p_device_id: getDeviceId(),
  })
  if (error) {
    if (error.code === 'PGRST202') {
      throw new AppError(
        'Captain access isn’t set up yet — run supabase/migrations/0005_captain_passcode.sql in your Supabase SQL Editor, then try again.',
        'PGRST202',
      )
    }
    throw friendlyError(error, 'Couldn’t verify the captain code.')
  }

  const result = String(data ?? '')
  if (result.startsWith('OK:')) return

  if (result.startsWith('LOCKED:')) {
    const mins = Number(result.split(':')[1]) || 30
    throw new AppError(
      mins <= 1 ? 'Too many wrong attempts — try again in 1 minute.' : `Too many wrong attempts — try again in ${mins} minutes.`,
      'TOO_MANY_ATTEMPTS',
    )
  }

  if (result.startsWith('INVALID:')) {
    const left = Number(result.split(':')[1])
    throw new AppError(
      left === 1
        ? 'That captain code isn’t right — 1 try left before a 30-minute lockout.'
        : `That captain code isn’t right — ${left} tries left before a 30-minute lockout.`,
      'INVALID_CAPTAIN_CODE',
    )
  }

  throw new AppError('Couldn’t verify the captain code.', 'UNKNOWN')
}

/* --------------------------- attendance -------------------------------- */

export async function fetchAttendance(teamId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('team_id', teamId)
  if (error) throw friendlyError(error, 'Couldn’t load attendance.')
  return data ?? []
}

export async function saveAttendance(
  teamId: string,
  rows: { event_id: string; player_id: string; status: AttendanceRecord['status']; minutes_late?: number | null }[],
) {
  const { error } = await supabase
    .from('attendance')
    .upsert(
      rows.map((r) => ({ team_id: teamId, ...r, marked_at: new Date().toISOString() })),
      { onConflict: 'event_id,player_id' },
    )
  if (error) throw friendlyError(error, 'Couldn’t save attendance.')
}

export async function clearAttendance(teamId: string, eventId: string) {
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('team_id', teamId)
    .eq('event_id', eventId)
  if (error) throw friendlyError(error, 'Couldn’t clear attendance.')
}

/* ------------------------------ events -------------------------------- */

export async function fetchEvents(teamId: string): Promise<TeamEvent[]> {
  const { data, error } = await supabase.from('events').select('*').eq('team_id', teamId).order('date')
  if (error) throw friendlyError(error, 'Couldn’t load the schedule.')
  return data ?? []
}

export async function upsertEvent(event: Partial<TeamEvent> & { team_id: string }) {
  const { error } = await supabase.from('events').upsert(event)
  if (error) throw friendlyError(error, 'Couldn’t save the event.')
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw friendlyError(error, 'Couldn’t delete the event.')
}

/* ------------------------------- games -------------------------------- */

export async function fetchGames(teamId: string): Promise<Game[]> {
  // Include the eligible-player roster (game_players junction) so game cards
  // can show who is allowed to play. If the junction table isn't reachable
  // yet (missing RLS or migration not applied), fall back to plain games so
  // the rest of the portal keeps working.
  const { data, error } = await supabase
    .from('games')
    .select('*, game_players(player_id)')
    .eq('team_id', teamId)
    .order('date')
  if (error) {
    // PGRST200 = relationship not found; 42P01 = table missing; permission
    // errors mean the join's RLS isn't set up. In any case, try without it.
    const { data: plain, error: plainErr } = await supabase
      .from('games')
      .select('*')
      .eq('team_id', teamId)
      .order('date')
    if (plainErr) throw friendlyError(plainErr, 'Couldn’t load games.')
    return (plain ?? []).map((g) => ({ ...g, eligible_player_ids: [] }))
  }
  return (data ?? []).map((g) => ({
    ...g,
    eligible_player_ids: (g.game_players ?? []).map((r: { player_id: string }) => r.player_id),
  }))
}

export async function upsertGame(game: Partial<Game> & { team_id: string }): Promise<{ id: string } | null> {
  const { data, error } = await supabase.from('games').upsert(game).select('id').single()
  if (error) throw friendlyError(error, 'Couldn’t save the game.')
  return data as { id: string } | null
}

export async function setGamePlayers(gameId: string, playerIds: string[]) {
  // Replace the eligibility list (delete-then-insert keeps the junction simple
  // and is safe under the captain-only RLS policies).
  const { error: delErr } = await supabase.from('game_players').delete().eq('game_id', gameId)
  if (delErr) throw friendlyError(delErr, 'Couldn’t update the eligible players.')
  if (playerIds.length === 0) return
  const { error: insErr } = await supabase
    .from('game_players')
    .insert(playerIds.map((playerId) => ({ game_id: gameId, player_id: playerId })))
  if (insErr) throw friendlyError(insErr, 'Couldn’t update the eligible players.')
}

export async function deleteGame(id: string) {
  const { error } = await supabase.from('games').delete().eq('id', id)
  if (error) throw friendlyError(error, 'Couldn’t delete the game.')
}

/* ---------------------------- player stats ----------------------------- */

export async function fetchPlayerStatsForGame(gameId: string): Promise<PlayerStat[]> {
  const { data, error } = await supabase.from('player_stats').select('*').eq('game_id', gameId)
  if (error) throw friendlyError(error, 'Couldn’t load player stats.')
  return (data ?? []) as PlayerStat[]
}

/** Captain-only: replace a game's player-stat rows (normalized, sport-agnostic). */
export async function savePlayerStatsForGame(
  gameId: string,
  teamId: string,
  rows: { player_id: string; stat_name: string; stat_value: number }[],
) {
  if (rows.length === 0) return
  const { error } = await supabase
    .from('player_stats')
    .upsert(
      rows.map((r) => ({ game_id: gameId, team_id: teamId, player_id: r.player_id, stat_name: r.stat_name, stat_value: r.stat_value })),
      { onConflict: 'player_id,game_id,stat_name' },
    )
  if (error) throw friendlyError(error, 'Couldn’t save player stats.')
}

/* --------------------------- public website ---------------------------- */

/** The team marked as the public SNA website team (anon-safe via RLS). */
export async function fetchPublicTeam(): Promise<Team | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('public_visible', true)
    .order('created_at')
    .limit(1)
    .maybeSingle()
  if (error) throw friendlyError(error, 'Couldn’t load the public team.')
  return data as Team | null
}

export async function fetchPublicGames(teamId: string): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('team_id', teamId)
    .order('date', { ascending: true })
  if (error) throw friendlyError(error, 'Couldn’t load games.')
  return (data ?? []) as Game[]
}

export async function fetchPublicEvents(teamId: string): Promise<TeamEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id, team_id, title, type, date, start_time, end_time, location')
    .eq('team_id', teamId)
    .order('date', { ascending: true })
  if (error) throw friendlyError(error, 'Couldn’t load the schedule.')
  return (data ?? []) as TeamEvent[]
}

export async function fetchPublicMedia(teamId: string): Promise<MediaItem[]> {
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
  if (error) throw friendlyError(error, 'Couldn’t load highlights.')
  return (data ?? []) as MediaItem[]
}

/** Public roster — via the view that strips email/phone/account fields. */
export async function fetchPublicRoster(teamId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('public_roster')
    .select('*')
    .eq('team_id', teamId)
    .order('jersey_number', { ascending: true, nullsFirst: false })
  if (error) throw friendlyError(error, 'Couldn’t load the team.')
  return (data ?? []) as Profile[]
}

export async function fetchPublicPlayerStats(teamId: string): Promise<PlayerStat[]> {
  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .eq('team_id', teamId)
  if (error) throw friendlyError(error, 'Couldn’t load player stats.')
  return (data ?? []) as PlayerStat[]
}

export interface PublicAttendanceSummary {
  player_id: string
  full_name: string
  photo_url: string | null
  marked: number
  present_or_late: number
  late: number
  rate: number | null
}

export async function fetchPublicAttendanceSummary(_teamId: string): Promise<PublicAttendanceSummary[]> {
  // The view is scoped to the public team; order by rate desc here.
  const { data, error } = await supabase
    .from('public_attendance_summary')
    .select('*')
    .order('rate', { ascending: false, nullsFirst: false })
  if (error) throw friendlyError(error, 'Couldn’t load attendance leaders.')
  return (data ?? []) as PublicAttendanceSummary[]
}

/* ------------------------------- media -------------------------------- */

export async function fetchMedia(teamId: string): Promise<MediaItem[]> {
  const { data, error } = await supabase.from('media').select('*').eq('team_id', teamId).order('created_at', { ascending: false })
  if (error) throw friendlyError(error, 'Couldn’t load media.')
  return data ?? []
}

export async function upsertMedia(item: Partial<MediaItem> & { team_id: string }) {
  const { error } = await supabase.from('media').upsert(item)
  if (error) throw friendlyError(error, 'Couldn’t save the media item.')
}

export async function deleteMedia(id: string) {
  const { error } = await supabase.from('media').delete().eq('id', id)
  if (error) throw friendlyError(error, 'Couldn’t delete the media item.')
}

/* --------------------------- announcements ----------------------------- */

export async function fetchAnnouncements(teamId: string): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('team_id', teamId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw friendlyError(error, 'Couldn’t load announcements.')
  return data ?? []
}

export async function upsertAnnouncement(item: Partial<Announcement> & { team_id: string }) {
  const { error } = await supabase.from('announcements').upsert(item)
  if (error) throw friendlyError(error, 'Couldn’t save the announcement.')
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) throw friendlyError(error, 'Couldn’t delete the announcement.')
}

/* ---------------------------- notifications ---------------------------- */

export async function fetchNotifications(teamId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw friendlyError(error, 'Couldn’t load notifications.')
  return data ?? []
}

export async function fetchReadNotificationIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('notification_reads')
    .select('notification_id')
    .eq('user_id', userId)
  if (error) throw friendlyError(error, 'Couldn’t load notifications.')
  return (data ?? []).map((r) => r.notification_id as string)
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const { error } = await supabase
    .from('notification_reads')
    .insert({ user_id: userId, notification_id: notificationId })
  if (error && error.code !== '23505') throw friendlyError(error, 'Couldn’t update notifications.')
}

export async function markAllNotificationsRead(userId: string, notificationIds: string[]) {
  if (notificationIds.length === 0) return
  const { error } = await supabase
    .from('notification_reads')
    .insert(notificationIds.map((id) => ({ user_id: userId, notification_id: id })))
  if (error && error.code !== '23505') throw friendlyError(error, 'Couldn’t update notifications.')
}
