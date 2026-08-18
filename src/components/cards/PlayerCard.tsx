import { AlertTriangle, MoreHorizontal, ShieldCheck, Trophy } from 'lucide-react'
import type { PlayerWithStats } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface PlayerCardProps {
  player: PlayerWithStats
  onClick?: () => void
  onMenu?: () => void
  showRole?: boolean
}

export function PlayerCard({ player, onClick, onMenu, showRole }: PlayerCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'card group relative cursor-pointer p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        !player.is_active && 'opacity-50 grayscale',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar name={player.full_name} src={player.photo_url} size="lg" />
          {player.jersey_number != null && (
            <span className="absolute -bottom-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-team px-1 text-[10px] font-bold text-team-contrast ring-2 ring-white dark:ring-slate-900">
              {player.jersey_number}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{player.full_name}</h3>
            {showRole && player.role === 'captain' && (
              <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Trophy className="h-3 w-3" /> Captain
              </Badge>
            )}
            {showRole && player.role === 'coach' && (
              <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <ShieldCheck className="h-3 w-3" /> Coach
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {[player.position, player.grade && `Grade ${player.grade}`].filter(Boolean).join(' · ') || '—'}
          </p>
          {player.lateMarks > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" /> {player.lateMarks} late mark{player.lateMarks > 1 ? 's' : ''}
            </p>
          )}
          {player.height_cm != null && (
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{Math.round(player.height_cm / 2.54)}"</p>
          )}
        </div>
        {onMenu && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMenu()
            }}
            aria-label={`Options for ${player.full_name}`}
            className="rounded-lg p-1.5 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <div>
          <p className="tabular text-sm font-bold text-slate-900 dark:text-slate-100">{player.attendanceRate}%</p>
          <p className="text-[11px] text-slate-400">Attendance</p>
        </div>
        <div className="flex gap-1.5 text-[10px] font-medium">
          <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400">{player.present} ✓</span>
          <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-amber-600 dark:text-amber-400">{player.late} ⏰</span>
          <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-rose-600 dark:text-rose-400">{player.absent} ✕</span>
        </div>
      </div>
    </div>
  )
}
