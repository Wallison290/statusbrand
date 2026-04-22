import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { contentTypeLabels } from '@/utils/formatters'
import type { ContentType } from '@/types'

// ─── Label / colour maps ──────────────────────────────────────────────────────

const plannerStatusLabels: Record<string, string> = {
  ideia:     'Ideia',
  producao:  'Produção',
  revisao:   'Revisão',
  aprovado:  'Aprovado',
  publicado: 'Publicado',
}

const plannerStatusColors: Record<string, string> = {
  ideia:     '#8b5cf6',
  producao:  '#3b82f6',
  revisao:   '#f59e0b',
  aprovado:  '#10b981',
  publicado: '#22c55e',
}

const typePalette = [
  '#0f0f0f', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#10b981', '#ef4444', '#ec4899', '#14b8a6',
]

// ─── Shared tooltip style (light theme) ──────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    background: '#ffffff',
    border: '1px solid #e8e8e8',
    borderRadius: 8,
    color: '#0f0f0f',
    fontSize: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
}

// ─── View 1 — Generated contents (bar by day) ─────────────────────────────────

function GeneratedChart({
  data, summary,
}: {
  data: { day: string; conteudos: number }[]
  summary: string
}) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: '#a0a0a0', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#a0a0a0', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={24}
          />
          <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Bar dataKey="conteudos" fill="#0f0f0f" radius={[4, 4, 0, 0]} name="Gerados" />
        </BarChart>
      </ResponsiveContainer>
      {summary && (
        <p className="text-center text-[11px] text-[#a0a0a0] mt-2">{summary}</p>
      )}
    </div>
  )
}

// ─── View 2 — Arsenal assets (donut by content type) ─────────────────────────

function AssetsDonut({
  data, summary,
}: {
  data: { type: string; count: number }[]
  summary: string
}) {
  const chartData = data.map(d => ({
    name: contentTypeLabels[d.type as ContentType] ?? d.type,
    value: d.count,
  }))

  if (!chartData.some(d => d.value > 0)) {
    return (
      <div className="flex items-center justify-center h-[216px]">
        <p className="text-[12px] text-[#b0b0b0] text-center">
          Nenhum conteúdo no arsenal ainda.<br />
          <span className="text-[11px]">Adicione conteúdos pela Biblioteca.</span>
        </p>
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={74}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={typePalette[i % typePalette.length]} />
            ))}
          </Pie>
          <Legend
            iconType="circle"
            iconSize={7}
            formatter={value => (
              <span style={{ fontSize: 11, color: '#737373' }}>{value}</span>
            )}
          />
          <Tooltip {...tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      {summary && (
        <p className="text-center text-[11px] text-[#a0a0a0] mt-2">{summary}</p>
      )}
    </div>
  )
}

// ─── View 3 — Planner (donut by status) ──────────────────────────────────────

