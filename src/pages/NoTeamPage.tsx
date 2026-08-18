import { useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { snaBrand, setSnaTitle } from '@/lib/brand'

export default function NoTeamPage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  setSnaTitle('Not on a team')

  const handleBackToCode = async () => {
    try {
      await signOut()
    } catch {
      /* best-effort */
    }
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10 dark:bg-[#0b1220]">
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <img src={snaBrand.logo} alt="SNA" className="h-9 max-w-[220px] object-contain" draggable={false} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">You’re not on a team yet</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Enter your team’s code to jump in — no email or password needed.
          </p>
        </div>
      </div>

      <div className="card w-full max-w-md space-y-4 p-6 text-center sm:p-8">
        <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Ask your captain for the team code, then enter it on the next screen.
        </p>
        <Button onClick={handleBackToCode} className="w-full" size="lg">
          <KeyRound className="h-4 w-4" /> Back to team code
        </Button>
      </div>
    </div>
  )
}
