import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { contentTypeLabels } from '@/utils/formatters'
import type { ContentType } from '@/types'
import { useTheme } from '@/contexts/ThemeContext'

// ─── PlannerBarChart ──────────────────────────────────────────────────────────

function PlannerBarChart({
  data,
}: {
  data: { label: string; value: number; color: string }[]
}) {
  const { isDark } = useTheme()
  const gridColor  = isDark ? '#1e293b' : '#bfdbfe'
  const axisProps  = { fill: isDark ? '#CBD5E1' : '#64748b', fontSize: 11 } as const
  const tipStyle = {
    contentStyle: {
      background:   isDark ? '#101A2B' : '#ffffff',
      border:       `1px solid ${isDark ? '#182233' : '#bfdbfe'}`,
      borderRadius: 10,
      color:        isDark ? '#F8FAFC' : '#1e293b',
      fontSize:     12,
      boxShadow:    isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(37,99,235,0.1)',
      padding:      '8px 12px',
    },
    cursor: { fill: 'rgba(37,99,235,0.05)' },
  }

  const hasData = data.some(d => d.value > 0)

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[210px]">
        <p className="text-[12px] text-center leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
          Nenhum item no planejamento ainda.<br />
          <span className="text-[11px]">Crie posts em Planejamento.</span>
        </p>
      </div>
    )
  }

  const chartData = data.map(d => ({ name: d.label, value: d.value }))
  const total     = data.reduce((s, d) => s + d.value, 0)

  return (
    <div>
      <ResponsiveContainer width="100%" height={195}>
        <BarChart data={chartData} barSize={26} barCategoryGap="38%" layout="vertical" margin={{ left: 8 }}>
          <defs>
            <linearGradient id="plannerBarGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#29457a" />
              <stop offset="100%" stopColor="#16284d" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="1 5" stroke={gridColor} horizontal={false} />
          <XAxis type="number" tick={axisProps} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="name" tick={axisProps} axisLine={false} tickLine={false} width={120} />
          <Tooltip {...tipStyle} />
          <Bar dataKey="value" fill="url(#plannerBarGradient)" radius={[0, 6, 6, 0]} name="Itens" />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-center text-[11px] mt-1.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
        {total} item{total !== 1 ? 's' : ''} no planejamento
      </p>
    </div>
  )
}

// ─── GeneratedChart ───────────────────────────────────────────────────────────

function GeneratedChart({
  data,
  summary,
}: {
  data:    { day: string; conteudos: number }[]
  summary: string
}) {
  const { isDark } = useTheme()
  const gridColor = isDark ? '#1e293b' : '#bfdbfe'
  const axisProps = { fill: isDark ? '#CBD5E1' : '#64748b', fontSize: 11 } as const
  const tipStyle  = {
    contentStyle: {
      background:   isDark ? '#101A2B' : '#ffffff',
      border:       `1px solid ${isDark ? '#182233' : '#bfdbfe'}`,
      borderRadius: 10,
      color:        isDark ? '#F8FAFC' : '#1e293b',
      fontSize:     12,
      boxShadow:    isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(37,99,235,0.1)',
      padding:      '8px 12px',
    },
    cursor: { fill: 'rgba(37,99,235,0.05)' },
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={195}>
        <BarChart data={data} barSize={20} barCategoryGap="42%">
          <CartesianGrid strokeDasharray="1 5" stroke={gridColor} vertical={false} />
          <XAxis dataKey="day"       tick={axisProps} axisLine={false} tickLine={false} />
          <YAxis tick={axisProps} axisLine={false} tickLine={false} allowDecimals={false} width={22} />
          <Tooltip {...tipStyle} />
          <Bar dataKey="conteudos" fill="#2563EB" radius={[5, 5, 0, 0]} name="Gerados" />
        </BarChart>
      </ResponsiveContainer>
      {summary && (
        <p className="text-center text-[11px] mt-1.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{summary}</p>
      )}
    </div>
  )
}

// ─── AssetsDonut ──────────────────────────────────────────────────────────────

const DONUT_PALETTE = [
  '#2563EB', '#1D4ED8', '#60A5FA', '#8B5CF6',
  '#F5A623', '#22C55E', '#6B7280', '#64748b',
]

