import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Crown, Search, ShieldCheck, Trash2, UserPlus, UserX } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Field } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { PlayerCard } from '@/components/cards/PlayerCard'
import { useTeam } from '@/hooks/useTeam'
import { useTeamData } from '@/hooks/useTeamData'
import { useToast } from '@/hooks/useToast'
import { addPlayer, deletePlayer, setPlayerActive, setPlayerRole, updatePlayer } from '@/lib/api'
import { PhotoUpload } from '@/components/ui/PhotoUpload'
import { percent, jerseyTakenBy } from '@/lib/utils'
import type { PlayerWithStats, Role } from '@/types'

interface PlayerForm {
  full_name: string
  jersey_number: string
  position: string
  grade: string
  height_cm: string
  email: string
  photo_url: string
  role: Role
}

const EMPTY_FORM: PlayerForm = {
  full_name: '',
  jersey_number: '',
  position: '',
  grade: '',
  height_cm: '',
  email: '',
  photo_url: '',
  role: 'player',
}

export default function TeamPage() {
  const { team, isCaptain } = useTeam()
  const data = useTeamData()
  const { success, error: toastError } = useToast()
  const location = useLocation()

  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<PlayerWithStats | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PlayerWithStats | null>(null)
  const [form, setForm] = useState<PlayerForm>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<{ full_name?: string; jersey_number?: string }>({})
  const [saving, setSaving] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<PlayerWithStats | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PlayerWithStats | null>(null)
  const [roleTarget, setRoleTarget] = useState<PlayerWithStats | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data.players
    return data.players.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        (p.position ?? '').toLowerCase().includes(q) ||
        String(p.jersey_number ?? '').includes(q),
    )
  }, [data.players, query])

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setFormOpen(true)
  }

  const openEdit = (p: PlayerWithStats) => {
    setEditing(p)
    setForm({
      full_name: p.full_name,
      jersey_number: p.jersey_number != null ? String(p.jersey_number) : '',
      position: p.position ?? '',
      grade: p.grade ?? '',
      height_cm: p.height_cm != null ? String(p.height_cm) : '',
      email: p.email ?? '',
      photo_url: p.photo_url ?? '',
      role: p.role,
    })
    setFormErrors({})
    setFormOpen(true)
    setDetail(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!team) return
    if (form.full_name.trim().length < 2) {
      setFormErrors({ full_name: 'Enter the player’s name.' })
      return
    }
    if (form.jersey_number) {
      const jerseyNum = Number(form.jersey_number)
      if (Number.isNaN(jerseyNum)) {
        setFormErrors({ jersey_number: 'Enter a valid number (0–999).' })
        return
      }
      const owner = jerseyTakenBy(data.players, jerseyNum, editing?.id)
      if (owner) {
        setFormErrors({ jersey_number: `#${jerseyNum} is already taken by ${owner} — pick a different number.` })
        return
      }
    }
    setSaving(true)
    try {
      const payload = {
        full_name: form.full_name.trim(),
        jersey_number: form.jersey_number ? Number(form.jersey_number) : null,
        position: form.position.trim() || null,
        grade: form.grade.trim() || null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        email: form.email.trim() || null,
        photo_url: form.photo_url.trim() || null,
      }
      let savedId: string | null = null
      if (editing) {
        await updatePlayer(editing.id, payload)
        savedId = editing.id
        if (form.role !== editing.role) await setPlayerRole(editing.id, form.role)
        success('Player updated.')
      } else {
        const created = await addPlayer(team.id, payload)
        savedId = created.id
        if (form.role !== 'player') await setPlayerRole(created.id, form.role)
        success(`${form.full_name.trim()} added to the roster.`)
      }
      void savedId
      setFormOpen(false)
      data.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t save the player.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!deactivateTarget) return
    setSaving(true)
    try {
      await setPlayerActive(deactivateTarget.id, !deactivateTarget.is_active)
      success(deactivateTarget.is_active ? `${deactivateTarget.full_name} removed from the active roster.` : `${deactivateTarget.full_name} restored to the active roster.`)
      setDeactivateTarget(null)
      setDetail(null)
      data.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t update the player.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deletePlayer(deleteTarget.id)
      success(`${deleteTarget.full_name} was removed from SNA.`)
      setDeleteTarget(null)
      setDetail(null)
      data.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t delete the player.')
    } finally {
      setSaving(false)
    }
  }

  const handleRole = async () => {
    const target = roleTarget
    if (!target) return
    const next = target.role === 'captain' ? 'player' : 'captain'
    setSaving(true)
    try {
      await setPlayerRole(target.id, next)
      success(next === 'captain' ? `${target.full_name} is now a captain.` : `${target.full_name} is now a player.`)
      setRoleTarget(null)
      setDetail(null)
      data.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t update the role.')
    } finally {
      setSaving(false)
    }
  }

  const detailRate = detail
    ? percent(detail.present + detail.late, detail.total)
    : 0

  const roleDialog = roleTarget
    ? {
        title: roleTarget.role === 'captain' ? 'Demote player?' : 'Make captain?',
        message:
          roleTarget.role === 'captain'
            ? `${roleTarget.full_name} will lose captain privileges.`
            : `${roleTarget.full_name} will get captain privileges: editing roster, attendance, schedule, games, media and announcements.`,
        confirmLabel: roleTarget.role === 'captain' ? 'Demote' : 'Make Captain',
      }
    : null

  return (
    <div>
      <PageHeader
        title="Team"
        subtitle={`${data.players.filter((p) => p.is_active).length} players · ${team?.name ?? ''}`}
        actions={
          isCaptain ? (
            <Button onClick={openAdd}>
              <UserPlus className="h-4 w-4" /> Add Player
            </Button>
          ) : undefined
        }
      />

      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search players, positions, numbers…" className="pl-10" />
      </div>

      {data.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={query ? 'No players match your search' : 'No players on the roster yet'}
          description={isCaptain ? 'Add your players to get started.' : 'Your captain hasn’t added anyone yet.'}
          action={isCaptain ? <Button onClick={openAdd}><UserPlus className="h-4 w-4" /> Add Player</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              onClick={() => setDetail(p)}
              onMenu={isCaptain ? () => setDetail(p) : undefined}
              showRole
            />
          ))}
        </div>
      )}

      {/* ---------------- Player detail ---------------- */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.full_name}
        size="sm"
        footer={
          isCaptain && detail ? (
            <>
              <Button variant="ghost" onClick={() => setRoleTarget(detail)}>
                {detail.role === 'captain' ? 'Demote to player' : 'Make captain'}
              </Button>
              <Button variant="secondary" onClick={() => setDeactivateTarget(detail)}>
                {detail.is_active ? <UserX className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {detail.is_active ? 'Remove' : 'Restore'}
              </Button>
              {detail.role !== 'captain' && (
                <Button variant="danger" onClick={() => setDeleteTarget(detail)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}
              <Button onClick={() => openEdit(detail)}>Edit</Button>
            </>
          ) : undefined
        }
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <Avatar name={detail.full_name} src={detail.photo_url} size="xl" />
              <div>
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{detail.full_name}</h3>
                  {detail.role === 'captain' && (
                    <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Crown className="h-3 w-3" /> Captain
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {[detail.position, detail.grade && `Grade ${detail.grade}`].filter(Boolean).join(' · ') || 'No position set'}
                  {detail.jersey_number != null && ` · #${detail.jersey_number}`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-team-soft p-3">
                <p className="tabular text-2xl font-black text-[var(--team-primary)]">{detailRate}%</p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Attendance</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="tabular text-2xl font-black text-slate-900 dark:text-white">{detail.total}</p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Events</p>
              </div>
            </div>

            <div className="flex justify-center gap-2 text-xs font-medium">
              <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-emerald-600 dark:text-emerald-400">{detail.present} Present</span>
              <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-amber-600 dark:text-amber-400">{detail.late} Late</span>
              <span className="rounded-lg bg-rose-500/10 px-2 py-1 text-rose-600 dark:text-rose-400">{detail.absent} Absent</span>
              <span className="rounded-lg bg-slate-500/10 px-2 py-1 text-slate-500 dark:text-slate-400">{detail.excused} Excused</span>
            </div>

            {(detail.email || detail.phone || detail.height_cm) && (
              <div className="space-y-1.5 rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700">
                {detail.email && <p className="text-slate-600 dark:text-slate-300">✉️ {detail.email}</p>}
                {detail.phone && <p className="text-slate-600 dark:text-slate-300">📞 {detail.phone}</p>}
                {detail.height_cm != null && (
                  <p className="text-slate-600 dark:text-slate-300">📏 {Math.round(detail.height_cm / 2.54)}" ({detail.height_cm} cm)</p>
                )}
              </div>
            )}

            {!detail.is_active && (
              <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-rose-500">
                <ShieldCheck className="h-3.5 w-3.5" /> Not on the active roster
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* ---------------- Add / Edit form ---------------- */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Player' : 'Add Player'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? 'Save Changes' : 'Add Player'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Full name" required error={formErrors.full_name} className="sm:col-span-2">
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Alex Nguyen" />
          </Field>
          <Field label="Jersey number" error={formErrors.jersey_number}>
            <Input type="number" min={0} max={999} value={form.jersey_number} onChange={(e) => setForm({ ...form, jersey_number: e.target.value })} placeholder="23" />
          </Field>
          <Field label="Position">
            <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Point Guard" />
          </Field>
          <Field label="Grade">
            <Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="12" />
          </Field>
          <Field label="Height (cm)">
            <Input type="number" step="0.1" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} placeholder="183" />
          </Field>
          <Field label="Email" hint="Optional contact email shown on their roster profile." className="sm:col-span-2">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="player@school.edu" />
          </Field>
          <Field label="Profile photo" className="sm:col-span-2">
            <PhotoUpload
              name={form.full_name.trim() || 'Player'}
              value={form.photo_url || null}
              onChange={(url) => setForm({ ...form, photo_url: url ?? '' })}
              teamId={team?.id ?? ''}
            />
          </Field>
          <Field label="Role" hint="Member plays on the team; Coach is staff-only access. Captain is managed from the team roster." className="sm:col-span-2">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="captain">Captain</option>
              <option value="player">Member</option>
              <option value="coach">Coach</option>
            </Select>
          </Field>
        </form>
      </Modal>

      {/* ---------------- Confirmations ---------------- */}
      <ConfirmDialog
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        loading={saving}
        title={deactivateTarget?.is_active ? 'Remove player?' : 'Restore player?'}
        message={
          deactivateTarget?.is_active
            ? `${deactivateTarget.full_name} will be hidden from the active roster. Their attendance history is kept so team stats stay accurate.`
            : `${deactivateTarget?.full_name} will be added back to the active roster.`
        }
        confirmLabel={deactivateTarget?.is_active ? 'Remove' : 'Restore'}
      />

      {/* Permanent delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Delete player permanently?"
        message={`${deleteTarget?.full_name} will be permanently removed from SNA along with their attendance history. This can't be undone — use Remove instead if you want to keep their records.`}
        confirmLabel="Delete permanently"
      />

      <ConfirmDialog
        open={roleTarget !== null}
        onClose={() => setRoleTarget(null)}
        onConfirm={handleRole}
        loading={saving}
        title={roleDialog?.title ?? ''}
        message={roleDialog?.message ?? ''}
        confirmLabel={roleDialog?.confirmLabel}
      />

      {/* Auto-open Add Player when navigated from the dashboard quick action */}
      <AutoOpenAddPlayer shouldOpen={Boolean((location.state as { openAddPlayer?: boolean } | null)?.openAddPlayer)} onOpen={openAdd} />
    </div>
  )
}

function AutoOpenAddPlayer({ shouldOpen, onOpen }: { shouldOpen: boolean; onOpen: () => void }) {
  useEffect(() => {
    if (shouldOpen) onOpen()
  }, [shouldOpen, onOpen])
  return null
}
