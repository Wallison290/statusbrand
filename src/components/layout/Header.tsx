import { useAuth } from '@/hooks/useAuth'

interface HeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function Header({ title, subtitle, action }: HeaderProps) {
  const { profile, user } = useAuth()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const rawName: string =
    profile?.full_name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    ''
  const firstName   = rawName.split(' ')[0] || 'usuário'
  const avatarInitial = (rawName || profile?.email || 'U')[0].toUpperCase()

  return (
    <header className="h-14 border-b border-[#e8e8e8] bg-white/95 backdrop-blur-sm flex items-center px-5 gap-4 sticky top-0 z-20">
      <div className="flex-1 min-w-0">
        <h1 className="text-[13px] font-semibold text-[#0f0f0f] leading-none">{title}</h1>
        {subtitle && <p className="text-[11px] text-[#a0a0a0] mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        {action}

        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-[#e8e8e8]">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] text-[#a0a0a0]">{greeting},</p>
            <p className="text-[11px] font-medium text-[#0f0f0f]">{firstName}</p>
          </div>
          <div className="w-7 h-7 rounded-full bg-[#0f0f0f] border border-[#0f0f0f] flex items-center justify-center text-[10px] font-semibold sb-invert">
            <span className="text-white">{avatarInitial}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
