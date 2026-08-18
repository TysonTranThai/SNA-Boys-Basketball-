import { Pin, Pencil, Trash2, Megaphone } from 'lucide-react'
import { relativeTime } from '@/lib/utils'
import type { Announcement } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'

interface AnnouncementCardProps {
  announcement: Announcement
  authorName?: string
  authorPhoto?: string | null
  canManage?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export function AnnouncementCard({
  announcement,
  authorName,
  authorPhoto,
  canManage,
  onEdit,
  onDelete,
}: AnnouncementCardProps) {
  return (
    <article
      className={cn(
        'card animate-fade-in-up relative p-5 transition-all duration-200 hover:shadow-md',
        announcement.pinned && 'border-[var(--team-primary)]/40 ring-1 ring-[color-mix(in_srgb,var(--team-primary)_15%,transparent)]',
      )}
    >
      {announcement.pinned && (
        <span className="absolute -top-2.5 left-4 flex items-center gap-1 rounded-full bg-team px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-team-contrast shadow-sm">
          <Pin className="h-3 w-3" /> Pinned
        </span>
      )}
      <div className="flex items-start gap-3">
        <Avatar name={authorName ?? 'Captain'} src={authorPhoto} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{announcement.title}</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            {authorName ? `${authorName} · ` : ''}
            {relativeTime(announcement.created_at)}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              aria-label="Edit announcement"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              aria-label="Delete announcement"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {announcement.image_url && (
        <img src={announcement.image_url} alt="" className="mt-3 w-full rounded-xl object-cover" style={{ maxHeight: 240 }} loading="lazy" />
      )}

      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {announcement.content}
      </p>
      {canManage && (
        <p className="mt-3 flex items-center gap-1 text-[11px] text-slate-400">
          <Megaphone className="h-3 w-3" /> Posted to the whole team
        </p>
      )}
    </article>
  )
}
