export type Role = 'captain' | 'player' | 'coach'
export type EventType = 'practice' | 'tournament' | 'friendly' | 'team_event' | 'other'
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'sent_home'
export type GameStatus = 'upcoming' | 'completed' | 'cancelled' | 'postponed'
export type HomeAway = 'home' | 'away' | 'neutral'
export type GameResult = 'win' | 'loss' | 'tie'
export type MediaCategory = 'game' | 'practice' | 'highlight' | 'photo' | 'other'
export type NotificationType = 'announcement' | 'media' | 'game' | 'result' | 'schedule'

export interface Team {
  id: string
  name: string
  sport: string
  season: string | null
  school: string | null
  logo_url: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  invite_code: string
  captain_code: string | null
  /** Public website: this team is the one shown at the SNA homepage. */
  public_visible: boolean
  public_show_stats: boolean
  public_show_attendance: boolean
  public_show_names: boolean
  public_show_jersey: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  auth_user_id: string | null
  team_id: string | null
  role: Role
  full_name: string
  email: string | null
  jersey_number: number | null
  position: string | null
  grade: string | null
  height_cm: number | null
  photo_url: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TeamEvent {
  id: string
  team_id: string
  title: string
  type: EventType
  date: string
  start_time: string | null
  end_time: string | null
  location: string | null
  description: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AttendanceRecord {
  id: string
  team_id: string
  event_id: string
  player_id: string
  status: AttendanceStatus
  minutes_late: number | null
  marked_by: string | null
  marked_at: string
  created_at: string
  updated_at: string
}

export interface Game {
  id: string
  team_id: string
  is_friendly: boolean
  opponent: string
  date: string
  time: string | null
  location: string | null
  home_away: HomeAway
  status: GameStatus
  our_score: number | null
  opponent_score: number | null
  result: GameResult | null
  notes: string | null
  eligible_player_ids: string[]
  created_at: string
  updated_at: string
}

export interface PlayerStat {
  id: string
  team_id: string
  player_id: string
  game_id: string | null
  stat_name: string
  stat_value: number
  created_at: string
  updated_at: string
}

export interface MediaItem {
  id: string
  team_id: string
  title: string
  description: string | null
  category: MediaCategory
  thumbnail_url: string | null
  video_url: string
  date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Announcement {
  id: string
  team_id: string
  title: string
  content: string
  author_id: string | null
  pinned: boolean
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface AppNotification {
  id: string
  team_id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  created_at: string
}

/** A player plus their computed attendance statistics. */
export interface PlayerWithStats extends Profile {
  present: number
  late: number
  absent: number
  excused: number
  sent_home: number
  total: number
  attendanceRate: number // 0–100
  lateMarks: number // accumulated lateness penalty marks
}
