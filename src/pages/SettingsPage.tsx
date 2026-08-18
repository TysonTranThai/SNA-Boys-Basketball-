import { useState, type FormEvent } from 'react'
import { Check, Copy, Eye, EyeOff, KeyRound, RefreshCw, Save } from 'lucide-react'
import { Globe, Users, BarChart3, CalendarCheck, Hash } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/Modal'
import { Toggle } from '@/components/ui/Toggle'
import { useTeam } from '@/hooks/useTeam'
import { useToast } from '@/hooks/useToast'
import { updateTeam } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useTeamData } from '@/hooks/useTeamData'

const SPORTS = ['Basketball', 'Football', 'Soccer', 'Volleyball', 'Baseball', 'Softball', 'Tennis', 'Swimming', 'Track & Field', 'Wrestling', 'Lacrosse', 'Other']

export default function SettingsPage() {
  const { team, refresh } = useTeam()
  const data = useTeamData()
  const { success, error: toastError } = useToast()

  const [name, setName] = useState(team?.name ?? '')
  const [sport, setSport] = useState(team?.sport ?? 'Basketball')
  const [season, setSeason] = useState(team?.season ?? '')
  const [school, setSchool] = useState(team?.school ?? '')
  const [logoUrl, setLogoUrl] = useState(team?.logo_url ?? '')
  const [primaryColor, setPrimaryColor] = useState(team?.primary_color ?? '#C8102E')
  const [secondaryColor, setSecondaryColor] = useState(team?.secondary_color ?? '#F2A900')
  const [accentColor, setAccentColor] = useState(team?.accent_color ?? '#D4AF37')
  const [captainCode, setCaptainCode] = useState(team?.captain_code ?? '')
  const [showCode, setShowCode] = useState(false)
  const [publicVisible, setPublicVisible] = useState(team?.public_visible ?? false)
  const [showStats, setShowStats] = useState(team?.public_show_stats ?? true)
  const [showAttendance, setShowAttendance] = useState(team?.public_show_attendance ?? true)
  const [showNames, setShowNames] = useState(team?.public_show_names ?? true)
  const [showJersey, setShowJersey] = useState(team?.public_show_jersey ?? true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const inputClasses = 'h-9 w-9 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-950'

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!team) return
    if (name.trim().length < 2) {
      toastError('Give your team a name.')
      return
    }
    setSaving(true)
    try {
      await updateTeam(team.id, {
        name: name.trim(),
        sport,
        season: season.trim() || null,
        school: school.trim() || null,
        logo_url: logoUrl.trim() || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        captain_code: captainCode.trim() || null,
        public_visible: publicVisible,
        public_show_stats: showStats,
        public_show_attendance: showAttendance,
        public_show_names: showNames,
        public_show_jersey: showJersey,
      })
      await refresh()
      success('Team settings saved.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t save settings.')
    } finally {
      setSaving(false)
    }
  }

  const copyCode = async () => {
    if (!team) return
    try {
      await navigator.clipboard.writeText(team.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toastError('Couldn’t copy — select and copy the code manually.')
    }
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const { data: code, error } = await supabase.rpc('regenerate_invite_code')
      if (error) throw new Error(error.message)
      await refresh()
      setRegenerateOpen(false)
      success('New invite code generated.')
      void code
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t regenerate the code.')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" subtitle="Team identity and how players join." />

      {/* Invite code */}
      <Card className="mb-6 overflow-hidden">
        <CardHeader
          title="Invite your players"
          subtitle="Players create an account and enter this code to join. They see the roster immediately."
          action={
            <Button variant="ghost" size="sm" onClick={() => setRegenerateOpen(true)}>
              <RefreshCw className="h-3.5 w-3.5" /> New code
            </Button>
          }
        />
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-[var(--team-primary)]/40 bg-team-soft px-5 py-3">
              <KeyRound className="h-5 w-5 text-[var(--team-primary)]" />
              <span className="text-2xl font-black tracking-[0.35em] text-slate-900 dark:text-white">
                {team?.invite_code ?? '••••••••'}
              </span>
            </div>
            <Button variant="secondary" onClick={copyCode}>
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy code'}
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Share this code in your group chat or on the locker room board. If a player was added to the roster with their email, joining links their account automatically.
          </p>
        </div>
      </Card>

      {/* Team identity */}
      <form onSubmit={handleSave} className="space-y-6" noValidate>
        <Card className="overflow-hidden">
          <CardHeader title="Team identity" subtitle="Shown across the sidebar, dashboard, roster and game cards." />
          <div className="space-y-4 p-5">
            <Field label="Team name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Sport">
                <Select value={sport} onChange={(e) => setSport(e.target.value)}>
                  {SPORTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Season">
                <Input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="2026–2027" />
              </Field>
            </div>
            <Field label="School">
              <Input value={school} onChange={(e) => setSchool(e.target.value)} />
            </Field>
            <Field label="Team logo URL">
              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Primary color">
                <div className="flex items-center gap-2">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className={inputClasses} aria-label="Primary color" />
                  <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono text-xs" />
                </div>
              </Field>
              <Field label="Secondary color">
                <div className="flex items-center gap-2">
                  <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className={inputClasses} aria-label="Secondary color" />
                  <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="font-mono text-xs" />
                </div>
              </Field>
            </div>
            <Field label="Accent color" hint="The golden-knight accent — used for highlights and captain marks.">
              <div className="flex items-center gap-2">
                <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className={inputClasses} aria-label="Accent color" />
                <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="font-mono text-xs" />
              </div>
            </Field>
            <Field label="Captain code" hint="The secret that unlocks the captain's spot. Anyone on the team who enters it becomes the captain — keep it private.">
              <div className="relative">
                <Input
                  type={showCode ? 'text' : 'password'}
                  value={captainCode}
                  onChange={(e) => setCaptainCode(e.target.value)}
                  placeholder="e.g. 120505"
                  className="pr-10 font-mono"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowCode((s) => !s)}
                  aria-label={showCode ? 'Hide captain code' : 'Show captain code'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                >
                  {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
          </div>
        </Card>

        {/* Public website */}
        <Card className="overflow-hidden">
          <CardHeader
            title="Public website"
            subtitle="What visitors see on the SNA homepage. Player email, phone and account info are never public."
          />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <ToggleRow
              icon={<Globe className="h-4 w-4" />}
              title="Show SNA on the public website"
              hint="Turn off to hide the team from the public homepage entirely."
              checked={publicVisible}
              onChange={setPublicVisible}
            />
            <ToggleRow
              icon={<BarChart3 className="h-4 w-4" />}
              title="Public player stats"
              hint="Player leaders (points, rebounds, …) on the public site."
              checked={showStats}
              onChange={setShowStats}
            />
            <ToggleRow
              icon={<CalendarCheck className="h-4 w-4" />}
              title="Public attendance leaderboard"
              hint="Team attendance rate and the per-player leaderboard."
              checked={showAttendance}
              onChange={setShowAttendance}
            />
            <ToggleRow
              icon={<Users className="h-4 w-4" />}
              title="Public player names"
              hint="Off hides names on the public roster — players show as 'Player'."
              checked={showNames}
              onChange={setShowNames}
            />
            <ToggleRow
              icon={<Hash className="h-4 w-4" />}
              title="Public jersey numbers"
              hint="Off hides jersey numbers on the public roster."
              checked={showJersey}
              onChange={setShowJersey}
            />
          </div>
        </Card>

        {/* Live preview */}
        <Card className="overflow-hidden">
          <CardHeader title="Preview" subtitle="How your brand looks right now." />
          <div className="p-5">
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 p-5 dark:border-slate-700" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Team logo" className="h-14 w-14 rounded-xl bg-white/90 object-contain p-1" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 text-xl font-black text-white backdrop-blur">
                  {(name || 'T').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="text-white">
                <p className="text-lg font-black tracking-tight">{name || 'Your Team Name'}</p>
                <p className="text-sm opacity-90">{sport}{season ? ` · ${season}` : ''}</p>
                {school && <p className="text-xs opacity-75">{school}</p>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: primaryColor }} />
              Primary <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{primaryColor}</code>
              <span className="ml-3 h-3 w-3 rounded-full" style={{ backgroundColor: secondaryColor }} />
              Secondary <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{secondaryColor}</code>
              <span className="ml-3 h-3 w-3 rounded-full" style={{ backgroundColor: accentColor }} />
              Accent <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{accentColor}</code>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="submit" size="lg" loading={saving}>
            <Save className="h-4 w-4" /> Save Settings
          </Button>
        </div>
      </form>

      {/* Stats summary */}
      <Card className="mt-6">
        <CardHeader title="At a glance" />
        <div className="grid grid-cols-3 divide-x divide-slate-100 text-center dark:divide-slate-800">
          <div className="p-5">
            <p className="tabular text-2xl font-black text-slate-900 dark:text-white">{data.players.filter((p) => p.is_active).length}</p>
            <p className="mt-0.5 text-xs text-slate-400">Active players</p>
          </div>
          <div className="p-5">
            <p className="tabular text-2xl font-black text-slate-900 dark:text-white">{data.attendance.length}</p>
            <p className="mt-0.5 text-xs text-slate-400">Attendance marks</p>
          </div>
          <div className="p-5">
            <p className="tabular text-2xl font-black text-slate-900 dark:text-white">{data.games.length}</p>
            <p className="mt-0.5 text-xs text-slate-400">Games</p>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={regenerateOpen}
        onClose={() => setRegenerateOpen(false)}
        onConfirm={handleRegenerate}
        loading={regenerating}
        title="New invite code?"
        message="The old code stops working immediately. Players who haven't joined yet will need the new code."
        confirmLabel="Generate new code"
      />
    </div>
  )
}

function ToggleRow({
  icon,
  title,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  title: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
          <p className="text-xs text-slate-400">{hint}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  )
}
