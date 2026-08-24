import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Calendar, CalendarPlus, History } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { EventCard } from '@/components/cards/EventCard'
import { useTeam } from '@/hooks/useTeam'
import { useTeamData } from '@/hooks/useTeamData'
import { useToast } from '@/hooks/useToast'
import { deleteEvent, upsertEvent } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { EventType, TeamEvent } from '@/types'

type Filter = 'all' | EventType

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'practice', label: '🏀 Practice' },
  { value: 'tournament', label: '🏆 Tournaments' },
  { value: 'friendly', label: '🏅 Friendly Games' },
  { value: 'team_event', label: '🤝 Team Events' },
  { value: 'other', label: '📌 Other' },
]

interface EventForm {
  title: string
  type: EventType
  date: string
  start_time: string
  end_time: string
  location: string
  description: string
  notes: string
}

const EMPTY_FORM: EventForm = {
  title: '',
  type: 'practice',
  date: new Date().toISOString().slice(0, 10),
  start_time: '16:00',
  end_time: '18:00',
  location: '',
  description: '',
  notes: '',
}

export default function SchedulePage() {
  const { team, isCaptain } = useTeam()
  const data = useTeamData()
  const { success, error: toastError } = useToast()
  const location = useLocation()

  const [filter, setFilter] = useState<Filter>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TeamEvent | null>(null)
  const [form, setForm] = useState<EventForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<{ title?: string; date?: string }>({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TeamEvent | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  const filtered = useMemo(
    () => (filter === 'all' ? data.events : data.events.filter((e) => e.type === filter)),
    [data.events, filter],
  )

  const upcoming = useMemo(
    () => filtered.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date) || (a.start_time ?? '').localeCompare(b.start_time ?? '')),
    [filtered, today],
  )
  const past = useMemo(
    () => filtered.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date)),
    [filtered, today],
  )

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) })
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (ev: TeamEvent) => {
    setEditing(ev)
    setForm({
      title: ev.title,
      type: ev.type,
      date: ev.date,
      start_time: ev.start_time?.slice(0, 5) ?? '',
      end_time: ev.end_time?.slice(0, 5) ?? '',
      location: ev.location ?? '',
      description: ev.description ?? '',
      notes: ev.notes ?? '',
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
    if (form.title.trim().length < 2) errs.title = 'Give the event a title.'
    if (!form.date) errs.date = 'Pick a date.'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type,
        date: form.date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        notes: form.notes.trim() || null,
      }
      if (editing) {
        await upsertEvent({ ...payload, id: editing.id, team_id: team.id })
        success('Event updated.')
      } else {
        await upsertEvent({ ...payload, team_id: team.id })
        success('Event added to the schedule.')
      }
      setFormOpen(false)
      data.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t save the event.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteEvent(deleteTarget.id)
      data.refresh()
      setDeleteTarget(null)
      success('Event deleted.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t delete the event.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Schedule"
        subtitle="Practices, tournaments and team events."
        actions={isCaptain ? <Button onClick={openCreate}><CalendarPlus className="h-4 w-4" /> Add Event</Button> : undefined}
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
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-6 w-6" />}
          title="Nothing on the schedule yet"
          description={isCaptain ? 'Add practices and team events so everyone knows where to be.' : 'Your captain hasn’t added any events yet.'}
          action={isCaptain ? <Button onClick={openCreate}><CalendarPlus className="h-4 w-4" /> Add Event</Button> : undefined}
        />
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    onEdit={isCaptain ? () => openEdit(ev) : undefined}
                    onDelete={isCaptain ? () => setDeleteTarget(ev) : undefined}
                  />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <History className="h-3.5 w-3.5" /> Past Events
              </h2>
              <div className="space-y-3 opacity-80">
                {past.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    onEdit={isCaptain ? () => openEdit(ev) : undefined}
                    onDelete={isCaptain ? () => setDeleteTarget(ev) : undefined}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Event form */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Event' : 'Add Event'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} loading={saving}>{editing ? 'Save Changes' : 'Add Event'}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Title" required error={errors.title} className="sm:col-span-2">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Practice — defense" />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EventType })}>
              <option value="practice">🏀 Practice</option>
              <option value="tournament">🏆 Tournament</option>
              <option value="friendly">🏅 Friendly Game</option>
              <option value="team_event">🤝 Team Event</option>
              <option value="other">📌 Other</option>
            </Select>
          </Field>
          <Field label="Date" required error={errors.date}>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Start time">
            <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          </Field>
          <Field label="End time">
            <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </Field>
          <Field label="Location" className="sm:col-span-2">
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="School Gym" />
          </Field>
          <Field label="Description" hint="What will the team focus on?" className="sm:col-span-2">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Defense + transition offense" />
          </Field>
          <Field label="Notes" hint="Only the captain sees these" className="sm:col-span-2">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Bring notebooks — film after drills" />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Delete event?"
        message={`"${deleteTarget?.title}" will be removed from the schedule. Any attendance linked to it will also be removed.`}
      />
    </div>
  )
}
