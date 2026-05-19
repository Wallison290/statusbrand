import { motion } from 'framer-motion'
import { Sparkles, RefreshCw } from 'lucide-react'
import type { HeroPill } from '@/hooks/useDashboardGreeting'

// ── Ilustração lateral ─────────────────────────────────────────────────────────

function HeroIllustration() {
  return (
    <div className="relative w-[210px] h-[175px] select-none pointer-events-none">
      <svg
        viewBox="0 0 210 175"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Brilho no chão */}
        <ellipse cx="105" cy="155" rx="82" ry="16" fill="url(#heroGlow)" />

        {/* Plataforma */}
        <rect x="25" y="147" width="160" height="9" rx="4.5" fill="#e9d5ff" opacity="0.65" />

        {/* Caneca — corpo */}
        <rect x="54" y="70" width="88" height="78" rx="15" fill="white" />
        <rect x="54" y="70" width="88" height="78" rx="15" stroke="#ede9fe" strokeWidth="1.5" />

        {/* Caneca — borda interior (boca) */}
        <rect x="59" y="73" width="78" height="8" rx="4" fill="#f5f3ff" />

        {/* Caneca — alça */}
        <path
          d="M142 86 C170 86 170 126 142 126"
          stroke="#e0d9ff"
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* Vapor / steam */}
        <motion.path
          d="M86 65 C84 55 90 47 86 37"
          stroke="#c4b5fd"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ opacity: 0.3, y: 0 }}
          animate={{ opacity: [0.3, 0.7, 0.3], y: [0, -4, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.path
          d="M105 60 C103 50 109 42 105 32"
          stroke="#c4b5fd"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ opacity: 0.2, y: 0 }}
          animate={{ opacity: [0.2, 0.6, 0.2], y: [0, -5, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        />

        {/* Logo SB na caneca */}
        <text
          x="98"
          y="117"
          textAnchor="middle"
          fill="#7c3aed"
          fontSize="23"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
        >
          SB
        </text>

        {/* Vaso da planta */}
        <rect x="152" y="112" width="30" height="26" rx="5.5" fill="#ddd6fe" />
        <rect x="149" y="109" width="36" height="7" rx="3.5" fill="#c4b5fd" />

        {/* Folhas da planta */}
        <ellipse
          cx="167"
          cy="92"
          rx="6.5"
          ry="19"
          transform="rotate(-20 167 92)"
          fill="#a78bfa"
          opacity="0.85"
        />
        <ellipse
          cx="171"
          cy="94"
          rx="5.5"
          ry="15"
          transform="rotate(14 171 94)"
          fill="#8b5cf6"
          opacity="0.75"
        />
        <ellipse
          cx="164"
          cy="95"
          rx="4.5"
          ry="13"
          transform="rotate(-34 164 95)"
          fill="#7c3aed"
          opacity="0.65"
        />

        {/* Estrela / sparkle */}
        <motion.path
          d="M175 30 L177 37 L184 39 L177 41 L175 48 L173 41 L166 39 L173 37 Z"
          fill="#c4b5fd"
          opacity="0.9"
          animate={{ scale: [1, 1.1, 1], opacity: [0.9, 0.6, 0.9] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Círculos flutuantes */}
        <motion.circle
          cx="36"
          cy="62"
          r="4.5"
          fill="#e9d5ff"
          opacity="0.8"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <circle cx="180" cy="55" r="3" fill="#ddd6fe" opacity="0.7" />
        <circle cx="30" cy="122" r="2.5" fill="#c4b5fd" opacity="0.6" />
        <motion.circle
          cx="185"
          cy="95"
          r="2"
          fill="#a78bfa"
          opacity="0.5"
          animate={{ y: [0, 3, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
        />
        <circle cx="42" cy="90" r="1.5" fill="#ddd6fe" opacity="0.6" />
        <circle cx="192" cy="140" r="1.5" fill="#ddd6fe" opacity="0.45" />

        <defs>
          <radialGradient id="heroGlow" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
}

// ── Pill de status ─────────────────────────────────────────────────────────────

function Pill({ icon, label, variant }: HeroPill) {
  const textClass = {
    default: 'text-[#374151]',
    success: 'text-[#065f46]',
    warning: 'text-[#92400e]',
  }[variant] ?? 'text-[#374151]'

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 backdrop-blur-sm border border-[#e9e9ef] cursor-default"
    >
      <span className="text-[14px] leading-none">{icon}</span>
      <span className={`text-[13px] font-medium ${textClass}`}>{label}</span>
    </motion.div>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface DashboardHeroProps {
  greeting: string
  message: string
  pills: HeroPill[]
  isLoading: boolean
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
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[28px] border border-[#ece7ff] shadow-[0_10px_40px_rgba(124,58,237,0.06)]"
      style={{
        background: 'linear-gradient(135deg, #f3ecff 0%, #f8f6ff 55%, #faf7ff 100%)',
      }}
    >
      {/* Brilho radial decorativo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 60% at 85% 50%, rgba(196,181,253,0.28) 0%, transparent 70%)',
        }}
      />

      <div className="relative flex items-center justify-between px-8 py-7 md:px-10 md:py-9 gap-6">

        {/* ── Esquerda: conteúdo ── */}
        <div className="flex-1 min-w-0">

          {/* Badge IA */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7c3aed]/8 border border-[#7c3aed]/15 mb-5">
            <Sparkles className="w-3 h-3 text-[#7c3aed]" />
            <span className="text-[11px] font-semibold text-[#7c3aed] uppercase tracking-wider">IA Copilot</span>
          </div>

          {/* Saudação */}
          <h2 className="text-[26px] md:text-[28px] font-bold text-[#1a1a1a] leading-tight mb-2.5">
            {greeting}
          </h2>

          {/* Mensagem dinâmica */}
          <div className="min-h-[22px] mb-6">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-72 rounded-full bg-[#7c3aed]/10 animate-pulse" />
              </div>
            ) : (
              <motion.p
                key={message}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="text-[14px] text-[#6b7280] leading-relaxed max-w-xl"
              >
                {message}
              </motion.p>
            )}
          </div>

          {/* Pills */}
          <div className="flex flex-wrap gap-2 min-h-[38px]">
            {isLoading ? (
              <>
                <div className="h-9 w-40 rounded-full bg-white/60 border border-[#e9e9ef] animate-pulse" />
                <div className="h-9 w-52 rounded-full bg-white/60 border border-[#e9e9ef] animate-pulse" />
                <div className="h-9 w-36 rounded-full bg-white/60 border border-[#e9e9ef] animate-pulse" />
              </>
            ) : (
              pills.map((pill, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.07, duration: 0.3, ease: 'easeOut' }}
                >
                  <Pill {...pill} />
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* ── Direita: ilustração ── */}
        <div className="hidden lg:flex flex-shrink-0 items-center justify-center pr-2">
          <HeroIllustration />
        </div>
      </div>

      {/* Botão de refresh (canto superior direito) */}
      {onRefresh && !isLoading && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          title="Atualizar mensagem da IA"
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-[#9ca3af] hover:text-[#7c3aed] hover:bg-[#7c3aed]/10 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </motion.button>
      )}
    </motion.div>
  )
}