function AssetsDonut({
  data,
  summary,
}: {
  data:    { type: string; count: number }[]
  summary: string
}) {
  const { isDark } = useTheme()
  const tipStyle = {
    contentStyle: {
      background:   isDark ? '#101A2B' : '#ffffff',
      border:       `1px solid ${isDark ? '#182233' : '#bfdbfe'}`,
      borderRadius: 10,
      color:        isDark ? '#F8FAFC' : '#1e293b',
      fontSize:     12,
      boxShadow:    isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(37,99,235,0.1)',
      padding:      '8px 12px',
    },
    cursor: { fill: 'rgba(37,99,235,0.05)' },
  }

  const chartData = data.map(d => ({
    name:  contentTypeLabels[d.type as ContentType] ?? d.type,
    value: d.count,
  }))

  if (!chartData.some(d => d.value > 0)) {
    return (
      <div className="flex items-center justify-center h-[210px]">
        <p className="text-[12px] text-center leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
          Nenhum conteúdo no arsenal ainda.<br />
          <span className="text-[11px]">Adicione conteúdos pela Biblioteca.</span>
        </p>
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={195}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={74}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={DONUT_PALETTE[i % DONUT_PALETTE.length]} />
            ))}
          </Pie>
          <Legend
            iconType="circle"
            iconSize={6}
            formatter={value => (
              <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#475569' }}>{value}</span>
            )}
          />
          <Tooltip {...tipStyle} />
        </PieChart>
      </ResponsiveContainer>
      {summary && (
        <p className="text-center text-[11px] mt-1.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{summary}</p>
      )}
    </div>
  )
}

// ─── Slide / header animation variants ───────────────────────────────────────

const slideVariants = {
  enter:  (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.2, ease: 'easeOut' as const } },
  exit:   (dir: number) => ({
    x: dir > 0 ? -40 : 40, opacity: 0,
    transition: { duration: 0.12, ease: 'easeIn' as const },
  }),
}

const headerVariants = {
  enter:  { opacity: 0, y: -4 },
  center: { opacity: 1, y:  0, transition: { duration: 0.16 } },
  exit:   { opacity: 0, y:  4, transition: { duration: 0.10 } },
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MetricsCarouselProps {
  weeklyData:        { day: string; conteudos: number }[]
  assetTypes:        { type: string; count: number }[]
  plannerStatuses:   { status: string; count: number }[]
  plannerChartData?: { label: string; value: number; color: string }[]
  contentsThisWeek:  number
  totalAssets:       number
  totalPlanner:      number
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MetricsCarousel({
  weeklyData,
  assetTypes,
  plannerChartData = [],
  contentsThisWeek,
  totalAssets,
  totalPlanner,
}: MetricsCarouselProps) {
  const { isDark } = useTheme()
  const [[activeIdx, dir], setSlide] = useState<[number, number]>([0, 0])

  const cardBg     = isDark ? '#182233' : '#ffffff'
  const border     = isDark ? '#1e293b' : '#bfdbfe'
  const shadow     = isDark ? '0 1px 8px rgba(0,0,0,0.2)' : '0 1px 8px rgba(37,99,235,0.08)'
  const text1      = isDark ? '#F8FAFC' : '#1e293b'
  const text3      = isDark ? '#94a3b8' : '#64748b'
  const text2      = isDark ? '#CBD5E1' : '#475569'
  const navBg      = isDark ? '#101A2B' : '#dbeafe'
  const dotActive  = isDark ? '#29457a' : '#2563eb'
  const dotInactive= isDark ? '#1e293b' : '#bfdbfe'

  const slides = useMemo(() => [
    {
      title:    'Planejamento',
      subtitle: `${totalPlanner} item${totalPlanner !== 1 ? 's' : ''} no período`,
      content:  <PlannerBarChart data={plannerChartData} />,
    },
  ], [plannerChartData, totalPlanner])

  const nav  = (d: 1 | -1) => setSlide(([curr]) => [(curr + d + slides.length) % slides.length, d])
  const goTo = (i: number) => setSlide(([curr]) => [i, i > curr ? 1 : -1])

  const slide = slides[activeIdx]

  return (
    <div
      className="h-full rounded-2xl overflow-hidden"
      style={{ background: cardBg, border: `1px solid ${border}`, boxShadow: shadow }}
    >
      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-3" style={{ borderBottom: `1px solid ${border}` }}>
        <div className="flex items-center gap-3">

          {slides.length > 1 && (
            <button
              onClick={() => nav(-1)}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ border: `1px solid ${border}`, background: navBg, color: text2 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = text1 }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = text2 }}
              aria-label="Anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex-1 text-center min-w-0 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIdx}
                variants={headerVariants}
                initial="enter" animate="center" exit="exit"
              >
                <p className="text-[13px] font-semibold leading-snug" style={{ color: text1 }}>
                  {slide.title}
                </p>
                {slide.subtitle && (
                  <p className="text-[10.5px] mt-0.5" style={{ color: text3 }}>{slide.subtitle}</p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {slides.length > 1 && (
            <button
              onClick={() => nav(1)}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ border: `1px solid ${border}`, background: navBg, color: text2 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = text1 }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = text2 }}
              aria-label="Próximo"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dot indicators */}
        {slides.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-200 ${i === activeIdx ? 'w-4 h-1.5' : 'w-1.5 h-1.5 hover:opacity-80'}`}
                style={{ background: i === activeIdx ? dotActive : dotInactive }}
                aria-label={`Ir para slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Chart area ── */}
      <div className="px-4 pt-4 pb-5 overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={activeIdx}
            custom={dir}
            variants={slideVariants}
            initial="enter" animate="center" exit="exit"
          >
            {slide.content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
