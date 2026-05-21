import { useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { Menu, Clock } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useSubscription } from '@/hooks/useSubscription'

function TrialBanner() {
  const { data: sub } = useSubscription()
  if (!sub?.isTrialing || sub.trialDaysLeft === null) return null
  const days = sub.trialDaysLeft
  return (
    <div className="w-full bg-amber-500 text-white text-center py-2 px-4 text-[12.5px] font-medium flex items-center justify-center gap-2 flex-shrink-0">
      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
      {days === 0
        ? 'Seu período de teste termina hoje. '
        : `Período de teste: ${days} dia${days !== 1 ? 's' : ''} restante${days !== 1 ? 's' : ''}. `}
      <Link to="/planos" className="underline underline-offset-2 hover:no-underline font-semibold">
        Assine agora →
      </Link>
    </div>
  )
}

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — fixed overlay on mobile, static on md+ */}
      <div
        className={`
          fixed md:relative inset-y-0 left-0 z-40 md:z-auto h-full
          transition-transform duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <Sidebar onMobileClose={() => setMobileOpen(false)} />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar — only visible below md */}
        <div className="flex md:hidden items-center h-12 px-4 bg-[#0f0f0f] border-b border-white/10 flex-shrink-0 gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Abrir menu"
          >
            <Menu className="w-4 h-4 text-white/70" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-white/15 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-[8px] select-none">SB</span>
            </div>
            <span
              className="text-[13px] font-semibold text-white tracking-tight"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              Status<span style={{ fontWeight: 700 }}>Brand</span>
            </span>
          </div>
        </div>

        <TrialBanner />
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
