import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { useTeam } from '@/hooks/useTeam'
import { useTeamData } from '@/hooks/useTeamData'
import { useToast } from '@/hooks/useToast'
import { updatePlayer } from '@/lib/api'

export default function ProfilePage() {
  const { profile, refresh } = useTeam()
  const data = useTeamData()
  const { success, error: toastError } = useToast()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [photoUrl, setPhotoUrl] = useState(profile?.photo_url ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [saving, setSaving] = useState(false)

  const my = data.players.find((p) => p.id === profile?.id)
  const myAttendance = data.attendance.filter((a) => a.player_id === profile?.id)
  const rate = myAttendance.length > 0 ? Math.round(((myAttendance.filter((a) => a.status === 'present' || a.status === 'late').length) / myAttendance.length) * 100) : 0

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
    if (fullName.trim().length < 2) {
      toastError('Enter your full name.')
      return
    }
    setSaving(true)
    try {
      await updatePlayer(profile.id, {
        full_name: fullName.trim(),
        photo_url: photoUrl.trim() || null,
        phone: phone.trim() || null,
      })
      await refresh()
      success('Profile saved.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Couldn’t save your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Profile" subtitle="Your info, as it appears to the team." />

      <div className="space-y-6">
        <Card className="flex flex-col items-center gap-5 p-6 sm:flex-row">
          <Avatar name={profile?.full_name ?? '?'} src={photoUrl || profile?.photo_url} size="xl" />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{profile?.full_name}</h2>
              {my?.role === 'captain' && (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  <ShieldCheck className="h-3 w-3" /> Captain
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {[my?.position, my?.grade && `Grade ${my.grade}`, my?.jersey_number != null && `#${my.jersey_number}`].filter(Boolean).join(' · ') || 'No roster info yet'}
            </p>
            <div className="mt-3 flex items-center justify-center gap-4 sm:justify-start">
              <div className="text-center">
                <p className="tabular text-xl font-black text-[var(--team-primary)]">{rate}%</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Attendance</p>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <Link to="/portal/my-attendance" className="flex items-center gap-1 text-sm font-semibold text-[var(--team-primary)] hover:underline">
                Full history <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <Card className="overflow-hidden">
            <CardHeader title="Edit profile" subtitle="Only you and your captain can see the details you enter here." />
            <div className="space-y-4 p-5">
              <Field label="Full name" required>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </Field>
              <Field label="Profile photo URL">
                <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…/photo.jpg" />
              </Field>
              <Field label="Phone" hint="Optional — shown on your roster profile.">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
              </Field>
              <Field label="Email" hint="Contact email from the roster — ask your captain to change it.">
                <Input value={profile?.email ?? ''} disabled />
              </Field>
            </div>
          </Card>
          <div className="flex justify-end">
            <Button type="submit" size="lg" loading={saving}>Save Profile</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
