import type { Game, PlayerStat, Profile } from '@/types'
import type { PublicAttendanceSummary } from './api'

export interface SeasonRecord {
  wins: number
  losses: number
  ties: number
  total: number
  winRate: number // 0–100
}

export function seasonRecord(games: Game[]): SeasonRecord {
  const completed = games.filter((g) => g.status === 'completed' && !g.is_friendly)
  const wins = completed.filter((g) => g.result === 'win').length
  const losses = completed.filter((g) => g.result === 'loss').length
  const ties = completed.filter((g) => g.result === 'tie').length
  const total = completed.length
  return { wins, losses, ties, total, winRate: total > 0 ? Math.round((wins / total) * 1000) / 10 : 0 }
}

/** Sport-aware stat categories for the leaderboard. */
export function statCategories(sport: string | null | undefined): string[] {
  const s = (sport ?? '').toLowerCase()
  if (s.includes('basket')) return ['points', 'rebounds', 'assists', 'steals', 'blocks']
  if (s.includes('foot')) return ['goals', 'assists', 'saves']
  if (s.includes('volley')) return ['kills', 'aces', 'digs', 'blocks']
  if (s.includes('soccer')) return ['goals', 'assists', 'clean_sheets']
  return ['points']
}

/** Display labels for stat names. */
export function statLabel(stat: string): string {
  const labels: Record<string, string> = {
    points: 'Points',
    rebounds: 'Rebounds',
    assists: 'Assists',
    steals: 'Steals',
    blocks: 'Blocks',
    goals: 'Goals',
    saves: 'Saves',
    kills: 'Kills',
    aces: 'Aces',
    digs: 'Digs',
    clean_sheets: 'Clean Sheets',
  }
  return labels[stat] ?? stat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function statAbbrev(stat: string): string {
  const abbrev: Record<string, string> = {
    points: 'PPG',
    rebounds: 'RPG',
    assists: 'APG',
    steals: 'SPG',
    blocks: 'BPG',
    goals: 'GPG',
    saves: 'SPG',
    kills: 'KPG',
    aces: 'APG',
    digs: 'DPG',
    clean_sheets: 'CS',
  }
  return abbrev[stat] ?? stat.slice(0, 3).toUpperCase()
}

export interface PlayerStatLine {
  playerId: string
  name: string
  totals: Record<string, number>
  games: number
}

/** Aggregate per-player stat totals from the normalized player_stats table. */
export function aggregatePlayerStats(stats: PlayerStat[], roster: Profile[]): PlayerStatLine[] {
  const byPlayer = new Map<string, PlayerStatLine>()
  for (const s of stats) {
    let line = byPlayer.get(s.player_id)
    if (!line) {
      line = { playerId: s.player_id, name: roster.find((r) => r.id === s.player_id)?.full_name ?? 'Player', totals: {}, games: 0 }
      byPlayer.set(s.player_id, line)
    }
    line.totals[s.stat_name] = (line.totals[s.stat_name] ?? 0) + Number(s.stat_value)
    if (s.game_id) line.games += 1
  }
  // games count = distinct games; approximate via stat rows with game_id
  const distinctGames = new Map<string, Set<string>>()
  for (const s of stats) {
    if (!s.game_id) continue
    const set = distinctGames.get(s.player_id) ?? new Set<string>()
    set.add(s.game_id)
    distinctGames.set(s.player_id, set)
  }
  for (const [pid, set] of distinctGames) {
    const line = byPlayer.get(pid)
    if (line) line.games = set.size
  }
  return [...byPlayer.values()].filter((l) => Object.keys(l.totals).length > 0)
}

export function attendanceRate(rows: PublicAttendanceSummary[]): number {
  const marked = rows.reduce((s, r) => s + r.marked, 0)
  const attended = rows.reduce((s, r) => s + r.present_or_late, 0)
  return marked > 0 ? Math.round((attended / marked) * 1000) / 10 : 0
}
