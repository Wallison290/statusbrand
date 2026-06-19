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
      <Link to="/assinatura" className="underline underline-offset-2 hover:no-underline font-semibold">
        Assine agora →
      </Link>
    </div>
  )
}

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden" style={{ background: 'var(--sm-bg-page)' }}>

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

      <main className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        {/* Botão de menu flutuante — só no mobile, sem barra ocupando o topo */}
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden fixed top-3 left-3 z-30 w-9 h-9 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-black/60 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-4 h-4 text-white/80" />
        </button>

        <TrialBanner />
        <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
