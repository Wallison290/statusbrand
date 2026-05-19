import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Moon, Sun, SunMedium, RefreshCw } from 'lucide-react'
import type { HeroPill } from '@/hooks/useDashboardGreeting'
import { DashboardHeroArt } from './DashboardHeroArt'

// ── Pill ──────────────────────────────────────────────────────────────────────

function Pill({ icon, label, variant }: HeroPill) {
  const style = {
    default: { bg: '#ffffff',  border: '#e5e7eb', color: '#374151' },
    success: { bg: '#f0fdf4',  border: '#bbf7d0', color: '#15803d' },
    warning: { bg: '#fffbeb',  border: '#fde68a', color: '#92400e' },
  }[variant] ?? { bg: '#ffffff', border: '#e5e7eb', color: '#374151' }

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      className="flex items-center gap-1.5 px-3 py-[5px] rounded-full cursor-default"
      style={{
        background:  style.bg,
        border:      `1px solid ${style.border}`,
        color:       style.color,
        boxShadow:   '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <span className="text-[12px] leading-none">{icon}</span>
      <span className="text-[11.5px] font-medium whitespace-nowrap">{label}</span>
    </motion.div>
  )
}

// ── Context icon (manhã / tarde / noite) ──────────────────────────────────────

function ContextIcon({ hour }: { hour: number }) {
  const cfg =
    hour < 12
      ? { Icon: Sun,       bg: '#fffbeb', border: '#fde68a', color: '#d97706' }
      : hour < 18
        ? { Icon: SunMedium, bg: '#f0f9ff', border: '#bae6fd', color: '#0284c7' }
        : { Icon: Moon,      bg: '#f5f3ff', border: '#ddd6fe', color: '#7c3aed' }

  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
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

  // ── Relógio em tempo real ────────────────────────────────────────────────────
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const hour    = now.getHours()
  const dateStr = now.toLocaleDateString('pt-BR', {
    day:     'numeric',
    month:   'long',
    weekday: 'long',
  })
  const timeStr = now.toLocaleTimeString('pt-BR', {
    hour:   '2-digit',
    minute: '2-digit',
  })

  // Separa "Boa noite, " de "Larissa." para realce em roxo
  const commaIdx    = greeting.indexOf(', ')
  const greetingBase = commaIdx !== -1 ? greeting.slice(0, commaIdx + 2) : greeting + ' '
  const greetingName = commaIdx !== -1 ? greeting.slice(commaIdx + 2)    : ''

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-b-[28px] border-b border-x border-[#eaecf0] min-h-[240px]"
      style={{
        background: 'linear-gradient(155deg, #ffffff 0%, #fafbff 40%, #f5f7fb 100%)',
        boxShadow:  '0 1px 2px rgba(0,0,0,0.03), 0 14px 48px rgba(109,40,217,0.055)',
      }}
    >
      {/* Glow radial esquerdo — subtil */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 45% 80% at 0% 55%, rgba(139,92,246,0.055) 0%, transparent 65%)',
        }}
      />
      {/* Glow radial direito-inferior */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 40% 55% at 100% 100%, rgba(139,92,246,0.035) 0%, transparent 65%)',
        }}
      />

      {/* ── Conteúdo principal ── */}
      <div className="relative flex items-center justify-between px-8 py-8 md:px-12 md:py-9 gap-6 min-h-[240px]">

        {/* Coluna esquerda */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">

          {/* Ícone + data/hora */}
          <div className="flex items-center gap-2.5 mb-4">
            <ContextIcon hour={hour} />
            <p className="text-[12.5px] font-semibold text-[#8b5cf6] capitalize tracking-wide">
              {dateStr} • {timeStr}
            </p>
          </div>

          {/* Saudação */}
          <h2 className="text-[30px] md:text-[32px] font-bold leading-tight mb-2.5 tracking-[-0.4px]">
            <span className="text-[#0a0a0a]">{greetingBase}</span>
            <span className="text-[#6d28d9]">{greetingName}</span>
          </h2>

          {/* Mensagem da IA */}
          <div className="min-h-[38px] mb-5">
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-[13px] w-72 rounded-full bg-black/[0.04] animate-pulse" />
                <div className="h-[13px] w-48 rounded-full bg-black/[0.03] animate-pulse" />
              </div>
            ) : (
              <motion.p
                key={message}
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="text-[13.5px] text-[#6b7280] leading-relaxed"
              >
                {message}
              </motion.p>
            )}
          </div>

          {/* Pills */}
          <div className="flex flex-wrap gap-2 min-h-[32px]">
            {isLoading ? (
              <>
                <div className="h-[28px] rounded-full bg-black/[0.04] animate-pulse" style={{ width: 142 }} />
                <div className="h-[28px] rounded-full bg-black/[0.03] animate-pulse" style={{ width: 188 }} />
                <div className="h-[28px] rounded-full bg-black/[0.03] animate-pulse" style={{ width: 130 }} />
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
          <DashboardHeroArt />
        </div>
      </div>

      {/* Refresh discreto */}
      {onRefresh && !isLoading && (
        <motion.button
          whileHover={{ scale: 1.12, rotate: 20 }}
          whileTap={{ scale: 0.9 }}
          onClick={onRefresh}
          title="Atualizar mensagem da IA"
          className="
            absolute top-4 right-4 w-7 h-7
            flex items-center justify-center rounded-full
            text-[#c4b5fd] hover:text-[#7c3aed]
            hover:bg-[#7c3aed]/[0.06] transition-all
          "
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </motion.button>
      )}
    </motion.div>
  )
}
