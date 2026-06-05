import { useEffect, useState, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users, CheckSquare, Clock,
  AlertTriangle, CalendarDays, CheckCircle2,
  ChevronLeft, ChevronRight, DollarSign, UserCheck, TrendingUp,
} from 'lucide-react'
import { DashboardHero } from '@/components/dashboard/DashboardHero'
import { useDashboardGreeting } from '@/hooks/useDashboardGreeting'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { contentTypeLabels } from '@/utils/formatters'
import { calcFinancialStatus } from '@/utils/financial'
import {
  startOfWeek, endOfWeek, startOfDay, endOfDay,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachDayOfInterval, eachMonthOfInterval,
  format, isToday, addDays, subDays, startOfToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MetricsCarousel } from '@/components/dashboard/MetricsCarousel'

// ─── Approval helpers ────────────────────────────────────────────────────────
//
// "Aguardando aprovação do cliente" = item foi enviado para o cliente revisar
// e ainda não foi aprovado nem reprovado definitivamente.
//
// Conta: 'pendente_aprovacao' (enviado, aguardando 1ª resposta)
//        'ajuste_realizado'   (agência fez o ajuste, cliente precisa reaprovar)
//
// NÃO conta: null / itens nunca enviados ao cliente, 'aprovado', 'reprovado',
//            'ajuste_solicitado' (cliente pediu ajuste, não é "aguardando")
function isAwaitingClientApproval(item: { approval_status: string | null }): boolean {
  const as = item.approval_status
  return as === 'pendente_aprovacao' || as === 'ajuste_realizado'
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PeriodMode = 'dia' | 'semana' | 'mes' | 'ano' | 'custom'

interface DateRange { start: Date; end: Date }

interface Stats {
  total_clients:              number
  active_clients:             number
  pending_tasks:              number
  overdue_tasks:              number
  period_pending_approval:    number   // approval_status = pendente_aprovacao | ajuste_realizado
  period_approved:            number   // approval_status = aprovado
  period_scheduled:           number   // status = aprovado (aprovado pelo cliente = agendado para publicar)
  period_published:           number   // status = publicado
  period_adjustments:         number   // approval_status = ajuste_solicitado
}

interface PlannerDay {
  id: string
  title: string
  content_type: string
  status: string
  scheduled_date: string
}

interface PlannerChartEntry {
  label: string
  value: number
  color: string
}

interface FinStats {
  mrr:          number
  received:     number
  pending:      number
  overdueAmt:   number
  overdueCount: number
  avgTicket:    number
}

function fmtBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style:                 'currency',
    currency:              'BRL',
    maximumFractionDigits: 0,
  }).format(n)
}

// ─── Period helpers ───────────────────────────────────────────────────────────

function computeRange(mode: PeriodMode, custom: DateRange): DateRange {
  const now = new Date()
  switch (mode) {
    case 'dia':    return { start: startOfDay(now),   end: endOfDay(now) }
    case 'semana': return { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) }
    case 'mes':    return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'ano':    return { start: startOfYear(now),  end: endOfYear(now) }
    case 'custom': return custom
  }
}

function buildBarData(
  mode: PeriodMode,
  range: DateRange,
  contents: { created_at: string }[],
): { day: string; conteudos: number }[] {
  if (mode === 'ano') {
    return eachMonthOfInterval(range).map(m => ({
      day: format(m, 'MMM', { locale: ptBR }),
      conteudos: contents.filter(c => c.created_at.startsWith(format(m, 'yyyy-MM'))).length,
    }))
  }
  // dia / semana / mes / custom — daily buckets (capped at 60 days)
  const days = eachDayOfInterval({
    start: range.start,
    end: range.end,
  }).slice(0, 60)
  return days.map(d => ({
    day: format(d, mode === 'semana' ? 'EEE' : 'd/M', { locale: ptBR }),
    conteudos: contents.filter(c => c.created_at.startsWith(format(d, 'yyyy-MM-dd'))).length,
  }))
}

