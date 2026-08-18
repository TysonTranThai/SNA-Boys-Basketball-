import { Check, Clock, Home, Minus, X } from 'lucide-react'
import { ATTENDANCE_META, cn } from '@/lib/utils'
import type { AttendanceStatus } from '@/types'
import { Badge } from '@/components/ui/Badge'

export function AttendanceBadge({ status, className }: { status: AttendanceStatus; className?: string }) {
  const meta = ATTENDANCE_META[status]
  return (
    <Badge className={cn('border', meta.bg, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </Badge>
  )
}

const STATUS_ACTIONS: { status: AttendanceStatus; label: string; icon: typeof Check; active: string }[] = [
  {
    status: 'present',
    label: 'Present',
    icon: Check,
    active: 'border-emerald-500 bg-emerald-500 text-white shadow-sm',
  },
  {
    status: 'late',
    label: 'Late',
    icon: Clock,
    active: 'border-amber-500 bg-amber-500 text-white shadow-sm',
  },
  {
    status: 'absent',
    label: 'Absent',
    icon: X,
    active: 'border-rose-500 bg-rose-500 text-white shadow-sm',
  },
  {
    status: 'excused',
    label: 'Excused',
    icon: Minus,
    active: 'border-slate-500 bg-slate-500 text-white shadow-sm',
  },
  {
    status: 'sent_home',
    label: 'Sent home',
    icon: Home,
    active: 'border-orange-500 bg-orange-500 text-white shadow-sm',
  },
]

interface AttendanceStatusButtonsProps {
  value: AttendanceStatus | null
  onChange: (status: AttendanceStatus) => void
  size?: 'sm' | 'md'
}

/** Compact segmented control for quickly marking attendance. */
export function AttendanceStatusButtons({ value, onChange, size = 'md' }: AttendanceStatusButtonsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUS_ACTIONS.map(({ status, label, icon: Icon, active }) => {
        const selected = value === status
        return (
          <button
            key={status}
            type="button"
            onClick={() => onChange(status)}
            aria-pressed={selected}
            aria-label={label}
            title={label}
            className={cn(
              'flex items-center justify-center gap-1 rounded-lg border font-semibold transition-all duration-150 active:scale-95',
              size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-10 flex-1 min-w-[76px] px-2 text-sm',
              selected
                ? active
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
            )}
          >
            {selected && <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
            {size === 'md' && label}
          </button>
        )
      })}
    </div>
  )
}
