import { BarChart3, Calendar, MapPin, MoreHorizontal, Pencil, Trophy } from 'lucide-react'
import { GAME_RESULT_META, formatTime, shortDayLabel } from '@/lib/utils'
import type { Game } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface GameCardProps {
  game: Game
  onEdit?: () => void
  onDelete?: () => void
  onStats?: () => void
}

export function GameCard({ game, onEdit, onDelete, onStats }: GameCardProps) {
  const completed = game.status === 'completed'
  const resultMeta = game.result ? GAME_RESULT_META[game.result] : null
  const isUpcoming = game.status === 'upcoming'

  return (
    <div className={cn('card overflow-hidden transition-all duration-200 hover:shadow-md', !isUpcoming && game.status !== 'completed' && 'opacity-60')}>
      {/* Top accent strip */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-2 text-[11px] font-bold uppercase tracking-wider',
          game.status === 'completed'
            ? game.result === 'win'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            : 'bg-team-soft text-[var(--team-primary)]',
        )}
      >
        <span>
          {game.status === 'completed' ? (resultMeta ? `${resultMeta.label.toUpperCase()}${game.result === 'win' ? ' 🏆' : ''}` : 'FINAL') : game.status === 'cancelled' ? 'CANCELLED' : game.status === 'postponed' ? 'POSTPONED' : 'UPCOMING'}
        </span>
        <span className="capitalize">{game.home_away}</span>
      </div>

      <div className="flex items-center gap-4 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Trophy className={cn('h-4 w-4 shrink-0', isUpcoming ? 'text-[var(--team-primary)]' : 'text-slate-300 dark:text-slate-600')} />
            <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">VS {game.opponent}</h3>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {shortDayLabel(game.date)}
              {game.time && <span> · {formatTime(game.time)}</span>}
            </span>
            {game.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {game.location}
              </span>
            )}
          </div>
          {game.eligible_player_ids && game.eligible_player_ids.length > 0 && (
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
              <span className="font-medium text-slate-500 dark:text-slate-400">{game.eligible_player_ids.length} player{game.eligible_player_ids.length === 1 ? '' : 's'}</span> eligible to play
            </p>
          )}
        </div>

        {completed && game.our_score != null && game.opponent_score != null ? (
          <div className="text-right">
            <p className={cn('tabular text-2xl font-black tracking-tight', resultMeta?.text ?? '')}>
              {game.our_score}
              <span className="mx-1 text-sm font-semibold text-slate-400">–</span>
              {game.opponent_score}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{resultMeta?.label ?? 'Final'}</p>
          </div>
        ) : (
          <Badge className="border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            {game.status === 'upcoming' ? 'Not played' : game.status}
          </Badge>
        )}

        {(onEdit || onDelete || onStats) && (
          <div className="flex flex-col gap-1">
            {completed && onStats && (
              <button onClick={onStats} aria-label="Enter player stats" title="Player stats" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[var(--team-primary)] dark:hover:bg-slate-800">
                <BarChart3 className="h-3.5 w-3.5" />
              </button>
            )}
            {onEdit && (
              <button onClick={onEdit} aria-label="Edit game" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} aria-label="Delete game" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
