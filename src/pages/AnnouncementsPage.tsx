import { useEffect, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Megaphone, Pin, PinOff } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { AnnouncementCard } from '@/components/cards/AnnouncementCard'
import { useTeam } from '@/hooks/useTeam'
import { useTeamData } from '@/hooks/useTeamData'
import { useToast } from '@/hooks/useToast'
import { deleteAnnouncement, upsertAnnouncement } from '@/lib/api'
import type { Announcement } from '@/types'

interface AnnouncementForm {
  title: string
  content: string
  pinned: boolean
  image_url: string
}

const EMPTY_FORM: AnnouncementForm = { title: '', content: '', pinned: false, image_url: '' }

export default function AnnouncementsPage() {
  const { team, isCaptain, profile } = useTeam()
  const data = useTeamData()
  const { success, error: toastError } = useToast()
  const location = useLocation()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [form, setForm] = useState<AnnouncementForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)

  const authorById = new Map(data.players.map((p) => [p.id, p]))

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (a: Announcement) => {
    setEditing(a)
    setForm({ title: a.title, content: a.content, pinned: a.pinned, image_url: a.image_url ?? '' })
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
    if (form.title.trim().length < 2) errs.title = 'Give the announcement a title.'
    if (form.content.trim().length < 2) errs.content = 'Write something for the team.'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        pinned: form.pinned,
        image_url: form.image_url.trim() || null,
        author_id: profile?.id ?? null,
      }
      if (editing) {
        await upsertAnnouncement({ ...payload, id: editing.id, team_id: team.id })
        success('Announcement updated.')
      } else {
        await upsertAnnouncement({ ...payload, team_id: team.id })
        success('Announcement posted to the team. 🔔')
      }
      setFormOpen(false)
      data.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t post the announcement.')
    } finally {
      setSaving(false)
    }
  }

  const togglePin = async (a: Announcement) => {
    if (!team) return
    try {
      await upsertAnnouncement({ id: a.id, team_id: team.id, pinned: !a.pinned })
      data.refresh()
      success(a.pinned ? 'Unpinned.' : 'Pinned to the top. 📌')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t update the announcement.')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteAnnouncement(deleteTarget.id)
      data.refresh()
      setDeleteTarget(null)
      success('Announcement deleted.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t delete the announcement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Team updates, all in one place."
        actions={isCaptain ? <Button onClick={openCreate}><Megaphone className="h-4 w-4" /> Post Announcement</Button> : undefined}
      />

      {data.loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : data.announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-6 w-6" />}
          title="No announcements yet"
          description={isCaptain ? 'Post the first update — schedule changes, game day info, anything the team needs to know.' : 'Your captain hasn’t posted anything yet.'}
          action={isCaptain ? <Button onClick={openCreate}><Megaphone className="h-4 w-4" /> Post Announcement</Button> : undefined}
        />
      ) : (
        <div className="mx-auto max-w-2xl space-y-4">
          {data.announcements.map((a) => {
            const author = a.author_id ? authorById.get(a.author_id) : undefined
            return (
              <div key={a.id}>
                <AnnouncementCard
                  announcement={a}
                  authorName={author?.full_name}
                  authorPhoto={author?.photo_url}
                  canManage={isCaptain}
                  onEdit={isCaptain ? () => openEdit(a) : undefined}
                  onDelete={isCaptain ? () => setDeleteTarget(a) : undefined}
                />
                {isCaptain && (
                  <div className="mt-1 flex justify-end">
                    <button
                      onClick={() => togglePin(a)}
                      className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {a.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                      {a.pinned ? 'Unpin' : 'Pin to top'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Announcement' : 'Post Announcement'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} loading={saving}>{editing ? 'Save Changes' : 'Post'}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field label="Title" required error={errors.title}>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Practice time changed" />
          </Field>
          <Field label="Message" required error={errors.content}>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Tomorrow's practice will start at 5 PM instead of 4 PM…"
              className="min-h-[120px]"
            />
          </Field>
          <Field label="Image URL" hint="Optional">
            <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…/photo.jpg" />
          </Field>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Pin to top</p>
              <p className="text-xs text-slate-400">Important announcements stay at the top of the feed.</p>
            </div>
            <Toggle checked={form.pinned} onChange={(v) => setForm({ ...form, pinned: v })} label="Pin announcement" />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Delete announcement?"
        message={`"${deleteTarget?.title}" will be removed for the whole team.`}
      />
    </div>
  )
}
