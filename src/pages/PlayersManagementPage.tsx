import { useMemo, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Eye,
  Pencil,
  Search,
  Trash2,
  UserPlus,
  UserX,
  UserCheck,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { useTeam } from '@/hooks/useTeam'
import { useTeamData } from '@/hooks/useTeamData'
import { useToast } from '@/hooks/useToast'
import { addPlayer, deletePlayer, setPlayerActive, setPlayerRole, updatePlayer } from '@/lib/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { Field, Input, Select } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Avatar } from '@/components/ui/Avatar'
import { setSnaTitle } from '@/lib/brand'
import { ATTENDANCE_META, cn } from '@/lib/utils'
import type { Profile, Role } from '@/types'

const POSITIONS = ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center', 'Guard', 'Forward', 'Other']
const GRADES = ['6', '7', '8', '9', '10', '11', '12']

type SortKey = 'jersey_number' | 'full_name' | 'attendanceRate' | 'position'

export default function PlayersManagementPage() {
  const { team } = useTeam()
  const data = useTeamData()
  const location = useLocation()
  const { success, error: toastError } = useToast()
  setSnaTitle('Players')

  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('jersey_number')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [editing, setEditing] = useState<Profile | null>(null)
  const [viewing, setViewing] = useState<Profile | null>(null)
  const [deactivating, setDeactivating] = useState<Profile | null>(null)
  const [deleting, setDeleting] = useState<Profile | null>(null)

  // Support "Add Player" quick action from the captain overview.
  const openAddFromState = Boolean((location.state as { openAddPlayer?: boolean } | null)?.openAddPlayer)
  const [addOpen, setAddOpen] = useState(openAddFromState)

  const players = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = data.players
      .filter((p) => (q ? p.full_name.toLowerCase().includes(q) || String(p.jersey_number ?? '').includes(q) || (p.position ?? '').toLowerCase().includes(q) : true))
      .slice()
    const dir = sortDir === 'asc' ? 1 : -1
    list.sort((a, b) => {
      if (sortKey === 'attendanceRate') return (a.attendanceRate - b.attendanceRate) * dir
      if (sortKey === 'jersey_number') return ((a.jersey_number ?? 9999) - (b.jersey_number ?? 9999)) * dir
      if (sortKey === 'position') return ((a.position ?? '').localeCompare(b.position ?? '')) * dir
      return a.full_name.localeCompare(b.full_name) * dir
    })
    return list
  }, [data.players, query, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const SortHeader = ({ label, k, className }: { label: string; k: SortKey; className?: string }) => (
    <th className={cn('px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400', className)}>
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200">
        {label}
        {sortKey === k && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
    </th>
  )

  const handleAdd = async (player: Partial<Profile>, newRole?: Role) => {
    if (!team) return
    try {
      const created = await addPlayer(team.id, player)
      if (newRole && created.id) {
        await setPlayerRole(created.id, newRole)
      }
      data.refresh()
      setAddOpen(false)
      success(`${player.full_name} added to the SNA roster.`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t add the player.')
    }
  }

  const handleEdit = async (player: Profile, patch: Partial<Profile>, newRole?: Role) => {
    try {
      await updatePlayer(player.id, patch)
      if (newRole && newRole !== player.role) {
        await setPlayerRole(player.id, newRole)
      }
      data.refresh()
      setEditing(null)
      success('Player updated.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t save changes.')
    }
  }

  const handleToggleActive = async (player: Profile) => {
    try {
      await setPlayerActive(player.id, !player.is_active)
      data.refresh()
      success(player.is_active ? `${player.full_name} moved to inactive.` : `${player.full_name} is active again.`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t update the player.')
    } finally {
      setDeactivating(null)
    }
  }

  const handleDelete = async (player: Profile) => {
    try {
      await deletePlayer(player.id)
      data.refresh()
      success(`${player.full_name} was removed from SNA.`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t delete the player.')
    } finally {
      setDeleting(null)
    }
  }

  if (data.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  const viewingStats = viewing
    ? data.players.find((p) => p.id === viewing.id)
    : null

  return (
    <div>
      <PageHeader
        title="Players"
        subtitle="Manage the SNA roster — view, edit, activate or deactivate players."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" /> Add Player
          </Button>
        }
      />

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search players…" className="pl-10" />
      </div>

      <Card className="overflow-hidden">
        {players.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={query ? 'No players match your search' : 'No players yet'}
              description={query ? 'Try a different name, number or position.' : 'Add your first player to build the SNA roster.'}
              action={query ? undefined : <Button size="sm" onClick={() => setAddOpen(true)}><UserPlus className="h-3.5 w-3.5" /> Add Player</Button>}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <SortHeader label="#" k="jersey_number" className="w-14" />
                  <SortHeader label="Player" k="full_name" />
                  <SortHeader label="Position" k="position" className="hidden sm:table-cell" />
                  <SortHeader label="Attendance" k="attendanceRate" className="hidden md:table-cell" />
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 lg:table-cell">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {players.map((p) => (
                  <tr key={p.id} className={cn('transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40', !p.is_active && 'opacity-60')}>
                    <td className="px-4 py-3 tabular text-sm font-bold text-slate-500 dark:text-slate-400">
                      {p.jersey_number != null ? `#${p.jersey_number}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.full_name} src={p.photo_url} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{p.full_name}</p>
                          <p className="text-xs text-slate-400 sm:hidden">{p.position ?? 'No position'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-slate-600 dark:text-slate-300 sm:table-cell">{p.position ?? '—'}</td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="tabular text-sm font-semibold text-slate-700 dark:text-slate-200">{p.attendanceRate}%</span>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', p.is_active ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-400/30 bg-slate-500/10 text-slate-500 dark:text-slate-400')}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewing(p)} title="View" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditing(p)} title="Edit" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeactivating(p)}
                          title={p.is_active ? 'Deactivate' : 'Activate'}
                          className={cn('rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800', p.is_active ? 'text-slate-400 hover:text-rose-600' : 'text-slate-400 hover:text-emerald-600')}
                        >
                          {p.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        {p.role !== 'captain' && (
                          <button
                            onClick={() => setDeleting(p)}
                            title="Delete permanently"
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit modal */}
      {(addOpen || editing) && (
        <PlayerFormModal
          player={editing}
          onClose={() => {
            setAddOpen(false)
            setEditing(null)
          }}
          onSubmit={async (patch, newRole) => {
            if (editing) await handleEdit(editing, patch, newRole)
            else await handleAdd(patch, newRole)
          }}
        />
      )}

      {/* View modal */}
      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={viewing.full_name} description={viewing.position ?? undefined} size="sm">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={viewing.full_name} src={viewing.photo_url} size="lg" />
              <div className="space-y-0.5 text-sm">
                <p className="text-slate-700 dark:text-slate-200">
                  <span className="font-semibold">#{viewing.jersey_number ?? '—'}</span> · {viewing.position ?? 'No position'}
                </p>
                <p className="text-slate-500 dark:text-slate-400">{viewing.grade ?? 'Grade n/a'}</p>
                <p className="text-slate-500 dark:text-slate-400">{viewing.height_cm ? `${viewing.height_cm} cm` : 'Height n/a'}</p>
              </div>
            </div>
            {viewingStats && (
              <div className="grid grid-cols-3 divide-x divide-slate-100 rounded-xl border border-slate-100 text-center dark:divide-slate-800 dark:border-slate-800">
                <div className="p-3">
                  <p className="tabular text-xl font-black text-[var(--team-primary)]">{viewingStats.attendanceRate}%</p>
                  <p className="mt-0.5 text-xs text-slate-400">Attendance</p>
                </div>
                <div className="p-3">
                  <p className="tabular text-xl font-black text-emerald-600 dark:text-emerald-400">{viewingStats.present}</p>
                  <p className="mt-0.5 text-xs text-slate-400">Present</p>
                </div>
                <div className="p-3">
                  <p className="tabular text-xl font-black text-amber-600 dark:text-amber-400">{viewingStats.late}</p>
                  <p className="mt-0.5 text-xs text-slate-400">Late</p>
                </div>
              </div>
            )}
            {viewing.email && <p className="text-sm text-slate-500 dark:text-slate-400">Email: {viewing.email}</p>}
            {viewing.phone && <p className="text-sm text-slate-500 dark:text-slate-400">Phone: {viewing.phone}</p>}
            <p className="flex items-center gap-2 text-xs text-slate-400">
              {ATTENDANCE_META.present.dot && <span className={cn('h-2 w-2 rounded-full', ATTENDANCE_META.present.dot)} />}
              {viewing.is_active ? 'Active on the roster' : 'Inactive — kept for history'}
            </p>
          </div>
        </Modal>
      )}

      {/* Deactivate confirm */}
      <ConfirmDialog
        open={Boolean(deactivating)}
        onClose={() => setDeactivating(null)}
        onConfirm={() => deactivating && handleToggleActive(deactivating)}
        title={deactivating?.is_active ? 'Deactivate player?' : 'Activate player?'}
        message={
          deactivating?.is_active
            ? `${deactivating.full_name} will be removed from the active roster but their attendance history is kept.`
            : `${deactivating?.full_name} will be added back to the active roster.`
        }
        confirmLabel={deactivating?.is_active ? 'Deactivate' : 'Activate'}
      />

      {/* Permanent delete confirm */}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
        title="Delete player permanently?"
        message={`${deleting?.full_name} will be permanently removed from SNA along with their attendance history. This can't be undone — use Deactivate instead if you want to keep their records.`}
        confirmLabel="Delete permanently"
      />
    </div>
  )
}

function PlayerFormModal({
  player,
  onClose,
  onSubmit,
}: {
  player: Profile | null
  onClose: () => void
  onSubmit: (patch: Partial<Profile>, role?: Role) => Promise<void>
}) {
  const [fullName, setFullName] = useState(player?.full_name ?? '')
  const [jersey, setJersey] = useState(player?.jersey_number != null ? String(player.jersey_number) : '')
  const [position, setPosition] = useState(player?.position ?? '')
  const [grade, setGrade] = useState(player?.grade ?? '')
  const [photoUrl, setPhotoUrl] = useState(player?.photo_url ?? '')
  const [height, setHeight] = useState(player?.height_cm != null ? String(player.height_cm) : '')
  const [email, setEmail] = useState(player?.email ?? '')
  const [role, setRole] = useState<Role>(player?.role ?? 'player')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (fullName.trim().length < 2) {
      setError('Enter the player’s full name.')
      return
    }
    const patch: Partial<Profile> = {
      full_name: fullName.trim(),
      position: position.trim() || null,
      grade: grade.trim() || null,
      photo_url: photoUrl.trim() || null,
      height_cm: height ? Number(height) : null,
      email: email.trim() || null,
    }
    const num = Number(jersey)
    if (jersey && !Number.isNaN(num)) patch.jersey_number = num
    setSaving(true)
    try {
      await onSubmit(patch, role !== (player?.role ?? 'player') ? role : undefined)
    } catch {
      /* error surfaced by parent */
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={player ? `Edit ${player.full_name}` : 'Add SNA Player'}
      description={player ? 'Update their roster details.' : 'New players appear on the roster immediately.'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="player-form" loading={saving}>
            {player ? 'Save Changes' : 'Add Player'}
          </Button>
        </>
      }
    >
      <form id="player-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>}
        <Field label="Full name" required>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Alex Nguyen" autoFocus />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jersey number">
            <Input type="number" value={jersey} onChange={(e) => setJersey(e.target.value)} placeholder="23" inputMode="numeric" />
          </Field>
          <Field label="Position">
            <Select value={position} onChange={(e) => setPosition(e.target.value)}>
              <option value="">Select position…</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Grade">
            <Select value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="">Select grade…</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </Select>
          </Field>
          <Field label="Height (cm)">
            <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="183" inputMode="numeric" />
          </Field>
        </div>
        <Field label="Photo URL" hint="Optional — paste a link to their photo.">
          <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…/photo.jpg" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" hint="Optional contact email shown on their roster profile.">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@sna.edu.vn" />
          </Field>
          <Field label="Role" hint="Member plays on the team; Coach is staff-only access. Captain is managed from the team roster.">
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="captain">Captain</option>
              <option value="player">Member</option>
              <option value="coach">Coach</option>
            </Select>
          </Field>
        </div>
      </form>
    </Modal>
  )
}
