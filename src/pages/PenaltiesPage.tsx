import { useMemo } from 'react'
import { Footprints } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useTeam } from '@/hooks/useTeam'
import { useTeamData } from '@/hooks/useTeamData'
import { setSnaTitle } from '@/lib/brand'
import { LATE_TIERS, MARK_PENALTIES, cn, markConsequence, totalLateMarks } from '@/lib/utils'
import type { PlayerWithStats } from '@/types'

export default function PenaltiesPage() {
  const { team, isCaptain } = useTeam()
  const data = useTeamData()
  setSnaTitle('Penalties')

  const rows = useMemo(() => {
    const byPlayer = new Map<string, PlayerWithStats>()
    for (const p of data.players) byPlayer.set(p.id, p)
    return data.players
      .filter((p) => p.is_active)
      .map((p) => {
        const marks = totalLateMarks(data.attendance.filter((a) => a.player_id === p.id))
        return { player: p, marks, consequence: markConsequence(marks) }
      })
      .sort((a, b) => b.marks - a.marks)
  }, [data.players, data.attendance])

  if (data.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Penalties"
        subtitle="Team lateness rules — laps, late marks, and what they add up to."
      />

      {/* Lateness scale */}
      <Card className="mb-6 overflow-hidden">
        <CardHeader
          title="Late to practice"
          subtitle="Penalty for being late — the captain picks how late when marking attendance."
        />
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {LATE_TIERS.map((t) => (
            <div key={t.minutes} className="flex items-center gap-3 px-5 py-3">
              <span className="w-28 shrink-0 text-sm font-bold text-slate-900 dark:text-slate-100">{t.label}</span>
              <span className="flex flex-wrap items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                {t.laps > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold dark:bg-slate-800">
                    <Footprints className="h-3 w-3" /> {t.laps} laps
                  </span>
                )}
                {t.marks > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {t.marks} late mark{t.marks > 1 ? 's' : ''}
                  </span>
                )}
                {t.note && <span className="text-xs italic text-orange-600 dark:text-orange-400">{t.note}</span>}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Accumulated marks */}
      <Card className="mb-6 overflow-hidden">
        <CardHeader
          title="Accumulated late marks"
          subtitle="Late marks add up over the season — here's what each level means."
        />
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {MARK_PENALTIES.map((p) => (
            <div key={p.marks} className="flex items-center gap-3 px-5 py-3">
              <span className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black',
                p.marks >= 15
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : p.marks >= 10
                    ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
              )}>
                {p.marks}
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-200">{p.consequence}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Roster marks */}
      <Card className="overflow-hidden">
        <CardHeader
          title="Current marks"
          subtitle="Live late-mark totals for the active roster — recalculated from attendance."
        />
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No active players" description="Add players to the roster to track late marks." />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map(({ player, marks, consequence }) => (
              <li key={player.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={player.full_name} src={player.photo_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{player.full_name}</p>
                  {consequence ? (
                    <p className="mt-0.5 text-xs font-medium text-rose-600 dark:text-rose-400">{consequence}</p>
                  ) : (
                    <p className="mt-0.5 text-xs text-slate-400">No penalties yet</p>
                  )}
                </div>
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black tabular',
                    marks === 0
                      ? 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                      : marks >= 15
                        ? 'bg-rose-500 text-white'
                        : marks >= 10
                          ? 'bg-orange-500 text-white'
                          : marks >= 6
                            ? 'bg-amber-500 text-white'
                            : marks >= 4
                              ? 'bg-amber-400 text-white'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                  )}
                >
                  {marks}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {isCaptain && team && (
        <p className="mt-4 text-xs text-slate-400">
          Marks come from attendance: mark a player <span className="font-semibold">Late</span> and pick how late they were
          (5 / 10 / 15 / 20+ min) — the marks and laps apply automatically.
        </p>
      )}
    </div>
  )
}
