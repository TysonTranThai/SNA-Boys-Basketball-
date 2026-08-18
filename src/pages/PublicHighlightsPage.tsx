import { useState } from 'react'
import { Film, Play, X } from 'lucide-react'
import { usePublicData } from '@/hooks/usePublicData'
import { MediaThumb, SectionTitle } from './HomePage'
import { setSnaTitle } from '@/lib/brand'
import { cn, formatDate } from '@/lib/utils'
import type { MediaItem } from '@/types'

const CATEGORIES = ['All', 'Highlights', 'Games', 'Practice', 'Team', 'Photos'] as const

function VideoModal({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-white">{item.title}</p>
            {item.category && <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.category}</p>}
          </div>
          <button onClick={onClose} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {item.video_url ? (
          <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
            <iframe src={item.video_url} title={item.title} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          </div>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-slate-900">
            <Film className="h-12 w-12 text-slate-600" />
          </div>
        )}
        {item.description && <p className="mt-3 text-sm text-slate-300">{item.description}</p>}
      </div>
    </div>
  )
}

export default function PublicHighlightsPage() {
  const { media, loading } = usePublicData()
  const [category, setCategory] = useState<string>('All')
  const [active, setActive] = useState<MediaItem | null>(null)
  setSnaTitle('Highlights')

  const filtered = category === 'All' ? media : media.filter((m) => m.category === category)

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-56 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-video rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <SectionTitle kicker="Media" title="Highlights" />

      {media.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center">
          <Play className="h-8 w-8 text-slate-300" />
          <p className="font-semibold">No highlights yet</p>
          <p className="text-sm text-slate-400">Game clips and practice moments will appear here.</p>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
                  category === c
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
                )}
              >
                {c}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No {category.toLowerCase()} media yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((m) => (
                <button key={m.id} onClick={() => setActive(m)} className="block text-left">
                  <MediaThumb media={m} className="aspect-video" />
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{m.title}</p>
                  {m.date && <p className="text-xs text-slate-400">{formatDate(m.date)}</p>}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {active && <VideoModal item={active} onClose={() => setActive(null)} />}
    </div>
  )
}
