import { LogOut, User, Bell } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface PortalLayoutProps {
  children: React.ReactNode
  clientName?: string
  unreadCount?: number
  onBellClick?: () => void
  /** @deprecated use unreadCount */
  pendingCount?: number
}

export function PortalLayout({
  children,
  clientName,
  unreadCount = 0,
  onBellClick,
  pendingCount,
}: PortalLayoutProps) {
  const { profile, signOut } = useAuth()

  // Compatibilidade retroativa: se unreadCount não foi passado mas pendingCount foi
  const badgeCount = unreadCount || pendingCount || 0

  const rawName   = profile?.full_name || ''
  const firstName = rawName.split(' ')[0] || 'Cliente'
  const initial   = (rawName || profile?.email || 'C')[0].toUpperCase()

  return (
    <div className="min-h-screen bg-[#f5f7fb] flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b border-[#e2e8f0] bg-white flex items-center px-6 flex-shrink-0 sticky top-0 z-30 shadow-sm">

        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
            <img src="/logo-icon.png" alt="Kairo Hub" className="w-full h-full object-contain select-none" draggable={false} />
          </div>
          <span
            className="text-[#0f0f0f] font-semibold text-[13px] tracking-tight"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            Kairo Hub
          </span>
          {clientName && (
            <>
              <span className="text-[#94a3b8] text-xs mx-1">/</span>
              <span className="text-[#64748b] text-[12px]">{clientName}</span>
            </>
          )}
        </div>

        {/* Bell */}
        <button
          onClick={onBellClick}
          title={badgeCount > 0 ? `${badgeCount} notificação${badgeCount === 1 ? '' : 'ões'} não lida${badgeCount === 1 ? '' : 's'}` : 'Notificações'}
          className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#f0f4f8] transition-colors mr-1"
        >
          <Bell className="w-4 h-4 text-[#374151]" />
          {badgeCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-[9px] font-bold flex items-center justify-center px-0.5 leading-none"
              style={{ color: '#ffffff' }}
            >
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </button>

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#f0f0f0] border border-[#e0e0e0] flex items-center justify-center">
              {initial !== 'C' ? (
                <span className="text-[11px] font-semibold" style={{ color: '#0f0f0f' }}>{initial}</span>
              ) : (
                <User className="w-3.5 h-3.5" style={{ color: '#374151' }} />
              )}
            </div>
            <span className="text-[13px] text-[#0f0f0f] font-medium hidden sm:block">{firstName}</span>
          </div>

          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] hover:text-[#0f0f0f] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#f0f4f8]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Sair</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
