import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Film, Video } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { MediaCard } from '@/components/cards/MediaCard'
import { useTeam } from '@/hooks/useTeam'
import { useTeamData } from '@/hooks/useTeamData'
import { useToast } from '@/hooks/useToast'
import { deleteMedia, upsertMedia } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { MediaCategory, MediaItem } from '@/types'

type Filter = 'all' | MediaCategory

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'game', label: '🏀 Games' },
  { value: 'practice', label: '🏃 Practice' },
  { value: 'highlight', label: '⭐ Highlights' },
  { value: 'photo', label: '📸 Photos' },
  { value: 'other', label: '🎬 Other' },
]

interface MediaForm {
  title: string
  description: string
  category: MediaCategory
  thumbnail_url: string
  video_url: string
  date: string
}

const EMPTY_FORM: MediaForm = {
  title: '',
  description: '',
  category: 'highlight',
  thumbnail_url: '',
  video_url: '',
  date: new Date().toISOString().slice(0, 10),
}

function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export default function MediaPage() {
  const { team, isCaptain } = useTeam()
  const data = useTeamData()
  const { success, error: toastError } = useToast()
  const location = useLocation()

  const [filter, setFilter] = useState<Filter>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MediaItem | null>(null)
  const [form, setForm] = useState<MediaForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<{ title?: string; video_url?: string }>({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null)

  const filtered = useMemo(
    () => (filter === 'all' ? data.media : data.media.filter((m) => m.category === filter)),
    [data.media, filter],
  )

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) })
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (m: MediaItem) => {
    setEditing(m)
    setForm({
      title: m.title,
      description: m.description ?? '',
      category: m.category,
      thumbnail_url: m.thumbnail_url ?? '',
      video_url: m.video_url,
      date: m.date ?? new Date().toISOString().slice(0, 10),
    })
    setErrors({})
    setFormOpen(true)
  }

  useEffect(() => {
    const state = location.state as { openCreate?: boolean } | null
    if (state?.openCreate) openCreate()
  }, [location.state])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!team) return
    const errs: typeof errors = {}
    if (form.title.trim().length < 2) errs.title = 'Give it a title.'
    if (!isHttpUrl(form.video_url.trim())) errs.video_url = 'Enter a valid link (YouTube, Drive, Cloudinary, an image…).'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        thumbnail_url: form.thumbnail_url.trim() || null,
        video_url: form.video_url.trim(),
        date: form.date || null,
      }
      if (editing) {
        await upsertMedia({ ...payload, id: editing.id, team_id: team.id })
        success('Media updated.')
      } else {
        await upsertMedia({ ...payload, team_id: team.id })
        success('Added to Media.')
      }
      setFormOpen(false)
      data.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t save the media item.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteMedia(deleteTarget.id)
      data.refresh()
      setDeleteTarget(null)
      success('Media item deleted.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t delete the media item.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Media"
        subtitle="Highlights, game film, practice clips and photos."
        actions={isCaptain ? <Button onClick={openCreate}><Video className="h-4 w-4" /> Add Media</Button> : undefined}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
              filter === f.value
                ? 'border-transparent bg-team text-team-contrast'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {data.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Film className="h-6 w-6" />}
          title="No media here yet"
          description={isCaptain ? 'Paste a YouTube, Drive or Cloudinary link — no giant files needed.' : 'Your captain hasn’t added any media yet.'}
          action={isCaptain ? <Button onClick={openCreate}><Video className="h-4 w-4" /> Add Media</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <MediaCard
              key={m.id}
              item={m}
              onEdit={isCaptain ? () => openEdit(m) : undefined}
              onDelete={isCaptain ? () => setDeleteTarget(m) : undefined}
            />
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Media' : 'Add Media'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} loading={saving}>{editing ? 'Save Changes' : 'Add Media'}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Title" required error={errors.title} className="sm:col-span-2">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Home opener highlights" />
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as MediaCategory })}>
              <option value="game">🏀 Game</option>
              <option value="practice">🏃 Practice</option>
              <option value="highlight">⭐ Highlight</option>
              <option value="photo">📸 Photo</option>
              <option value="other">🎬 Other</option>
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Video / image URL" required error={errors.video_url} hint="YouTube, Google Drive, Cloudinary or any public image link." className="sm:col-span-2">
            <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" />
          </Field>
          <Field label="Thumbnail URL" hint="Optional — auto-detected for YouTube links." className="sm:col-span-2">
            <Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://…/thumbnail.jpg" />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What's in this clip?" />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Delete media?"
        message={`"${deleteTarget?.title}" will be removed. The original file (on YouTube/Drive) is not affected.`}
      />
    </div>
  )
}
