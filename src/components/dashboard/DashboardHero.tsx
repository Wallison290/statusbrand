import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Moon, Sun, SunMedium, RefreshCw, Bell } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { HeroPill } from '@/hooks/useDashboardGreeting'
import { DashboardHeroArt } from './DashboardHeroArt'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationsModal } from '@/components/NotificationsModal'
import { UserMenu } from '@/components/layout/UserMenu'

// ── Pill (dark glassmorphism) ─────────────────────────────────────────────────

function Pill({ icon, label, variant, href }: HeroPill) {
  const style = {
    default: {
      bg:        'rgba(255,255,255,0.07)',
      bgHover:   'rgba(255,255,255,0.13)',
      border:    'rgba(255,255,255,0.13)',
      color:     '#94a3b8',
    },
    success: {
      bg:        'rgba(16,185,129,0.10)',
      bgHover:   'rgba(16,185,129,0.18)',
      border:    'rgba(16,185,129,0.22)',
      color:     '#34d399',
    },
    warning: {
      bg:        'rgba(245,158,11,0.10)',
      bgHover:   'rgba(245,158,11,0.18)',
      border:    'rgba(245,158,11,0.22)',
      color:     '#fbbf24',
    },
  }[variant] ?? {
    bg: 'rgba(255,255,255,0.07)', bgHover: 'rgba(255,255,255,0.13)', border: 'rgba(255,255,255,0.13)', color: '#94a3b8',
  }

  const inner = (
    <motion.div
      whileHover={{ scale: 1.04, y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      className="flex items-center gap-1.5 px-3 py-[5px] rounded-full backdrop-blur-sm transition-colors"
      style={{
        background: style.bg,
        border:     `1px solid ${style.border}`,
        color:      style.color,
        boxShadow:  '0 1px 6px rgba(0,0,0,0.18)',
        cursor:     href ? 'pointer' : 'default',
      }}
      onMouseEnter={e => { if (href) (e.currentTarget as HTMLDivElement).style.background = style.bgHover }}
      onMouseLeave={e => { if (href) (e.currentTarget as HTMLDivElement).style.background = style.bg }}
    >
      <span className="text-[12px] leading-none">{icon}</span>
      <span className="text-[11.5px] font-medium whitespace-nowrap">{label}</span>
    </motion.div>
  )

  if (href) return <Link to={href} className="block">{inner}</Link>
  return inner
}

// ── Context icon — dark glass ─────────────────────────────────────────────────

function ContextIcon({ hour }: { hour: number }) {
  const cfg =
    hour < 12
      ? { Icon: Sun,       bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.22)',  color: '#fbbf24' }
      : hour < 18
        ? { Icon: SunMedium, bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.22)',  color: '#60a5fa' }
        : { Icon: Moon,      bg: 'rgba(52,211,153,0.14)',  border: 'rgba(52,211,153,0.24)',  color: '#34d399' }

  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <cfg.Icon style={{ width: 17, height: 17, color: cfg.color }} />
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DashboardHeroProps {
  greeting:   string
  userName:   string
  message:    string
  pills:      HeroPill[]
  isLoading:  boolean
  onRefresh?: () => void
}

// ── Componente principal ───────────────────────────────────────────────────────

export function DashboardHero({
  greeting,
  message,
  pills,
  isLoading,
  onRefresh,
}: DashboardHeroProps) {

  const navigate = useNavigate()
  const { data: notifications = [] } = useNotifications()
  const [showNotifications, setShowNotifications] = useState(false)
  const unreadCount = notifications.filter((n: { is_read: boolean }) => !n.is_read).length

  // ── Relógio em tempo real ────────────────────────────────────────────────────
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const hour    = now.getHours()
  const dateStr = now.toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', weekday: 'long',
  })
  const timeStr = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
  })

  // Separa saudação base do nome
  const commaIdx     = greeting.indexOf(', ')
  const greetingBase = commaIdx !== -1 ? greeting.slice(0, commaIdx + 2) : greeting + ' '
  const greetingName = commaIdx !== -1 ? greeting.slice(commaIdx + 2)    : ''

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-b-[28px] border-b border-x border-[#1a2035] min-h-[240px]"
      style={{
        background: 'linear-gradient(135deg, #050816 0%, #0c1120 45%, #111827 100%)',
        boxShadow:  '0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.25)',
      }}
    >
      {/* ── Glow verde — esquerda ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 80% at 8% 55%, rgba(5,150,105,0.14) 0%, transparent 65%)',
        }}
      />

      {/* ── Glow verde — direita-inferior (muito sutil) ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 40% 55% at 95% 90%, rgba(52,211,153,0.06) 0%, transparent 62%)',
        }}
      />

      {/* ── Linha topo iluminada ── */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(5,150,105,0.5) 35%, rgba(52,211,153,0.35) 65%, transparent 100%)',
        }}
      />

      {/* ── Partículas / dots decorativos ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-8  left-[12%] w-1 h-1 rounded-full bg-purple-400/20" />
        <div className="absolute top-16 right-[30%] w-0.5 h-0.5 rounded-full bg-blue-400/15" />
        <div className="absolute bottom-10 left-[25%] w-0.5 h-0.5 rounded-full bg-purple-300/15" />
      </div>

      {/* ── Conteúdo principal ── */}
      <div className="relative flex items-center justify-between px-8 py-8 md:px-12 md:py-9 gap-6 min-h-[240px]">

        {/* Coluna esquerda */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">

          {/* Ícone contextual + data/hora */}
          <div className="flex items-center gap-2.5 mb-4">
            <ContextIcon hour={hour} />
            <p className="text-[12.5px] font-semibold capitalize tracking-wide"
               style={{ color: '#34d399' }}>
              {dateStr} • {timeStr}
            </p>
          </div>

          {/* Saudação */}
          <h2
            className="text-[30px] md:text-[32px] font-bold leading-tight mb-2.5 tracking-[-0.4px]"
          >
            <span style={{ color: '#f1f5f9' }}>{greetingBase}</span>
            <span
              style={{
                color:      '#34d399',
                textShadow: '0 0 28px rgba(52,211,153,0.45)',
              }}
            >
              {greetingName}
            </span>
          </h2>

          {/* Mensagem da IA */}
          <div className="min-h-[38px] mb-5">
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-[13px] w-72 rounded-full bg-white/[0.07] animate-pulse" />
                <div className="h-[13px] w-48 rounded-full bg-white/[0.05] animate-pulse" />
              </div>
            ) : (
              <motion.p
                key={message}
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="text-[13.5px] leading-relaxed"
                style={{ color: '#64748b' }}
              >
                {message}
              </motion.p>
            )}
          </div>

          {/* Pills */}
          <div className="flex flex-wrap gap-2 min-h-[32px]">
            {isLoading ? (
              <>
                <div className="h-[28px] rounded-full bg-white/[0.07] animate-pulse" style={{ width: 142 }} />
                <div className="h-[28px] rounded-full bg-white/[0.05] animate-pulse" style={{ width: 188 }} />
                <div className="h-[28px] rounded-full bg-white/[0.05] animate-pulse" style={{ width: 130 }} />
              </>
            ) : (
              pills.map((pill, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9, y: 3 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.24, ease: 'easeOut' }}
                >
                  <Pill {...pill} />
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Coluna direita — ilustração */}
        <div
          className="hidden lg:flex flex-shrink-0 items-end self-end"
          style={{ width: 265, height: 225 }}
        >
          <DashboardHeroArt dark />
        </div>
      </div>

      {/* ── Canto superior direito: Sino + Avatar + Refresh ── */}
      <div className="absolute top-3 right-3 flex items-center gap-1">

        {/* Sino de notificações */}
        <button
          onClick={() => setShowNotifications(true)}
          title={unreadCount > 0 ? `${unreadCount} notificação${unreadCount === 1 ? '' : 'ões'} não lida${unreadCount === 1 ? '' : 's'}` : 'Notificações'}
          className="relative flex items-center justify-center w-8 h-8 rounded-xl transition-colors"
          style={{ color: 'rgba(52,211,153,0.6)', background: 'rgba(255,255,255,0.05)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] rounded-full bg-red-500 text-[8px] font-bold flex items-center justify-center px-0.5 leading-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Avatar */}
        <UserMenu dark />

        {/* Refresh discreto */}
        {onRefresh && !isLoading && (
          <motion.button
            whileHover={{ scale: 1.12, rotate: 20 }}
            whileTap={{ scale: 0.9 }}
            onClick={onRefresh}
            title="Atualizar mensagem da IA"
            className="w-7 h-7 flex items-center justify-center rounded-full transition-all"
            style={{ color: 'rgba(167,139,250,0.5)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#34d399')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(52,211,153,0.5)')}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </div>

      <NotificationsModal
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        onView={(notification) => {
          setShowNotifications(false)
          if (notification.link) navigate(`/planner?item=${notification.link}`)
          else navigate('/planner')
        }}
      />
    </motion.div>
  )
}