function PlannerDonut({
  data, summary,
}: {
  data: { status: string; count: number }[]
  summary: string
}) {
  const chartData = data.map(d => ({
    name:  plannerStatusLabels[d.status] ?? d.status,
    value: d.count,
    color: plannerStatusColors[d.status] ?? '#a0a0a0',
  }))

  if (!chartData.some(d => d.value > 0)) {
    return (
      <div className="flex items-center justify-center h-[216px]">
        <p className="text-[12px] text-[#b0b0b0] text-center">
          Nenhum item no planejamento ainda.<br />
          <span className="text-[11px]">Crie posts em Planejamento.</span>
        </p>
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={74}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Legend
            iconType="circle"
            iconSize={7}
            formatter={value => (
              <span style={{ fontSize: 11, color: '#737373' }}>{value}</span>
            )}
          />
          <Tooltip {...tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      {summary && (
        <p className="text-center text-[11px] text-[#a0a0a0] mt-2">{summary}</p>
      )}
    </div>
  )
}

// ─── Slide transition variants ────────────────────────────────────────────────

const slideVariants = {
  enter:  (dir: number) => ({ x: dir > 0 ?  48 : -48, opacity: 0 }),
  center: {
    x: 0, opacity: 1,
    transition: { duration: 0.22, ease: 'easeOut' as const },
  },
  exit:   (dir: number) => ({
    x: dir > 0 ? -48 : 48, opacity: 0,
    transition: { duration: 0.14, ease: 'easeIn' as const },
  }),
}

const headerVariants = {
  enter:  { opacity: 0, y: -5 },
  center: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit:   { opacity: 0, y:  5, transition: { duration: 0.12 } },
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MetricsCarouselProps {
  weeklyData:       { day: string; conteudos: number }[]
  assetTypes:       { type: string; count: number }[]
  plannerStatuses:  { status: string; count: number }[]
  contentsThisWeek: number
  totalAssets:      number
  totalPlanner:     number
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MetricsCarousel({
  weeklyData,
  assetTypes,
  plannerStatuses,
  contentsThisWeek,
  totalAssets,
  totalPlanner,
}: MetricsCarouselProps) {
  // [slideIndex, direction]  direction: 1 = right, -1 = left
  const [[activeIdx, dir], setSlide] = useState<[number, number]>([0, 0])

  const navigate = (d: 1 | -1) =>
    setSlide(([curr]) => [(curr + d + 3) % 3, d])

  const goTo = (i: number) =>
    setSlide(([curr]) => [i, i > curr ? 1 : -1])

  const slides = useMemo(() => [
    {
      title:    'Conteúdos gerados',
      subtitle: 'Esta semana por dia',
      content: (
        <GeneratedChart
          data={weeklyData}
          summary={
            contentsThisWeek > 0
              ? `${contentsThisWeek} gerado${contentsThisWeek !== 1 ? 's' : ''} esta semana`
              : 'Nenhum conteúdo gerado esta semana'
          }
        />
      ),
    },
    {
      title:    'Arsenal de conteúdos',
      subtitle: 'Distribuição por tipo',
      content: (
        <AssetsDonut
          data={assetTypes}
          summary={
            totalAssets > 0
              ? `${totalAssets} conteúdo${totalAssets !== 1 ? 's' : ''} no arsenal`
              : ''
          }
        />
      ),
    },
    {
      title:    'Planejamento',
      subtitle: 'Distribuição por status',
      content: (
        <PlannerDonut
          data={plannerStatuses}
          summary={
            totalPlanner > 0
              ? `${totalPlanner} item${totalPlanner !== 1 ? 's' : ''} no planejamento`
              : ''
          }
        />
      ),
    },
  ], [weeklyData, assetTypes, plannerStatuses, contentsThisWeek, totalAssets, totalPlanner])

  const slide = slides[activeIdx]

  return (
    <Card className="lg:col-span-2">
      {/* ── Header with arrows ─────────────────────────────────────────────── */}
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          {/* Left arrow */}
          <button
            onClick={() => navigate(-1)}
            className="flex-shrink-0 w-7 h-7 rounded-lg border border-[#e8e8e8] bg-white flex items-center justify-center text-[#a0a0a0] hover:border-[#c0c0c0] hover:text-[#0f0f0f] transition-all"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Title — animated on slide change */}
          <div className="flex-1 text-center min-w-0 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIdx}
                variants={headerVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <p className="text-[13px] font-semibold text-[#0f0f0f] leading-snug">
                  {slide.title}
                </p>
                {slide.subtitle && (
                  <p className="text-[10px] text-[#a0a0a0] mt-0.5">{slide.subtitle}</p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right arrow */}
          <button
            onClick={() => navigate(1)}
            className="flex-shrink-0 w-7 h-7 rounded-lg border border-[#e8e8e8] bg-white flex items-center justify-center text-[#a0a0a0] hover:border-[#c0c0c0] hover:text-[#0f0f0f] transition-all"
            aria-label="Próximo"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-1.5 mt-2.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-200 ${
                i === activeIdx
                  ? 'w-4 h-1.5 bg-[#0f0f0f]'
                  : 'w-1.5 h-1.5 bg-[#e0e0e0] hover:bg-[#b8b8b8]'
              }`}
              aria-label={`Ir para slide ${i + 1}`}
            />
          ))}
        </div>
      </CardHeader>

      {/* ── Chart content ──────────────────────────────────────────────────── */}
      <CardContent className="overflow-hidden pt-0">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={activeIdx}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {slide.content}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
