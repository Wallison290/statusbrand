import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Moon, Sun, SunMedium, RefreshCw } from 'lucide-react'
import type { HeroPill } from '@/hooks/useDashboardGreeting'

// ── Ilustração premium ────────────────────────────────────────────────────────

function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 280 210"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="hg_ground" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hg_mug_glow" cx="50%" cy="80%" r="55%">
          <stop offset="0%" stopColor="#ede9fe" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ede9fe" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hg_coffee" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6b3a2a" />
          <stop offset="100%" stopColor="#4a2618" />
        </linearGradient>
        <linearGradient id="hg_saucer" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#faf8ff" />
          <stop offset="100%" stopColor="#f0eafa" />
        </linearGradient>
        <filter id="hg_shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#c4b5fd" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* ── Brilho no chão ── */}
      <ellipse cx="128" cy="192" rx="105" ry="14" fill="url(#hg_ground)" />

      {/* ──────────── XÍCARA / MUG ──────────── */}

      {/* Pires — sombra */}
      <ellipse cx="100" cy="184" rx="66" ry="10" fill="#e4d9f8" opacity="0.45" />

      {/* Pires — corpo */}
      <ellipse cx="100" cy="178" rx="62" ry="9" fill="url(#hg_saucer)" />
      <ellipse cx="100" cy="176" rx="57" ry="7" fill="white" stroke="#ede8fb" strokeWidth="1.2" />

      {/* Pires — anel interno */}
      <ellipse cx="100" cy="175" rx="30" ry="4" fill="none" stroke="#ece6f8" strokeWidth="0.9" />

      {/* Xícara — glow atrás */}
      <ellipse cx="100" cy="118" rx="46" ry="52" fill="url(#hg_mug_glow)" />

      {/* Xícara — corpo (forma ligeiramente afunilada no topo → base) */}
      <path
        d="M64 88 Q64 74 78 74 L122 74 Q136 74 136 88 L131 164 Q131 176 118 176 L82 176 Q69 176 69 164 Z"
        fill="white"
        filter="url(#hg_shadow)"
      />
      <path
        d="M64 88 Q64 74 78 74 L122 74 Q136 74 136 88 L131 164 Q131 176 118 176 L82 176 Q69 176 69 164 Z"
        fill="none"
        stroke="#ede8fb"
        strokeWidth="1.4"
      />

      {/* Xícara — borda superior (aro) */}
      <ellipse cx="100" cy="82" rx="36" ry="9" fill="#f7f3fe" />

      {/* Café (superfície escura dentro da xícara) */}
      <ellipse cx="100" cy="80" rx="32" ry="7.5" fill="url(#hg_coffee)" />

      {/* Café — reflexo suave */}
      <ellipse cx="94" cy="78" rx="11" ry="3.5" fill="#9c6248" opacity="0.45" />

      {/* Alça */}
      <path
        d="M136 96 C166 96 166 148 136 148"
        stroke="#ece7fb"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M136 96 C162 96 162 148 136 148"
        stroke="white"
        strokeWidth="6.5"
        strokeLinecap="round"
      />

      {/* ── Rosto da xícara (kawaii refinado) ── */}

      {/* Olho esquerdo */}
      <circle cx="86" cy="118" r="4.5" fill="#1e1232" />
      <circle cx="87.7" cy="116.4" r="1.4" fill="white" />

      {/* Olho direito */}
      <circle cx="114" cy="118" r="4.5" fill="#1e1232" />
      <circle cx="115.7" cy="116.4" r="1.4" fill="white" />

      {/* Sorriso */}
      <path
        d="M86 134 Q100 144 114 134"
        fill="none"
        stroke="#1e1232"
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* ── Vapor / steam ── */}
      <motion.g
        animate={{ y: [0, -5, 0], opacity: [0.7, 0.3, 0.7] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M84 68 C82 57 89 48 85 37" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      </motion.g>
      <motion.g
        animate={{ y: [0, -6, 0], opacity: [0.55, 0.25, 0.55] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <path d="M100 63 C98 52 105 43 101 32" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
      </motion.g>
      <motion.g
        animate={{ y: [0, -4, 0], opacity: [0.4, 0.15, 0.4] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        <path d="M115 66 C113 55 120 46 116 35" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      </motion.g>

      {/* ──────────── PLANTA ──────────── */}

      {/* Vaso — sombra */}
      <ellipse cx="210" cy="185" rx="30" ry="6" fill="#e4d9f8" opacity="0.4" />

      {/* Vaso — corpo */}
      <path d="M186 140 L191 178 L229 178 L234 140 Z" fill="white" />
      <path d="M186 140 L191 178 L229 178 L234 140 Z" fill="none" stroke="#ede8fb" strokeWidth="1.4" />

      {/* Vaso — borda superior */}
      <rect x="183" y="134" width="54" height="10" rx="5" fill="#f5f0fe" />
      <rect x="183" y="134" width="54" height="10" rx="5" fill="none" stroke="#ede8fb" strokeWidth="1" />

      {/* Folha 1 — esquerda */}
      <path
        d="M208 134 C194 108 172 95 175 70 C180 88 196 108 208 134 Z"
        fill="#4ade80"
        opacity="0.82"
      />
      <path d="M208 134 C194 108 172 95 175 70" fill="none" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />

      {/* Folha 2 — centro */}
      <path
        d="M210 133 C207 106 216 83 211 58 C207 78 205 104 210 133 Z"
        fill="#22c55e"
      />
      <path d="M210 133 C207 106 216 83 211 58" fill="none" stroke="#15803d" strokeWidth="1.6" strokeLinecap="round" />

      {/* Folha 3 — direita */}
      <path
        d="M212 134 C222 110 238 100 237 76 C228 96 216 114 212 134 Z"
        fill="#4ade80"
        opacity="0.85"
      />
      <path d="M212 134 C222 110 238 100 237 76" fill="none" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />

      {/* Folha 4 — fundo esquerda */}
      <path
        d="M207 135 C197 115 178 108 180 88 C186 104 200 120 207 135 Z"
        fill="#86efac"
        opacity="0.65"
      />

      {/* ──────────── DECORAÇÕES ──────────── */}

      {/* Estrela / sparkle grande — topo direito */}
      <motion.g
        animate={{ scale: [1, 1.12, 1], opacity: [0.85, 0.5, 0.85] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '248px 28px' }}
      >
        <path d="M248 18 L250 25 L257 27 L250 29 L248 36 L246 29 L239 27 L246 25 Z" fill="#c4b5fd" opacity="0.9" />
      </motion.g>

      {/* Estrela menor */}
      <path d="M258 52 L259.2 55.5 L263 56.8 L259.2 58 L258 61.5 L256.8 58 L253 56.8 L256.8 55.5 Z" fill="#ddd6fe" opacity="0.7" />

      {/* Círculos flutuantes */}
      <motion.circle
        cx="26" cy="62" r="5.5"
        fill="#ede9fe" opacity="0.8"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <circle cx="252" cy="90" r="3.5" fill="#ddd6fe" opacity="0.6" />
      <motion.circle
        cx="18" cy="120" r="2.5"
        fill="#c4b5fd" opacity="0.5"
        animate={{ y: [0, 4, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }}
      />
      <circle cx="22" cy="158" r="2" fill="#ddd6fe" opacity="0.4" />
      <circle cx="265" cy="140" r="2" fill="#a78bfa" opacity="0.4" />
      <circle cx="38" cy="188" r="1.5" fill="#ddd6fe" opacity="0.35" />
      <circle cx="260" cy="168" r="1.5" fill="#ddd6fe" opacity="0.3" />
    </svg>
  )
}

// ── Pill de status ─────────────────────────────────────────────────────────────

function Pill({ icon, label, variant }: HeroPill) {
  const textColor = {
    default: 'text-[#4b5563]',
    success: 'text-[#065f46]',
    warning: 'text-[#92400e]',
  }[variant] ?? 'text-[#4b5563]'

  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      className={`
        flex items-center gap-1.5 px-3.5 py-1.5 rounded-full cursor-default
        bg-white/80 backdrop-blur-sm border border-[#e9defc]
        shadow-[0_1px_4px_rgba(124,58,237,0.08)]
        ${textColor}
      `}
    >
      <span className="text-[13px] leading-none">{icon}</span>
      <span className="text-[12px] font-medium whitespace-nowrap">{label}</span>
    </motion.div>
  )
}

// ── Ícone contextual (manhã/tarde/noite) ───────────────────────────────────────

function ContextIcon({ hour }: { hour: number }) {
  const config = hour < 12
    ? { Icon: Sun,       bg: 'from-amber-400/80 to-orange-300/80' }
    : hour < 18
      ? { Icon: SunMedium, bg: 'from-sky-400/80 to-blue-300/80' }
      : { Icon: Moon,      bg: 'from-violet-500/90 to-purple-400/90' }

  return (
    <div
      className={`
        w-11 h-11 rounded-2xl flex items-center justify-center
        bg-gradient-to-br ${config.bg}
        shadow-[0_2px_12px_rgba(124,58,237,0.22)]
        flex-shrink-0
      `}
    >
      <config.Icon className="w-5 h-5 text-white" />
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface DashboardHeroProps {
  greeting: string
  userName: string
  message: string
  pills: HeroPill[]
  isLoading: boolean
  onRefresh?: () => void
}

// ── Componente principal ───────────────────────────────────────────────────────

export function DashboardHero({
  greeting,
  userName,
  message,
  pills,
  isLoading,
  onRefresh,
}: DashboardHeroProps) {

  // ── Relógio em tempo real ────────────────────────────────────────────────
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const hour = now.getHours()

  const dateStr = now.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  })
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  // Separa a saudação base do nome para destacar em roxo
  // Ex: "Boa noite, Larissa." → base="Boa noite, " + name="Larissa."
  const commaIdx = greeting.indexOf(', ')
  const greetingBase = commaIdx !== -1 ? greeting.slice(0, commaIdx + 2) : greeting + ' '
  const greetingName = commaIdx !== -1 ? greeting.slice(commaIdx + 2) : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[28px] border border-[#e8dfff] min-h-[240px]"
      style={{
        background: 'linear-gradient(135deg, #f2eaff 0%, #f7f2ff 45%, #fbf8ff 80%, #fefcff 100%)',
        boxShadow: '0 10px 40px rgba(124,58,237,0.07), 0 2px 8px rgba(124,58,237,0.04)',
      }}
    >
      {/* Brilho radial decorativo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 50% 70% at 80% 60%, rgba(192,168,255,0.22) 0%, transparent 65%)',
        }}
      />

      {/* Brilho leve no topo */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(196,181,253,0.6), transparent)' }}
      />

      <div className="relative flex items-center justify-between px-8 py-8 md:px-10 md:py-9 gap-8 min-h-[240px]">

        {/* ── Coluna esquerda ── */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0">

          {/* Ícone contextual + Data/hora */}
          <div className="flex items-center gap-3 mb-5">
            <ContextIcon hour={hour} />
            <p className="text-[13px] font-medium text-[#7c3aed] capitalize tracking-wide">
              {dateStr} • {timeStr}
            </p>
          </div>

          {/* Saudação com nome em roxo */}
          <h2 className="text-[28px] md:text-[30px] font-bold leading-tight mb-2.5 tracking-tight">
            <span className="text-[#111827]">{greetingBase}</span>
            <span className="text-[#7c3aed]">{greetingName}</span>
          </h2>

          {/* Mensagem dinâmica */}
          <div className="min-h-[40px] mb-5">
            {isLoading ? (
              <div className="space-y-1.5">
                <div className="h-[14px] w-72 rounded-full bg-[#7c3aed]/8 animate-pulse" />
                <div className="h-[14px] w-52 rounded-full bg-[#7c3aed]/5 animate-pulse" />
              </div>
            ) : (
              <motion.p
                key={message}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-[14px] text-[#6b7280] leading-relaxed max-w-lg"
              >
                {message}
              </motion.p>
            )}
          </div>

          {/* Pills */}
          <div className="flex flex-wrap gap-2 min-h-[34px]">
            {isLoading ? (
              <>
                <div className="h-[30px] w-38 rounded-full bg-white/70 border border-[#e9defc] animate-pulse" style={{ width: 148 }} />
                <div className="h-[30px] rounded-full bg-white/70 border border-[#e9defc] animate-pulse" style={{ width: 192 }} />
                <div className="h-[30px] rounded-full bg-white/70 border border-[#e9defc] animate-pulse" style={{ width: 132 }} />
              </>
            ) : (
              pills.map((pill, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.28, ease: 'easeOut' }}
                >
                  <Pill {...pill} />
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* ── Ilustração ── */}
        <div className="hidden lg:flex flex-shrink-0 items-end justify-center self-end pb-0" style={{ width: 240, height: 210 }}>
          <HeroIllustration />
        </div>
      </div>

      {/* Refresh (discreto) */}
      {onRefresh && !isLoading && (
        <motion.button
          whileHover={{ scale: 1.1, rotate: 20 }}
          whileTap={{ scale: 0.92 }}
          onClick={onRefresh}
          title="Atualizar mensagem da IA"
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-[#c4b5fd] hover:text-[#7c3aed] hover:bg-[#7c3aed]/8 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </motion.button>
      )}
    </motion.div>
  )
}
