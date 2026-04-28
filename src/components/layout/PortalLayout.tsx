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
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b border-[#e8e8e8] bg-white/95 backdrop-blur-sm flex items-center px-6 flex-shrink-0 sticky top-0 z-30">

        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-7 h-7 rounded-md bg-[#0f0f0f] flex items-center justify-center flex-shrink-0">
            <span className="font-bold text-[11px] tracking-tight select-none" style={{ color: '#ffffff' }}>SB</span>
          </div>
          <span
            className="text-[#0f0f0f] font-semibold text-[13px] tracking-tight"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            StatusBrand
          </span>
          {clientName && (
            <>
              <span className="text-[#c8c8c8] text-xs mx-1">/</span>
              <span className="text-[#a0a0a0] text-[12px]">{clientName}</span>
            </>
          )}
        </div>

        {/* Bell — sempre visível para abrir o painel de notificações */}
        <button
          onClick={onBellClick}
          title={badgeCount > 0 ? `${badgeCount} notificação${badgeCount === 1 ? '' : 'ões'} não lida${badgeCount === 1 ? '' : 's'}` : 'Notificações'}
          className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#f0f0f0] transition-colors mr-1"
        >
          <Bell className="w-4 h-4 text-[#737373]" />
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
            <div className="w-7 h-7 rounded-full bg-[#0f0f0f] border border-[#0f0f0f] flex items-center justify-center sb-invert">
              {initial !== 'C' ? (
                <span className="text-[11px] font-semibold" style={{ color: '#ffffff' }}>{initial}</span>
              ) : (
                <User className="w-3.5 h-3.5" style={{ color: '#ffffff' }} />
              )}
            </div>
            <span className="text-[13px] text-[#0f0f0f] font-medium hidden sm:block">{firstName}</span>
          </div>

          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-[12px] text-[#a0a0a0] hover:text-[#0f0f0f] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#f0f0f0]"
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
