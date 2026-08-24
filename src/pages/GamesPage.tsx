import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { BarChart3, Trophy } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { GameCard } from '@/components/cards/GameCard'
import { useTeam } from '@/hooks/useTeam'
import { useTeamData } from '@/hooks/useTeamData'
import { useToast } from '@/hooks/useToast'
import { deleteGame, fetchPlayerStatsForGame, savePlayerStatsForGame, setGamePlayers, upsertGame } from '@/lib/api'
import { cn, percent } from '@/lib/utils'
import { Toggle } from '@/components/ui/Toggle'
import { statCategories, statLabel } from '@/lib/publicStats'
import type { Game, GameResult, GameStatus, HomeAway } from '@/types'

type Filter = 'upcoming' | 'completed' | 'all'

interface GameForm {
  opponent: string
  is_friendly: boolean
  date: string
  time: string
  location: string
  home_away: HomeAway
  status: GameStatus
  our_score: string
  opponent_score: string
  result: GameResult | ''
  notes: string
}

const EMPTY_FORM: GameForm = {
  opponent: '',
  is_friendly: false,
  date: new Date().toISOString().slice(0, 10),
  time: '19:00',
  location: '',
  home_away: 'home',
  status: 'upcoming',
  our_score: '',
  opponent_score: '',
  result: '',
  notes: '',
}

