import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { setSnaTitle } from '@/lib/brand'

export default function RestrictedPage() {
  setSnaTitle('Restricted')
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="card w-full max-w-md p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Access restricted</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          This area is only available to SNA captains. If you think this is a mistake, ask your captain to check your role.
        </p>
        <Link
          to="/portal/dashboard"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-team px-4 py-2.5 text-sm font-semibold text-team-contrast"
        >
          <ArrowLeft className="h-4 w-4" /> Back to my dashboard
        </Link>
      </div>
    </div>
  )
}
