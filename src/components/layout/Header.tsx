import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationsModal } from '@/components/NotificationsModal'

interface HeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function Header({ title, subtitle, action }: HeaderProps) {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const { data: notifications = [] } = useNotifications()
  const [showNotifications, setShowNotifications] = useState(false)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const rawName: string =
    profile?.full_name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    ''
  const firstName      = rawName.split(' ')[0] || 'usuário'
  const avatarInitial  = (rawName || profile?.email || 'U')[0].toUpperCase()
  const unreadCount    = notifications.filter(n => !n.is_read).length

  return (
    <>
      <header className="h-14 border-b border-[#e8e8e8] bg-white/95 backdrop-blur-sm flex items-center px-5 gap-4 sticky top-0 z-20">
        <div className="flex-1 min-w-0">
          <h1 className="text-[13px] font-semibold text-[#0f0f0f] leading-none">{title}</h1>
          {subtitle && <p className="text-[11px] text-[#a0a0a0] mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {action}

          {/* Bell — notificações da agência */}
          <button
            onClick={() => setShowNotifications(true)}
            title={unreadCount > 0 ? `${unreadCount} notificação${unreadCount === 1 ? '' : 'ões'} não lida${unreadCount === 1 ? '' : 's'}` : 'Notificações'}
            className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#f0f0f0] transition-colors"
          >
            <Bell className="w-4 h-4 text-[#737373]" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-[9px] font-bold flex items-center justify-center px-0.5 leading-none"
                style={{ color: '#ffffff' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 ml-1 pl-2 border-l border-[#e8e8e8]">
            <div className="text-right hidden sm:block">
              <p className="text-[11px] text-[#a0a0a0]">{greeting},</p>
              <p className="text-[11px] font-medium text-[#0f0f0f]">{firstName}</p>
            </div>
            <div className="w-7 h-7 rounded-full bg-[#0f0f0f] border border-[#0f0f0f] flex items-center justify-center text-[10px] font-semibold sb-invert">
              <span style={{ color: '#ffffff' }}>{avatarInitial}</span>
            </div>
          </div>
        </div>
      </header>

      <NotificationsModal
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        onView={(notification) => {
          setShowNotifications(false)
          navigate('/planner')
        }}
      />
    </>
  )
}