export default function GamesPage() {
  const { team, isCaptain } = useTeam()
  const data = useTeamData()
  const { success, error: toastError } = useToast()
  const location = useLocation()

  const [filter, setFilter] = useState<Filter>('upcoming')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Game | null>(null)
  const [form, setForm] = useState<GameForm>(EMPTY_FORM)
  const [eligible, setEligible] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<{ opponent?: string; date?: string; scores?: string }>({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Game | null>(null)
  const [statsGame, setStatsGame] = useState<Game | null>(null)
  const [statsDraft, setStatsDraft] = useState<Record<string, Record<string, string>>>({})
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsSaving, setStatsSaving] = useState(false)

  const record = useMemo(() => {
    // Friendly (exhibition) games never count toward the official record.
    const completed = data.games.filter((g) => g.status === 'completed' && !g.is_friendly)
    const wins = completed.filter((g) => g.result === 'win').length
    const losses = completed.filter((g) => g.result === 'loss').length
    const ties = completed.filter((g) => g.result === 'tie').length
    return { wins, losses, ties, total: completed.length }
  }, [data.games])

  const filtered = useMemo(() => {
    if (filter === 'upcoming') return data.games.filter((g) => g.status === 'upcoming').sort((a, b) => a.date.localeCompare(b.date))
    if (filter === 'completed') return data.games.filter((g) => g.status === 'completed').sort((a, b) => b.date.localeCompare(a.date))
    return data.games
  }, [data.games, filter])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) })
    setEligible(new Set())
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (g: Game) => {
    setEditing(g)
    setForm({
      opponent: g.opponent,
      is_friendly: g.is_friendly,
      date: g.date,
      time: g.time?.slice(0, 5) ?? '',
      location: g.location ?? '',
      home_away: g.home_away,
      status: g.status,
      our_score: g.our_score != null ? String(g.our_score) : '',
      opponent_score: g.opponent_score != null ? String(g.opponent_score) : '',
      result: g.result ?? '',
      notes: g.notes ?? '',
    })
    setEligible(new Set(g.eligible_player_ids ?? []))
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
    if (form.opponent.trim().length < 2) errs.opponent = 'Enter the opponent.'
    if (!form.date) errs.date = 'Pick a date.'
    if (form.status === 'completed') {
      const our = Number(form.our_score)
      const opp = Number(form.opponent_score)
      if (!form.our_score || !form.opponent_score || Number.isNaN(our) || Number.isNaN(opp)) {
        errs.scores = 'Enter both scores for a completed game.'
      }
    }
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    try {
      const completed = form.status === 'completed'
      const our = completed ? Number(form.our_score) : null
      const opp = completed ? Number(form.opponent_score) : null
      const result: GameResult | null = completed ? (form.result || (our! > opp! ? 'win' : our! < opp! ? 'loss' : 'tie')) : null
      const payload = {
        opponent: form.opponent.trim(),
        is_friendly: form.is_friendly,
        date: form.date,
        time: form.time || null,
        location: form.location.trim() || null,
        home_away: form.home_away,
        status: form.status,
        our_score: our,
        opponent_score: opp,
        result,
        notes: form.notes.trim() || null,
      }
      let gameId: string
      if (editing) {
        await upsertGame({ ...payload, id: editing.id, team_id: team.id })
        gameId = editing.id
        success('Game updated.')
      } else {
        const created = await upsertGame({ ...payload, team_id: team.id })
        gameId = created?.id ?? ''
        success('Game added to the schedule.')
      }
      if (gameId) {
        await setGamePlayers(gameId, [...eligible])
      }
      setFormOpen(false)
      data.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t save the game.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteGame(deleteTarget.id)
      data.refresh()
      setDeleteTarget(null)
      success('Game deleted.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t delete the game.')
    } finally {
      setSaving(false)
    }
  }

  const winRate = record.total > 0 ? percent(record.wins, record.total) : 0
  const statCats = statCategories(team?.sport)

  const openStats = async (g: Game) => {
    setStatsGame(g)
    setStatsDraft({})
    setStatsLoading(true)
    try {
      const existing = await fetchPlayerStatsForGame(g.id)
      const draft: Record<string, Record<string, string>> = {}
      for (const s of existing) {
        if (!draft[s.player_id]) draft[s.player_id] = {}
        draft[s.player_id][s.stat_name] = String(s.stat_value)
      }
      setStatsDraft(draft)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t load stats.')
    } finally {
      setStatsLoading(false)
    }
  }

  const setStat = (playerId: string, stat: string, value: string) => {
    setStatsDraft((d) => ({
      ...d,
      [playerId]: { ...(d[playerId] ?? {}), [stat]: value },
    }))
  }

  const handleSaveStats = async () => {
    if (!team || !statsGame) return
    setStatsSaving(true)
    try {
      const rows: { player_id: string; stat_name: string; stat_value: number }[] = []
      for (const [playerId, stats] of Object.entries(statsDraft)) {
        for (const cat of statCats) {
          const raw = (stats[cat] ?? '').trim()
          if (raw === '') continue
          const n = Number(raw)
          if (Number.isNaN(n)) continue
          rows.push({ player_id: playerId, stat_name: cat, stat_value: n })
        }
      }
      await savePlayerStatsForGame(statsGame.id, team.id, rows)
      setStatsGame(null)
      success('Player stats saved.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t save stats.')
    } finally {
      setStatsSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Games"
        subtitle={team ? `${team.name} · ${team.season ?? ''}` : 'Games'}
        actions={isCaptain ? <Button onClick={openCreate}><Trophy className="h-4 w-4" /> Add Game</Button> : undefined}
      />

      {/* Season record */}
      <Card className="mb-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 text-white dark:from-slate-950 dark:to-slate-900">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">{team?.season ?? 'Season'} Record</p>
            <p className="tabular mt-1 text-2xl font-black tracking-tight">
              {record.wins}–{record.losses}{record.ties > 0 ? `–${record.ties}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="tabular text-3xl font-black text-emerald-400">{winRate}%</p>
            <p className="text-xs font-medium text-slate-300">Win rate</p>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {(['upcoming', 'completed', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition-colors',
              filter === f
                ? 'border-transparent bg-team text-team-contrast'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {data.loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-6 w-6" />}
          title={filter === 'upcoming' ? 'No upcoming games' : filter === 'completed' ? 'No completed games' : 'No games yet'}
          description={isCaptain ? 'Add your opponents so everyone knows when and where to play.' : 'Your captain hasn’t scheduled any games yet.'}
          action={isCaptain ? <Button onClick={openCreate}><Trophy className="h-4 w-4" /> Add Game</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((g) => (
            <GameCard
              key={g.id}
              game={g}
              onEdit={isCaptain ? () => openEdit(g) : undefined}
              onDelete={isCaptain ? () => setDeleteTarget(g) : undefined}
              onStats={isCaptain && g.status === 'completed' ? () => openStats(g) : undefined}
            />
          ))}
        </div>
      )}

      {/* Game form */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Game' : 'Add Game'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} loading={saving}>{editing ? 'Save Changes' : 'Add Game'}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Opponent" required error={errors.opponent}>
            <Input value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} placeholder="Central High" />
          </Field>
          <Field label="Home / Away">
            <Select value={form.home_away} onChange={(e) => setForm({ ...form, home_away: e.target.value as HomeAway })}>
              <option value="home">🏠 Home</option>
              <option value="away">🚌 Away</option>
              <option value="neutral">⚖️ Neutral</option>
            </Select>
          </Field>
          <Field label="Date" required error={errors.date}>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Time">
            <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </Field>
          <Field label="Location" className="sm:col-span-2">
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="School Gym" />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as GameStatus })}>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="postponed">Postponed</option>
            </Select>
          </Field>
          <Field label="Friendly game" hint="Exhibition match — shows on the schedule but won’t count toward the season record.">
            <div className="flex h-10 items-center gap-3">
              <Toggle checked={form.is_friendly} onChange={(v) => setForm({ ...form, is_friendly: v })} label="Friendly game" />
              <span className="text-sm text-slate-600 dark:text-slate-300">{form.is_friendly ? 'Yes — friendly' : 'No — competitive'}</span>
            </div>
          </Field>
          <Field label="Result" hint="Auto-set from scores if left blank">
            <Select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value as GameResult | '' })}>
              <option value="">Auto from score</option>
              <option value="win">🏆 Win</option>
              <option value="loss">Loss</option>
              <option value="tie">Tie</option>
            </Select>
          </Field>
          {form.status === 'completed' && (
            <>
              <Field label={`Our score (${team?.name ?? 'Team'})`} error={errors.scores}>
                <Input type="number" min={0} value={form.our_score} onChange={(e) => setForm({ ...form, our_score: e.target.value })} placeholder="71" />
              </Field>
              <Field label={`Opponent score (${form.opponent || 'opponent'})`}>
                <Input type="number" min={0} value={form.opponent_score} onChange={(e) => setForm({ ...form, opponent_score: e.target.value })} placeholder="62" />
              </Field>
            </>
          )}
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Home opener — fans show up loud!" />
          </Field>

          {/* Eligible players — who is allowed to play this game */}
          <div className="sm:col-span-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Eligible players</span>
              <span className="text-xs text-slate-400">{eligible.size} selected</span>
            </div>
            <p className="mb-3 text-xs text-slate-400">Pick who is allowed to play this game. Leave empty for everyone.</p>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              {data.players.filter((p) => p.is_active && p.role !== 'captain').length === 0 ? (
                <p className="py-2 text-center text-xs text-slate-400">No active players on the roster yet.</p>
              ) : (
                <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                  {data.players
                    .filter((p) => p.is_active && p.role !== 'captain')
                    .sort((a, b) => a.full_name.localeCompare(b.full_name))
                    .map((p) => {
                      const checked = eligible.has(p.id)
                      return (
                        <label
                          key={p.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = new Set(eligible)
                              if (next.has(p.id)) next.delete(p.id)
                              else next.add(p.id)
                              setEligible(next)
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-[var(--team-primary)] focus:ring-[var(--team-primary)] dark:border-slate-600"
                          />
                          <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{p.full_name}</span>
                          {p.jersey_number != null && <span className="text-xs tabular text-slate-400">#{p.jersey_number}</span>}
                        </label>
                      )
                    })}
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* Player stats for a completed game */}
      <Modal
        open={statsGame !== null}
        onClose={() => setStatsGame(null)}
        title={`Stats · vs ${statsGame?.opponent ?? ''}`}
        description="Enter each player's line for this game. Leave a field blank for zero."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatsGame(null)} disabled={statsSaving}>Cancel</Button>
            <Button onClick={handleSaveStats} loading={statsSaving} disabled={statsLoading}>
              <BarChart3 className="h-4 w-4" /> Save Stats
            </Button>
          </>
        }
      >
        {statsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 pr-3 font-semibold text-slate-500 dark:text-slate-400">Player</th>
                  {statCats.map((cat) => (
                    <th key={cat} className="px-2 py-2 text-center font-semibold text-slate-500 dark:text-slate-400">{statLabel(cat)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.players
                  .filter((p) => p.is_active && p.role !== 'captain')
                  .sort((a, b) => a.full_name.localeCompare(b.full_name))
                  .map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="py-2 pr-3 font-medium text-slate-800 dark:text-slate-100">
                        {p.full_name}
                        {p.jersey_number != null && <span className="ml-1 text-xs text-slate-400">#{p.jersey_number}</span>}
                      </td>
                      {statCats.map((cat) => (
                        <td key={cat} className="px-2 py-1.5 text-center">
                          <Input
                            type="number"
                            min={0}
                            value={statsDraft[p.id]?.[cat] ?? ''}
                            onChange={(e) => setStat(p.id, cat, e.target.value)}
                            placeholder="0"
                            className="w-16 text-center"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                {data.players.filter((p) => p.is_active && p.role !== 'captain').length === 0 && (
                  <tr>
                    <td colSpan={statCats.length + 1} className="py-6 text-center text-sm text-slate-400">
                      No active players on the roster yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-400">Totals update the public Player Leaders automatically. Stats only appear publicly if “Public player stats” is on in Settings.</p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Delete game?"
        message={`The game vs ${deleteTarget?.opponent} will be removed.`}
      />
    </div>
  )
}