function rangeLabel(mode: PeriodMode, range: DateRange): string {
  if (mode === 'dia')    return format(range.start, "d 'de' MMM", { locale: ptBR })
  if (mode === 'ano')    return format(range.start, 'yyyy')
  return `${format(range.start, 'd MMM', { locale: ptBR })} – ${format(range.end, 'd MMM yyyy', { locale: ptBR })}`
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
  mode:          PeriodMode
  range:         DateRange
  customRange:   DateRange
  onMode:        (m: PeriodMode) => void
  onCustomRange: (r: DateRange) => void
}

function FilterBar({ mode, range, customRange, onMode, onCustomRange }: FilterBarProps) {
  const [open, setOpen]         = useState(false)
  const [tempS, setTempS]       = useState(format(customRange.start, 'yyyy-MM-dd'))
  const [tempE, setTempE]       = useState(format(customRange.end,   'yyyy-MM-dd'))
  const popoverRef              = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function applyCustom() {
    if (!tempS || !tempE) return
    onCustomRange({ start: new Date(tempS + 'T00:00:00'), end: new Date(tempE + 'T23:59:59') })
    onMode('custom')
    setOpen(false)
  }

  const pills: { key: PeriodMode; label: string }[] = [
    { key: 'dia',    label: 'Dia'    },
    { key: 'semana', label: 'Semana' },
    { key: 'mes',    label: 'Mês'    },
    { key: 'ano',    label: 'Ano'    },
  ]

  return (
    <div className="border-b px-6 md:px-8 py-3 flex items-center justify-between gap-4 flex-wrap" style={{ background: '#0B1020', borderColor: '#182233' }}>
      {/* Period pills */}
      <div className="flex items-center gap-0.5 rounded-xl p-1" style={{ background: '#101A2B' }}>
        {pills.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onMode(key)}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
              mode === key ? 'text-white shadow-sm' : 'text-[#CBD5E1] hover:text-white'
            }`}
            style={mode === key ? { background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' } : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Date range button + popover */}
      <div className="relative" ref={popoverRef}>
        <button
          onClick={() => {
            setTempS(format(customRange.start, 'yyyy-MM-dd'))
            setTempE(format(customRange.end,   'yyyy-MM-dd'))
            setOpen(v => !v)
          }}
          className="flex items-center gap-2 text-[12px] rounded-xl px-3 py-1.5 transition-colors text-[#CBD5E1] hover:text-white"
          style={{ background: '#101A2B', border: `1px solid ${mode === 'custom' ? '#2563EB' : '#182233'}` }}
        >
          <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="capitalize whitespace-nowrap">{rangeLabel(mode, range)}</span>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 z-50 rounded-2xl shadow-xl p-4 w-[260px]" style={{ background: '#101A2B', border: '1px solid #182233' }}>
            <p className="text-[12px] font-semibold text-[#F8FAFC] mb-3">Período personalizado</p>
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] text-[#CBD5E1] block mb-1">Data inicial</label>
                <input
                  type="date"
                  value={tempS}
                  onChange={e => setTempS(e.target.value)}
                  className="w-full h-8 px-3 rounded-lg text-[12px] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#2563EB]/40"
                  style={{ background: '#182233', border: '1px solid #1e293b' }}
                />
              </div>
              <div>
                <label className="text-[11px] text-[#CBD5E1] block mb-1">Data final</label>
                <input
                  type="date"
                  value={tempE}
                  min={tempS}
                  onChange={e => setTempE(e.target.value)}
                  className="w-full h-8 px-3 rounded-lg text-[12px] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#2563EB]/40"
                  style={{ background: '#182233', border: '1px solid #1e293b' }}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 h-8 rounded-lg text-[12px] text-[#CBD5E1] hover:text-white transition-colors"
                style={{ border: '1px solid #182233' }}
              >
                Cancelar
              </button>
              <button
                onClick={applyCustom}
                disabled={!tempS || !tempE || tempE < tempS}
                className="flex-1 h-8 rounded-lg text-[12px] text-white font-medium disabled:opacity-40 transition-colors"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
              >
                Aplicar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const iconBgMap: Record<string, string> = {
  'bg-amber-50':   'rgba(245,166,35,0.15)',
  'bg-blue-50':    'rgba(79,142,247,0.15)',
  'bg-emerald-50': 'rgba(34,197,94,0.15)',
  'bg-green-50':   'rgba(34,197,94,0.15)',
  'bg-red-50':     'rgba(239,68,68,0.15)',
  'bg-violet-50':  'rgba(139,92,246,0.15)',
  'bg-gray-50':    'rgba(203,213,225,0.10)',
  'bg-gray-100':   'rgba(203,213,225,0.10)',
}

function KpiCard({
  label, value, displayValue, subtitle, href, icon: Icon,
  iconBg = 'bg-gray-100', iconColor = 'text-gray-500',
  featured = false, warning = false,
}: {
  label:         string
  value:         number
  displayValue?: string
  subtitle?:     string
  href?:         string
  icon:          React.ElementType
  iconBg?:       string
  iconColor?:    string
  featured?:     boolean
  warning?:      boolean
}) {
  const iconBgStyle = iconBgMap[iconBg] ?? 'rgba(203,213,225,0.10)'
  const showWarning = warning && value > 0

  const inner = featured ? (
    <div
      className="h-full rounded-2xl p-5 flex flex-col gap-3 transition-opacity duration-200 hover:opacity-90"
      style={{
        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
        boxShadow:  '0 4px 24px rgba(37,99,235,0.25)',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
          <Icon className="w-4 h-4 text-white/90" />
        </div>
        <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/60 uppercase tracking-widest">
          Ativos
        </span>
      </div>
      <div className="mt-auto">
        <p className="text-[28px] font-semibold text-white tabular-nums leading-none">{displayValue ?? value}</p>
        <p className="text-[12px] text-white/70 mt-1.5 leading-tight">{label}</p>
        {subtitle && <p className="text-[10px] text-white/40 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  ) : (
    <div
      className="h-full rounded-2xl p-4 flex flex-col gap-3 transition-all duration-200 hover:opacity-90"
      style={{ background: '#182233', border: `1px solid ${showWarning ? 'rgba(239,68,68,0.3)' : '#1e293b'}`, boxShadow: '0 1px 8px rgba(0,0,0,0.2)' }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: showWarning ? 'rgba(239,68,68,0.15)' : iconBgStyle }}
        >
          <Icon className={`w-4 h-4 ${showWarning ? 'text-red-400' : iconColor}`} />
        </div>
        {showWarning && (
          <span className="text-[9px] font-medium px-2 py-0.5 rounded-full text-red-400" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
            Atenção
          </span>
        )}
      </div>
      <div>
        <p className="text-[26px] font-semibold text-[#F8FAFC] tabular-nums leading-none">{displayValue ?? value}</p>
        <p className="text-[12px] text-[#CBD5E1] mt-1.5 leading-tight">{label}</p>
        {subtitle && <p className="text-[10px] text-[#64748b] mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )

  if (href) return <Link to={href} className="block h-full">{inner}</Link>
  return inner
}

// ─── Status dot colours ───────────────────────────────────────────────────────

const statusDotColor: Record<string, string> = {
  ideia:     'bg-purple-400',
  producao:  'bg-blue-400',
  revisao:   'bg-amber-400',
  aprovado:  'bg-emerald-400',
  publicado: 'bg-green-400',
}

// ─── Calendar Widget ──────────────────────────────────────────────────────────

function CalendarWidget({
  items,
  onDayClick,
}: {
  items: PlannerDay[]
  onDayClick: () => void
}) {
  const today  = startOfToday()
  const [offset, setOffset] = useState(0)
  const center = addDays(today, offset)
  const days   = [-2, -1, 0, 1, 2].map(d => addDays(center, d))

  const todayStr   = format(today, 'yyyy-MM-dd')
  const todayItems = items.filter(i => i.scheduled_date === todayStr)

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: '#182233', border: '1px solid #1e293b', boxShadow: '0 1px 8px rgba(0,0,0,0.2)' }}
    >
      {/* Month + nav */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setOffset(o => o - 5)}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[#CBD5E1] hover:text-white transition-colors"
          style={{ background: '#101A2B' }}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <h3 className="text-[13px] font-semibold text-[#F8FAFC] capitalize">
          {format(center, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <button
          onClick={() => setOffset(o => o + 5)}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[#CBD5E1] hover:text-white transition-colors"
          style={{ background: '#101A2B' }}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-5 mb-1.5">
        {days.map(day => (
          <div key={day.toISOString()} className="text-center text-[9.5px] font-semibold text-[#94a3b8] py-1 uppercase tracking-wide capitalize">
            {format(day, 'EEE', { locale: ptBR }).replace('.', '')}
          </div>
        ))}
      </div>

      {/* Day numbers */}
      <div className="grid grid-cols-5 gap-0.5 mb-5">
        {days.map(day => {
          const dayStr    = format(day, 'yyyy-MM-dd')
          const dayItems  = items.filter(i => i.scheduled_date === dayStr)
          const isCurrent = isToday(day)
          return (
            <div
              key={dayStr}
              onClick={onDayClick}
              className="flex flex-col items-center py-2.5 rounded-xl cursor-pointer transition-all duration-150 select-none"
              style={isCurrent ? { background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' } : { background: 'transparent' }}
              onMouseEnter={e => { if (!isCurrent) (e.currentTarget as HTMLDivElement).style.background = '#101A2B' }}
              onMouseLeave={e => { if (!isCurrent) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              <span className={`text-[14px] font-semibold leading-none ${isCurrent ? 'text-white' : 'text-[#CBD5E1]'}`}>
                {format(day, 'd')}
              </span>
              {dayItems.length > 0 && (
                <div className="flex gap-0.5 mt-1.5 justify-center">
                  {dayItems.slice(0, 3).map(item => (
                    <div key={item.id} className={`w-1 h-1 rounded-full ${isCurrent ? 'bg-white/50' : (statusDotColor[item.status] ?? 'bg-[#94a3b8]')}`} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Today's list */}
      {todayItems.length === 0 ? (
        <p className="text-[11px] text-[#94a3b8] text-center py-1">Nenhum post hoje</p>
      ) : (
        <div className="space-y-1">
          <p className="text-[9.5px] font-semibold text-[#94a3b8] uppercase tracking-widest mb-2.5">Hoje</p>
          {todayItems.slice(0, 3).map(item => (
            <div key={item.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl" style={{ background: '#101A2B' }}>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDotColor[item.status] ?? 'bg-[#94a3b8]'}`} />
              <p className="text-[11.5px] text-[#F8FAFC] truncate flex-1 font-medium">{item.title}</p>
              <span className="text-[9.5px] text-[#94a3b8] flex-shrink-0">
                {contentTypeLabels[item.content_type as any] ?? item.content_type}
              </span>
            </div>
          ))}
          {todayItems.length > 3 && (
            <Link to="/planner">
              <p className="text-[10.5px] text-[#94a3b8] hover:text-[#475569] text-center transition-colors mt-1">
                +{todayItems.length - 3} mais →
              </p>
            </Link>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3.5 border-t border-[#1e293b]">
        {Object.entries(statusDotColor).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={`w-1 h-1 rounded-full ${color}`} />
            <span className="text-[9.5px] text-[#94a3b8] capitalize">
              {status === 'producao' ? 'Prod.' : status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Financial Summary Widget ─────────────────────────────────────────────────

function FinancialSummary({ data }: { data: FinStats }) {
  const items = [
    {
      icon:        <DollarSign className="w-4 h-4" style={{ color: '#CBD5E1' }} />,
      iconBgStyle: 'rgba(203,213,225,0.15)',
      label:       'MRR',
      sub:         'receita mensal recorrente',
      value:       fmtBRL(data.mrr),
      valueColor:  '#F8FAFC',
      show:        true,
    },
    {
      icon:        <CheckCircle2 className="w-4 h-4" style={{ color: '#22C55E' }} />,
      iconBgStyle: 'rgba(34,197,94,0.15)',
      label:       'Recebido',
      sub:         'pago no ciclo atual',
      value:       fmtBRL(data.received),
      valueColor:  '#22C55E',
      show:        true,
    },
    {
      icon:        <Clock className="w-4 h-4" style={{ color: data.pending > 0 ? '#F5A623' : '#64748b' }} />,
      iconBgStyle: data.pending > 0 ? 'rgba(245,166,35,0.15)' : 'rgba(203,213,225,0.10)',
      label:       'Pendente',
      sub:         'a receber no ciclo',
      value:       fmtBRL(data.pending),
      valueColor:  data.pending > 0 ? '#F5A623' : '#94a3b8',
      show:        true,
    },
    {
      icon:        <AlertTriangle className="w-4 h-4" style={{ color: data.overdueCount > 0 ? '#f87171' : '#64748b' }} />,
      iconBgStyle: data.overdueCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(203,213,225,0.10)',
      label:       'Inadimplência',
      sub:         data.overdueCount > 0
                     ? `${data.overdueCount} cliente${data.overdueCount !== 1 ? 's' : ''} em atraso`
                     : 'nenhum em atraso',
      value:       fmtBRL(data.overdueAmt),
      valueColor:  data.overdueCount > 0 ? '#f87171' : '#94a3b8',
      show:        true,
    },
    {
      icon:        <TrendingUp className="w-4 h-4" style={{ color: '#4F8EF7' }} />,
      iconBgStyle: 'rgba(79,142,247,0.15)',
      label:       'Ticket médio',
      sub:         'por cliente ativo',
      value:       fmtBRL(data.avgTicket),
      valueColor:  '#F8FAFC',
      show:        true,
    },
  ]

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#182233', border: '1px solid #1e293b', boxShadow: '0 1px 8px rgba(0,0,0,0.2)' }}
    >
      {/* Header */}
      <div className="px-6 py-4 flex items-center" style={{ borderBottom: '1px solid #1e293b' }}>
        <h3 className="text-[13px] font-semibold text-[#F8FAFC]">Resumo financeiro</h3>
        <Link to="/financial" className="ml-auto text-[11px] text-[#94a3b8] hover:text-[#475569] transition-colors">
          Ver detalhes →
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x" style={{ borderColor: '#1e293b' }}>
        {items.map((item, i) => (
          <div key={i} className="px-6 py-5 flex flex-col gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: item.iconBgStyle }}>
              {item.icon}
            </div>
            <div>
              <p className="text-[20px] font-bold leading-tight tabular-nums" style={{ color: item.valueColor }}>
                {item.value}
              </p>
              <p className="text-[10.5px] font-semibold text-[#94a3b8] mt-1 uppercase tracking-wide">
                {item.label}
              </p>
              <p className="text-[10px] text-[#cbd5e1] mt-0.5">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Alerts Widget ────────────────────────────────────────────────────────────

function AlertsWidget({
  pendingApproval, overdueTasks, pendingTasks, periodApproved,
}: {
  pendingApproval: number
  overdueTasks:    number
  pendingTasks:    number
  periodApproved:  number
}) {
  const allGood = pendingApproval === 0 && overdueTasks === 0

  const rows = [
    { icon: CheckCircle2, label: 'Aprovados no período',  value: periodApproved,  bgStyle: 'rgba(34,197,94,0.15)',                                            iconColor: '#22C55E', href: '/planner' },
    { icon: Clock,        label: 'Aguardando aprovação',  value: pendingApproval, bgStyle: pendingApproval > 0 ? 'rgba(245,166,35,0.15)'  : 'rgba(203,213,225,0.10)', iconColor: pendingApproval > 0 ? '#F5A623' : '#64748b', href: '/planner' },
    { icon: CheckSquare,  label: 'Tarefas em aberto',     value: pendingTasks,    bgStyle: pendingTasks    > 0 ? 'rgba(79,142,247,0.15)'  : 'rgba(203,213,225,0.10)', iconColor: pendingTasks    > 0 ? '#4F8EF7' : '#64748b', href: '/tasks'   },
    { icon: AlertTriangle,label: 'Tarefas atrasadas',     value: overdueTasks,    bgStyle: overdueTasks    > 0 ? 'rgba(239,68,68,0.15)'   : 'rgba(203,213,225,0.10)', iconColor: overdueTasks    > 0 ? '#f87171' : '#64748b', href: '/tasks'   },
  ]

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: '#182233', border: '1px solid #1e293b', boxShadow: '0 1px 8px rgba(0,0,0,0.2)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-[13px] font-semibold text-[#F8FAFC]">Resumo operacional</h3>
      </div>
      <div className="space-y-0.5">
        {rows.map((row, i) => (
          <Link key={i} to={row.href}>
            <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl transition-colors cursor-pointer hover:opacity-80" style={{ background: 'transparent' }}>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: row.bgStyle }}>
                <row.icon className="w-3.5 h-3.5" style={{ color: row.iconColor }} />
              </div>
              <p className="text-[11.5px] text-[#CBD5E1] flex-1 leading-snug">{row.label}</p>
              <span className="text-[14px] font-semibold tabular-nums" style={{ color: row.iconColor }}>{row.value}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  // ── Period state (single source of truth) ─────────────────────────────────
  const defaultCustom: DateRange = {
    start: startOfWeek(new Date(), { locale: ptBR }),
    end:   endOfWeek(new Date(),   { locale: ptBR }),
  }
  const [periodMode, setPeriodMode]   = useState<PeriodMode>('semana')
  const [customRange, setCustomRange] = useState<DateRange>(defaultCustom)

  const range = useMemo(
    () => computeRange(periodMode, customRange),
    [periodMode, customRange],
  )

  // ── User name ─────────────────────────────────────────────────────────────
  const userName = (
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'você'
  ) as string

  // ── Data state ────────────────────────────────────────────────────────────
  const [statsReady, setStatsReady]             = useState(false)
  const [stats, setStats]                       = useState<Stats>({ total_clients: 0, active_clients: 0, pending_tasks: 0, overdue_tasks: 0, period_pending_approval: 0, period_approved: 0, period_scheduled: 0, period_published: 0, period_adjustments: 0 })
  const [weeklyData, setWeeklyData]             = useState<any[]>([])
  const [assetTypes, setAssetTypes]             = useState<{ type: string; count: number }[]>([])
  const [plannerStatuses, setPlannerStatuses]   = useState<{ status: string; count: number }[]>([])
  const [plannerChartData, setPlannerChartData] = useState<PlannerChartEntry[]>([])
  const [plannerCalItems, setPlannerCalItems]   = useState<PlannerDay[]>([])
  const [finStats, setFinStats]                 = useState<FinStats>({ mrr: 0, received: 0, pending: 0, overdueAmt: 0, overdueCount: 0, avgTicket: 0 })

  // ── Re-fetch whenever user or range changes ───────────────────────────────
  useEffect(() => {
    if (!user) return
    fetchStats(range)
  }, [user, range.start.toISOString(), range.end.toISOString()])

  // ── Fetch ─────────────────────────────────────────────────────────────────
  async function fetchStats({ start, end }: DateRange) {
    const now       = new Date()
    const startIso  = start.toISOString()
    const endIso    = end.toISOString()
    const startDate = format(start, 'yyyy-MM-dd')
    const endDate   = format(end,   'yyyy-MM-dd')

    // Calendar widget: janela fixa de ±2 dias em torno de hoje
    const calStart = format(subDays(now, 2), 'yyyy-MM-dd')
    const calEnd   = format(addDays(now, 2), 'yyyy-MM-dd')

    const [
      clientsRes,
      tasksRes,
      contentsRes,
      assetsRes,
      plannerRes,
      plannerCalRes,
    ] = await Promise.all([
      // Clientes — sempre global (inclui todos os campos para calcFinancialStatus)
      supabase.from('clients').select('id, status, valor_mensal, financial_status, last_payment_date, dia_vencimento, manual_status_override').eq('user_id', user!.id),

      // Tarefas — todas não concluídas (filtro de período no cliente)
      supabase.from('tasks').select('id, status, due_date').eq('user_id', user!.id).neq('status', 'concluido'),

      // Conteúdos do período (para gráfico de barras no MetricsCarousel)
      supabase.from('contents')
        .select('created_at')
        .eq('user_id', user!.id)
        .gte('created_at', startIso)
        .lte('created_at', endIso),

      // Arsenal — sempre global
      supabase.from('content_assets').select('content_type').eq('user_id', user!.id),

      // Planner — itens do período
      supabase.from('planner')
        .select('status, approval_status')
        .eq('user_id', user!.id)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate),

      // Calendário — janela ao redor de hoje (independe do período selecionado)
      supabase.from('planner')
        .select('id, title, content_type, status, scheduled_date')
        .eq('user_id', user!.id)
        .gte('scheduled_date', calStart)
        .lte('scheduled_date', calEnd),
    ])

    const clients  = clientsRes.data  || []
    const taskList = tasksRes.data    || []

    // Tarefas do período: inclui tarefas sem prazo (due_date null = sempre pendente)
    const periodTasks = taskList.filter(t => {
      if (!t.due_date) return true
      const d = new Date(t.due_date)
      return d >= start && d <= end
    })
    // Atrasadas: métrica global (independe do período)
    const overdue = taskList.filter(t => t.due_date && new Date(t.due_date) < now).length

    // ── Derivar contadores do planner ────────────────────────────────────────
    const pList = plannerRes.data || []

    // Posts Agendados = status 'aprovado' (cliente aprovou → pronto para publicar)
    // Nota: não existe status 'agendado' no sistema — 'aprovado' é o equivalente
    const period_scheduled = pList.filter((p: any) => p.status === 'aprovado').length

    // Posts Publicados = status 'publicado' (já foi ao ar)
    const period_published = pList.filter((p: any) => p.status === 'publicado').length

    // Aguardando aprovação do cliente = enviado para o cliente, sem resposta ainda
    // (pendente_aprovacao = aguardando 1ª resposta | ajuste_realizado = ajuste feito, aguardando nova aprovação)
    const period_pending_approval = pList.filter(isAwaitingClientApproval).length

    // Aprovados no período
    const period_approved = pList.filter((p: any) => p.approval_status === 'aprovado').length

    // Ajustes solicitados = cliente pediu correções (apenas ajuste_solicitado)
    const period_adjustments = pList.filter((p: any) => p.approval_status === 'ajuste_solicitado').length

    setStatsReady(true)
    setStats({
      total_clients:  clients.length,
      active_clients: clients.filter(c => c.status === 'ativo').length,
      pending_tasks:  periodTasks.length,
      overdue_tasks:  overdue,
      period_pending_approval,
      period_approved,
      period_scheduled,
      period_published,
      period_adjustments,
    })

    setPlannerCalItems((plannerCalRes.data || []) as PlannerDay[])

    // ── Métricas financeiras — mesma lógica da página Financeiro ─────────────
    const now2      = new Date()
    const thisYear  = now2.getFullYear()
    const thisMonth = now2.getMonth() + 1
    // Clientes com dados financeiros (com valor_mensal ou dia_vencimento)
    const finClients = clients.filter((c: any) => c.valor_mensal != null || c.dia_vencimento != null)
    const withCalcStatus = finClients.map((c: any) => ({ client: c, status: calcFinancialStatus(c) }))
    // MRR: todos exceto cancelados
    const mrrClients = withCalcStatus.filter((x: any) => x.status !== 'cancelado')
    const mrr        = mrrClients.reduce((s: number, x: any) => s + (Number(x.client.valor_mensal) || 0), 0)
    // Recebido: pagou no mês atual (last_payment_date no mês corrente)
    const received = withCalcStatus
      .filter((x: any) => {
        if (!x.client.last_payment_date) return false
        const [y, m] = x.client.last_payment_date.split('-').map(Number)
        return y === thisYear && m === thisMonth
      })
      .reduce((s: number, x: any) => s + (Number(x.client.valor_mensal) || 0), 0)
    // Pendente: vence em breve
    const pending      = withCalcStatus.filter((x: any) => x.status === 'vence_em_breve').reduce((s: number, x: any) => s + (Number(x.client.valor_mensal) || 0), 0)
    // Inadimplência: atrasados
    const overdueAmt   = withCalcStatus.filter((x: any) => x.status === 'atrasado').reduce((s: number, x: any) => s + (Number(x.client.valor_mensal) || 0), 0)
    const overdueCount = withCalcStatus.filter((x: any) => x.status === 'atrasado').length
    // Ticket médio por contrato ativo (não cancelado)
    const avgTicket = mrrClients.length > 0 ? mrr / mrrClients.length : 0
    setFinStats({ mrr, received, pending, overdueAmt, overdueCount, avgTicket })

    // Gráfico de barras de conteúdos
    setWeeklyData(buildBarData(periodMode, { start, end }, contentsRes.data || []))

    // Donut do arsenal
    const typeMap: Record<string, number> = {}
    ;(assetsRes.data || []).forEach((a: any) => { typeMap[a.content_type] = (typeMap[a.content_type] || 0) + 1 })
    setAssetTypes(Object.entries(typeMap).map(([type, count]) => ({ type, count })))

    // Status breakdown do planner
    const statusMap: Record<string, number> = {}
    pList.forEach((p: any) => { statusMap[p.status] = (statusMap[p.status] || 0) + 1 })
    setPlannerStatuses(Object.entries(statusMap).map(([status, count]) => ({ status, count })))

    // Gráfico de planejamento — "Ag. aprovação" usa isAwaitingApproval()
    setPlannerChartData([
      { label: 'Ideia',         value: pList.filter((p: any) => p.status === 'ideia').length,   color: '#a3a3a3' },
      { label: 'Revisão',       value: pList.filter((p: any) => p.status === 'revisao').length, color: '#f59e0b' },
      { label: 'Ag. aprovação', value: pList.filter(isAwaitingClientApproval).length,            color: '#f97316' },
      { label: 'Aprovado',      value: period_approved,                                          color: '#10b981' },
    ])
  }

  // ── Greeting com IA ───────────────────────────────────────────────────────
  const { greeting, message, pills, isLoading: greetingLoading, refresh: refreshGreeting } =
    useDashboardGreeting(user?.id, userName, stats, statsReady, (profile as any)?.agency_name || '')

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full" style={{ background: '#0B1020' }}>

      {/* ── Hero Banner inteligente ── */}
      <DashboardHero
        greeting={greeting}
        userName={userName}
        message={message}
        pills={pills}
        isLoading={greetingLoading}
        onRefresh={refreshGreeting}
      />

      {/* Filter Bar — controlled */}
      <FilterBar
        mode={periodMode}
        range={range}
        customRange={customRange}
        onMode={m => setPeriodMode(m)}
        onCustomRange={r => setCustomRange(r)}
      />

      <div className="px-6 py-6 md:px-8 md:py-7 space-y-6">

        {/* KPI Cards — conteúdo */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Aguardando Aprovação"
            value={stats.period_pending_approval}
            subtitle={stats.period_pending_approval > 0 ? 'aguardando retorno do cliente' : 'nenhum pendente'}
            href="/planner"
            icon={Clock}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
          <KpiCard
            label="Ajustes Solicitados"
            value={stats.period_adjustments}
            subtitle={stats.period_adjustments > 0 ? 'cliente pediu correções' : 'nenhum pendente'}
            href="/planner"
            icon={AlertTriangle}
            warning
          />
          <KpiCard
            label="Tarefas em Aberto"
            value={stats.pending_tasks}
            subtitle="no período"
            href="/tasks"
            icon={CheckSquare}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <KpiCard
            label="Tarefas Atrasadas"
            value={stats.overdue_tasks}
            subtitle={stats.overdue_tasks > 0 ? 'requerem atenção' : 'tudo em dia'}
            href="/tasks"
            icon={AlertTriangle}
            warning={stats.overdue_tasks > 0}
            iconBg="bg-gray-50"
            iconColor="text-gray-400"
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Charts — 2/3 */}
          <div className="lg:col-span-2">
            <MetricsCarousel
              weeklyData={weeklyData}
              assetTypes={assetTypes}
              plannerStatuses={plannerStatuses}
              plannerChartData={plannerChartData}
              contentsThisWeek={weeklyData.reduce((s, d) => s + d.conteudos, 0)}
              totalAssets={assetTypes.reduce((s, t) => s + t.count, 0)}
              totalPlanner={plannerStatuses.reduce((s, p) => s + p.count, 0)}
            />
          </div>

          {/* Right sidebar — 1/3 */}
          <div className="flex flex-col gap-4">
            <CalendarWidget
              items={plannerCalItems}
              onDayClick={() => navigate('/planner')}
            />
            <AlertsWidget
              pendingApproval={stats.period_pending_approval}
              overdueTasks={stats.overdue_tasks}
              pendingTasks={stats.pending_tasks}
              periodApproved={stats.period_approved}
            />
          </div>
        </div>

        {/* ── Resumo Financeiro — full width ── */}
        <FinancialSummary data={finStats} />

      </div>
    </div>
  )
}
