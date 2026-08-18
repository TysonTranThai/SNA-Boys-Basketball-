import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isTomorrow, parseISO } from 'date-fns'
import type { AttendanceStatus, GameResult, MediaCategory, EventType } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/* --------------------------- lateness penalties ------------------------- */

/** Lateness → immediate penalty (captain applies when marking attendance). */
export const LATE_TIERS: {
  minutes: number
  label: string
  laps: number
  marks: number
  note?: string
}[] = [
  { minutes: 5, label: '5 min late', laps: 3, marks: 0 },
  { minutes: 10, label: '10 min late', laps: 5, marks: 1 },
  { minutes: 15, label: '15 min late', laps: 5, marks: 3 },
  { minutes: 20, label: '20+ min late', laps: 0, marks: 5, note: 'Go home — don’t bother coming :)' },
]

/** Accumulated late marks → consequence. Sorted lowest → highest threshold. */
export const MARK_PENALTIES: { marks: number; consequence: string }[] = [
  { marks: 4, consequence: 'Sit on the bench for one quarter of any game' },
  { marks: 6, consequence: 'Sit on the bench for half of any game' },
  { marks: 10, consequence: 'Not allowed in friendly matches or school-organized games' },
  { marks: 15, consequence: 'Not allowed in tournaments organized by the school or any other party' },
]

/** Late marks for a single lateness record (matches the DB function). */
export function lateMarksFor(minutesLate: number | null | undefined): number {
  if (minutesLate == null || minutesLate < 10) return 0
  if (minutesLate < 15) return 1
  if (minutesLate < 20) return 3
  return 5
}

/** Total late marks for a player across their attendance records. */
export function totalLateMarks(records: { status: AttendanceStatus; minutes_late: number | null }[]): number {
  return records.reduce((sum, r) => {
    if (r.status === 'late') return sum + lateMarksFor(r.minutes_late)
    if (r.status === 'sent_home') return sum + 5
    return sum
  }, 0)
}

/** Highest consequence a mark total has reached, or null if none. */
export function markConsequence(marks: number): string | null {
  let hit: string | null = null
  for (const p of MARK_PENALTIES) if (marks >= p.marks) hit = p.consequence
  return hit
}

/* ----------------------------- formatting ------------------------------ */

export function formatTime(time: string | null | undefined): string {
  if (!time) return ''
  const [h, m] = time.slice(0, 5).split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return time
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hour} ${period}` : `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export function formatDate(date: string | null | undefined, pattern = 'MMM d, yyyy'): string {
  if (!date) return ''
  try {
    return format(parseISO(date), pattern)
  } catch {
    return date
  }
}

export function relativeTime(date: string | null | undefined): string {
  if (!date) return ''
  try {
    return formatDistanceToNow(parseISO(date), { addSuffix: true })
  } catch {
    return ''
  }
}

/** "Today" / "Tomorrow" / "Aug 20" */
export function dayLabel(date: string): string {
  const d = parseISO(date)
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'EEE, MMM d')
}

export function shortDayLabel(date: string): string {
  const d = parseISO(date)
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'MMM d')
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`)
}

export function percent(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

/* --------------------------- attendance meta --------------------------- */

export const ATTENDANCE_META: Record<
  AttendanceStatus,
  { label: string; short: string; dot: string; text: string; bg: string; ring: string }
> = {
  present: {
    label: 'Present',
    short: '✓',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    ring: 'ring-emerald-500/40',
  },
  late: {
    label: 'Late',
    short: '⏰',
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    ring: 'ring-amber-500/40',
  },
  sent_home: {
    label: 'Sent home',
    short: '🏠',
    dot: 'bg-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    ring: 'ring-orange-500/40',
  },
  absent: {
    label: 'Absent',
    short: '✕',
    dot: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    ring: 'ring-rose-500/40',
  },
  excused: {
    label: 'Excused',
    short: '—',
    dot: 'bg-slate-400',
    text: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20',
    ring: 'ring-slate-500/40',
  },
}

export const GAME_RESULT_META: Record<GameResult, { label: string; badge: string; text: string }> = {
  win: { label: 'Win', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' },
  loss: { label: 'Loss', badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', text: 'text-rose-600 dark:text-rose-400' },
  tie: { label: 'Tie', badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20', text: 'text-slate-600 dark:text-slate-300' },
}

export const EVENT_TYPE_META: Record<EventType, { label: string; icon: string }> = {
  practice: { label: 'Practice', icon: '🏀' },
  tournament: { label: 'Tournament', icon: '🏆' },
  team_event: { label: 'Team Event', icon: '🤝' },
  other: { label: 'Event', icon: '📌' },
}

export const MEDIA_CATEGORY_META: Record<MediaCategory, { label: string; emoji: string }> = {
  game: { label: 'Game', emoji: '🏀' },
  practice: { label: 'Practice', emoji: '🏃' },
  highlight: { label: 'Highlights', emoji: '⭐' },
  photo: { label: 'Photos', emoji: '📸' },
  other: { label: 'Other', emoji: '🎬' },
}

/* ------------------------------ colors -------------------------------- */

/** Convert hex to rgb tuple, or null if not a hex color. */
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!m) return null
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}

/** Lighten (amt > 0) or darken (amt < 0) a hex color. */
export function shadeColor(hex: string, amt: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)))
  const [r, g, b] = rgb
  if (amt >= 0) {
    return `rgb(${clamp(r + (255 - r) * amt)}, ${clamp(g + (255 - g) * amt)}, ${clamp(b + (255 - b) * amt)})`
  }
  return `rgb(${clamp(r * (1 + amt))}, ${clamp(g * (1 + amt))}, ${clamp(b * (1 + amt))})`
}

/** Contrasting readable text color (white or dark) for a given background. */
export function contrastText(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#ffffff'
  const [r, g, b] = rgb
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#0f172a' : '#ffffff'
}

/** Parse a YouTube URL (watch / youtu.be / shorts) into a video id, or null. */
export function youtubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export function youtubeEmbedUrl(url: string): string | null {
  const id = youtubeId(url)
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
}

/** Google Drive share link → preview/embed URL. */
export function driveEmbedUrl(url: string): string | null {
  const m = url.match(/\/file\/d\/([A-Za-z0-9_-]+)/)
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`
  return null
}

export function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|avif)(\?.*)?$/i.test(url) || /images\.unsplash\.com/.test(url)
}
