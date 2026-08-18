import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800', className)}
      aria-hidden="true"
    />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="card p-5">
      <Skeleton className="mb-3 h-4 w-20" />
      <Skeleton className="h-8 w-16" />
    </div>
  )
}

export function ListSkeleton({ rows = 4, height = 'h-16' }: { rows?: number; height?: string }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn('w-full', height)} />
      ))}
    </div>
  )
}
