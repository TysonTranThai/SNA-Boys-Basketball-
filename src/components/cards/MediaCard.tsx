import { useState } from 'react'
import { Play, Image as ImageIcon, Pencil, MoreHorizontal } from 'lucide-react'
import { MEDIA_CATEGORY_META, formatDate, isImageUrl, youtubeEmbedUrl } from '@/lib/utils'
import type { MediaItem } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

interface MediaCardProps {
  item: MediaItem
  onEdit?: () => void
  onDelete?: () => void
}

export function MediaCard({ item, onEdit, onDelete }: MediaCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const meta = MEDIA_CATEGORY_META[item.category]
  const isPhoto = item.category === 'photo' || isImageUrl(item.video_url)
  const embed = !isPhoto ? youtubeEmbedUrl(item.video_url) : null

  return (
    <>
      <div className="card group overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <button
          onClick={() => setPreviewOpen(true)}
          className="relative block aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800"
          aria-label={`Open ${item.title}`}
        >
          {item.thumbnail_url ? (
            <img
              src={item.thumbnail_url}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
              <ImageIcon className="h-10 w-10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <span className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg transition-transform group-hover:scale-110">
            {isPhoto ? <ImageIcon className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </span>
          <Badge className="absolute left-3 top-3 border-black/10 bg-black/50 text-white backdrop-blur">
            {meta.emoji} {meta.label}
          </Badge>
        </button>

        <div className="p-3.5">
          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
          {item.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{item.description}</p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">{formatDate(item.date ?? item.created_at, 'MMM d, yyyy')}</span>
            {(onEdit || onDelete) && (
              <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                {onEdit && (
                  <button onClick={onEdit} aria-label="Edit media" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button onClick={onDelete} aria-label="Delete media" className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title={item.title} size="lg">
        {isPhoto ? (
          <img src={item.video_url} alt={item.title} className="w-full rounded-xl" />
        ) : embed ? (
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            <iframe
              src={embed}
              title={item.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 p-4 text-center dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-300">This media is hosted externally.</p>
            <a
              href={item.video_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm font-semibold text-[var(--team-primary)] hover:underline"
            >
              Open in new tab →
            </a>
          </div>
        )}
        {item.description && (
          <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.description}</p>
        )}
      </Modal>
    </>
  )
}
