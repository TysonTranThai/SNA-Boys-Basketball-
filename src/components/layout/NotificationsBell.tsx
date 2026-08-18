import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, Megaphone, Trophy, Film, Calendar, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { fetchNotifications, fetchReadNotificationIds, markAllNotificationsRead, markNotificationRead } from '@/lib/api'
import { relativeTime } from '@/lib/utils'
import type { AppNotification, NotificationType } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { useTeam } from '@/hooks/useTeam'
import { cn } from '@/lib/utils'

const TYPE_ICON: Record<NotificationType, typeof Megaphone> = {
  announcement: Megaphone,
  media: Film,
  game: Trophy,
  result: Trophy,
  schedule: Calendar,
}

export function NotificationsBell() {
  const { user } = useAuth()
  const { team } = useTeam()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!team || !user) return
    let cancelled = false
    setLoading(true)
    Promise.all([fetchNotifications(team.id), fetchReadNotificationIds(user.id)])
      .then(([notifs, reads]) => {
        if (cancelled) return
        setItems(notifs)
        setReadIds(new Set(reads))
      })
      .catch(() => {
        /* silent — bell is non-critical */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [team, user, open])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unread = items.filter((n) => !readIds.has(n.id)).length

  const handleOpen = (n: AppNotification) => {
    if (user) void markNotificationRead(user.id, n.id).then(() => setReadIds((s) => new Set(s).add(n.id)))
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  const markAll = async () => {
    if (!user) return
    const unreadIds = items.filter((n) => !readIds.has(n.id)).map((n) => n.id)
    await markAllNotificationsRead(user.id, unreadIds)
    setReadIds(new Set(items.map((n) => n.id)))
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Bell className="h-4.5 w-4.5" style={{ height: 18, width: 18 }} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--team-primary)] px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-scale-in absolute right-0 top-11 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="flex items-center gap-1 text-xs font-medium text-[var(--team-primary)] hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            {!loading && items.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">No notifications yet.</p>
            )}
            {!loading &&
              items.map((n) => {
                const Icon = TYPE_ICON[n.type] ?? Megaphone
                const isRead = readIds.has(n.id)
                return (
                  <button
                    key={n.id}
                    onClick={() => handleOpen(n)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60',
                      !isRead && 'bg-[color-mix(in_srgb,var(--team-primary)_4%,transparent)]',
                    )}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-team-soft text-[var(--team-primary)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {n.title}
                      </span>
                      {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500 dark:text-slate-400">{n.body}</span>}
                      <span className="mt-1 block text-[11px] text-slate-400">{relativeTime(n.created_at)}</span>
                    </span>
                    {!isRead && <span className="mt-1.5 ml-auto h-2 w-2 shrink-0 rounded-full bg-[var(--team-primary)]" />}
                  </button>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
