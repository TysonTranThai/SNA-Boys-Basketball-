import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  accent?: boolean
  className?: string
}

export function StatCard({ label, value, sub, icon, accent, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'card relative overflow-hidden p-5',
        accent && 'bg-team text-team-contrast border-transparent',
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'absolute right-4 top-4 opacity-15',
            accent ? 'text-white' : 'text-[var(--team-primary)]',
          )}
        >
          {icon}
        </div>
      )}
      <p className={cn('text-xs font-medium uppercase tracking-wide', accent ? 'text-white/80' : 'text-slate-500 dark:text-slate-400')}>
        {label}
      </p>
      <p className={cn('tabular mt-1.5 text-3xl font-bold tracking-tight', accent ? 'text-white' : 'text-slate-900 dark:text-white')}>
        {value}
      </p>
      {sub && (
        <p className={cn('mt-1 text-xs', accent ? 'text-white/80' : 'text-slate-500 dark:text-slate-400')}>{sub}</p>
      )}
    </div>
  )
}
