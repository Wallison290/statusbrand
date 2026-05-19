'use client'
import { motion } from 'framer-motion'

// ── Ilustração SVG premium ────────────────────────────────────────────────────

export function DashboardHeroArt({ dark = false }: { dark?: boolean }) {
  // No modo dark, o glow ambiente fica mais intenso para contrastar com o fundo escuro
  const glowOpacity = dark ? '0.42' : '0.13'
  const mugShadowOpacity = dark ? '0.32' : '0.09'

  return (
    <svg
      viewBox="0 0 320 228"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      aria-hidden="true"
    >
      <defs>
        {/* Mug: lateral gradient — warm left, pure white center, soft right */}
        <linearGradient id="art_mug" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#ede8ff" />
          <stop offset="42%"  stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e4ddf6" />
        </linearGradient>

        {/* Coffee surface */}
        <linearGradient id="art_coffee" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%"   stopColor="#251005" />
          <stop offset="100%" stopColor="#130a02" />
        </linearGradient>

        {/* Wooden saucer — face */}
        <linearGradient id="art_wood_face" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#cf9d64" />
          <stop offset="100%" stopColor="#a8733c" />
        </linearGradient>

        {/* Wooden saucer — side depth */}
        <linearGradient id="art_wood_side" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#a87340" />
          <stop offset="100%" stopColor="#845a1e" />
        </linearGradient>

        {/* Plant pot */}
        <linearGradient id="art_pot" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#f6f2ff" />
          <stop offset="100%" stopColor="#ece5f8" />
        </linearGradient>

        {/* Ambient glow */}
        <radialGradient id="art_ambient" cx="40%" cy="65%" r="52%">
          <stop offset="0%"   stopColor="#c4b5fd" stopOpacity={glowOpacity} />
          <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0"           />
        </radialGradient>

        {/* Mug drop shadow */}
        <filter id="art_mug_f" x="-22%" y="-12%" width="144%" height="144%">
          <feDropShadow dx="0" dy="10" stdDeviation="14"
            floodColor="#7c3aed" floodOpacity={mugShadowOpacity} />
        </filter>

        {/* Saucer shadow */}
        <filter id="art_sau_f" x="-20%" y="-60%" width="140%" height="200%">
          <feDropShadow dx="0" dy="5" stdDeviation="7"
            floodColor="#000" floodOpacity="0.07" />
        </filter>

        {/* Plant shadow */}
        <filter id="art_plt_f" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="8"
            floodColor="#7c3aed" floodOpacity="0.07" />
        </filter>
      </defs>

      {/* ── Ambient glow ── */}
      <ellipse cx="155" cy="158" rx="148" ry="72" fill="url(#art_ambient)" />

      {/* ── Ground shadow ── */}
      <ellipse cx="126" cy="208" rx="90" ry="8" fill="#00000008" />

      {/* ═══════════════════ SAUCER ═══════════════════ */}

      {/* Side depth */}
      <ellipse cx="126" cy="199" rx="76" ry="13"
        fill="url(#art_wood_side)"
        filter="url(#art_sau_f)"
      />

      {/* Top face */}
      <ellipse cx="126" cy="193" rx="76" ry="12"
        fill="url(#art_wood_face)"
      />

      {/* Grain lines */}
      <path d="M76 191 Q126 187 176 191" stroke="#b88040" strokeWidth="0.9" opacity="0.38" />
      <path d="M78 194 Q126 190 174 194" stroke="#b88040" strokeWidth="0.7" opacity="0.28" />

      {/* Highlight streak */}
      <ellipse cx="106" cy="191" rx="21" ry="3.5" fill="#e0b87a" opacity="0.38" />

      {/* Cup resting groove */}
      <ellipse cx="126" cy="192" rx="44" ry="7.5"
        fill="none" stroke="#9a6430" strokeWidth="1" opacity="0.32" />

      {/* ═══════════════════ MUG ═══════════════════ */}

      {/* Body */}
      <path
        d="M90 91 C90 75 100 69 114 69 L138 69 C152 69 162 75 162 91
           L158 179 C158 187 152 191 140 191 L112 191 C100 191 94 187 94 179 Z"
        fill="url(#art_mug)"
        filter="url(#art_mug_f)"
      />

      {/* Right-side shading */}
      <path
        d="M150 71 C158 76 162 83 162 91 L158 179 C158 187 152 191 140 191
           L148 191 C160 191 166 185 166 177 L162 89 C162 81 157 74 150 71 Z"
        fill="#b8aee0"
        opacity="0.15"
      />

      {/* Outline */}
      <path
        d="M90 91 C90 75 100 69 114 69 L138 69 C152 69 162 75 162 91
           L158 179 C158 187 152 191 140 191 L112 191 C100 191 94 187 94 179 Z"
        fill="none"
        stroke="#e2dbf4"
        strokeWidth="1"
      />

      {/* ── Rim ── */}
      <ellipse cx="126" cy="81" rx="36" ry="13" fill="#f0eaff" />

      {/* Coffee surface */}
      <ellipse cx="126" cy="79" rx="32" ry="10" fill="url(#art_coffee)" />

      {/* Crema highlight */}
      <ellipse cx="117" cy="77" rx="11" ry="3"   fill="#4a2010" opacity="0.42" />
      <ellipse cx="133" cy="76" rx="5"  ry="1.8" fill="#6a3018" opacity="0.18" />

      {/* ── Handle ── */}
      <path
        d="M162 99 C200 99 200 163 162 163"
        stroke="#ddd5f5" strokeWidth="14"
        strokeLinecap="round" fill="none"
      />
      <path
        d="M162 99 C196 99 196 163 162 163"
        stroke="white" strokeWidth="8"
        strokeLinecap="round" fill="none"
      />

      {/* ── Face ── */}
      <circle cx="112" cy="127" r="4"   fill="#1a0e30" />
      <circle cx="113.5" cy="125.5" r="1.2" fill="white" />
      <circle cx="140" cy="127" r="4"   fill="#1a0e30" />
      <circle cx="141.5" cy="125.5" r="1.2" fill="white" />
      <path
        d="M112 142 Q126 152 140 142"
        fill="none" stroke="#1a0e30"
        strokeWidth="2.5" strokeLinecap="round"
      />

      {/* ── Steam ── */}
      <motion.path
        d="M110 63 C108 52 115 44 111 33"
        stroke="#c4b5fd" strokeWidth="2.3" strokeLinecap="round"
        animate={{ y: [0, -7, 0], opacity: [0.55, 0.18, 0.55] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M126 59 C124 48 131 40 127 29"
        stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round"
        animate={{ y: [0, -8, 0], opacity: [0.4, 0.12, 0.4] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      />
      <motion.path
        d="M142 62 C140 51 147 43 143 32"
        stroke="#c4b5fd" strokeWidth="1.7" strokeLinecap="round"
        animate={{ y: [0, -6, 0], opacity: [0.28, 0.08, 0.28] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 1.1 }}
      />

      {/* ═══════════════════ PLANT ═══════════════════ */}

      {/* Ground shadow */}
      <ellipse cx="258" cy="208" rx="30" ry="5.5" fill="#00000009" />

      {/* Pot body */}
      <path
        d="M234 165 L239 197 L277 197 L282 165 Z"
        fill="url(#art_pot)"
        filter="url(#art_plt_f)"
      />
      <path
        d="M234 165 L239 197 L277 197 L282 165 Z"
        fill="none" stroke="#e0d8f5" strokeWidth="0.8"
      />

      {/* Pot rim */}
      <rect x="231" y="158" width="54" height="10" rx="5" fill="#f3eeff" />
      <rect x="231" y="158" width="54" height="10" rx="5"
        fill="none" stroke="#e0d8f5" strokeWidth="0.8" />

      {/* Soil */}
      <ellipse cx="258" cy="164" rx="22" ry="4" fill="#5a3820" opacity="0.3" />

      {/* Leaf 1 — arching left */}
      <path
        d="M256 158 C240 139 228 117 234 95
           C240 113 250 137 258 158 Z"
        fill="#2db554" opacity="0.85"
      />
      <path d="M256 158 C240 139 228 117 234 95"
        fill="none" stroke="#1a8c38" strokeWidth="1.3"
        strokeLinecap="round" opacity="0.58"
      />

      {/* Leaf 2 — center upright */}
      <path
        d="M258 155 C255 133 263 112 259 89
           C254 113 252 135 258 155 Z"
        fill="#25c44a"
      />
      <path d="M258 155 C255 133 263 112 259 89"
        fill="none" stroke="#15943a" strokeWidth="1.3"
        strokeLinecap="round"
      />

      {/* Leaf 3 — arching right */}
      <path
        d="M260 158 C274 139 284 119 278 97
           C272 117 264 139 260 158 Z"
        fill="#2db554" opacity="0.88"
      />
      <path d="M260 158 C274 139 284 119 278 97"
        fill="none" stroke="#1a8c38" strokeWidth="1.3"
        strokeLinecap="round" opacity="0.58"
      />

      {/* Leaf 4 — background left */}
      <path
        d="M255 151 C244 133 236 113 240 93
           C246 111 254 131 257 151 Z"
        fill="#5de07a" opacity="0.48"
      />

      {/* ═══════════════════ SPARKLES & DOTS ═══════════════════ */}

      {/* Top-right star */}
      <motion.g
        style={{ transformOrigin: '275px 30px' }}
        animate={{ scale: [1, 1.18, 1], opacity: [0.72, 0.32, 0.72] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d="M275 20 L277 27 L284 29 L277 31 L275 38 L273 31 L266 29 L273 27 Z"
          fill="#c4b5fd" opacity="0.82"
        />
      </motion.g>

      {/* Small star */}
      <path
        d="M290 61 L291.2 65 L295.5 66.2 L291.2 67.4 L290 71.4
           L288.8 67.4 L284.5 66.2 L288.8 65 Z"
        fill="#ddd6fe" opacity="0.52"
      />

      {/* Left floating dots */}
      <motion.circle cx="30" cy="70" r="5"
        fill="#ede9fe" opacity="0.62"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.circle cx="22" cy="130" r="2.8"
        fill="#c4b5fd" opacity="0.38"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.9 }}
      />
      <circle cx="24" cy="170" r="2"   fill="#ddd6fe" opacity="0.28" />

      {/* Right dots */}
      <circle cx="298" cy="98"  r="3" fill="#ddd6fe" opacity="0.42" />
      <circle cx="302" cy="158" r="2" fill="#c4b5fd" opacity="0.28" />
    </svg>
  )
}
