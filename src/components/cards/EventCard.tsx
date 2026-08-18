import { MapPin, MoreHorizontal, Pencil } from 'lucide-react'
import { EVENT_TYPE_META, dayLabel, formatTime } from '@/lib/utils'
import type { TeamEvent } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface EventCardProps {
  event: TeamEvent
  onEdit?: () => void
  onDelete?: () => void
}

export function EventCard({ event, onEdit, onDelete }: EventCardProps) {
  const meta = EVENT_TYPE_META[event.type]
  return (
    <div className="card group flex items-start gap-4 p-4 transition-all duration-200 hover:shadow-md">
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-team-soft text-[var(--team-primary)]">
        <span className="text-lg leading-none">{meta.icon}</span>
        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide">{event.type === 'practice' ? 'Practice' : event.type === 'tournament' ? 'Tourn.' : 'Event'}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{event.title}</h3>
            <p className="mt-0.5 text-xs font-medium text-[var(--team-primary)]">
              {dayLabel(event.date)}
              {event.start_time && <span className="text-slate-500 dark:text-slate-400"> · {formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}</span>}
            </p>
          </div>
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
              {onEdit && (
                <button onClick={onEdit} aria-label="Edit event" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <button onClick={onDelete} aria-label="Delete event" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
        {event.location && (
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="h-3 w-3" /> {event.location}
          </p>
        )}
        {event.description && <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{event.description}</p>}
      </div>
    </div>
  )
}

export function EventTypeBadge({ type }: { type: TeamEvent['type'] }) {
  const meta = EVENT_TYPE_META[type]
  return (
    <Badge className={cn('border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300')}>
      {meta.icon} {meta.label}
    </Badge>
  )
}
