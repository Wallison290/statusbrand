import { useEffect, useState, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users, CheckSquare, Clock,
  AlertTriangle, TrendingUp, CalendarDays, CheckCircle2,
  ChevronLeft, ChevronRight, BarChart3, DollarSign,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
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

// ─── Approval helpers (única fonte de verdade) ───────────────────────────────
//
// Regra EXATAMENTE alinhada com o filtro "Pendentes" do Planejamento:
//   (i.approval_status || 'pendente_aprovacao') === 'pendente_aprovacao'
//
// O Planejamento NÃO filtra por status de produção (ideia/producao/revisao/etc.).
// Qualquer item cujo approval_status seja null, vazio ou 'pendente_aprovacao' é "pendente".
// Também contamos 'ajuste_realizado': o ajuste foi feito e voltou para o cliente revisar.
//
// NÃO contam: 'aprovado', 'reprovado', 'ajuste_solicitado'
function isAwaitingApproval(item: { approval_status: string | null }): boolean {
  const as = item.approval_status
  return as !== 'aprovado' && as !== 'reprovado' && as !== 'ajuste_solicitado'
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PeriodMode = 'dia' | 'semana' | 'mes' | 'ano' | 'custom'

interface DateRange { start: Date; end: Date }

interface Stats {
  total_clients:           number
  active_clients:          number
  pending_tasks:           number
  overdue_tasks:           number
  period_pending_approval: number
  period_approved:         number
  period_scheduled:        number
  period_published:        number
  period_in_production:    number
  period_adjustments:      number
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
    <div className="bg-white border-b border-[#f1f5f9] px-6 md:px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
      {/* Period pills */}
      <div className="flex items-center gap-0.5 bg-[#f1f5f9] rounded-xl p-1">
        {pills.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onMode(key)}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
              mode === key
                ? 'bg-[#0f172a] text-white shadow-sm'
                : 'text-[#64748b] hover:text-[#0f172a]'
            }`}
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
          className={`flex items-center gap-2 text-[12px] border rounded-xl px-3 py-1.5 transition-colors ${
            mode === 'custom'
              ? 'text-[#0f172a] bg-white border-[#cbd5e1] font-medium'
              : 'text-[#94a3b8] bg-white border-[#f1f5f9] hover:border-[#cbd5e1] hover:text-[#475569]'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="capitalize whitespace-nowrap">{rangeLabel(mode, range)}</span>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-100 rounded-2xl shadow-xl p-4 w-[260px]">
            <p className="text-[12px] font-semibold text-gray-800 mb-3">Período personalizado</p>
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Data inicial</label>
                <input
                  type="date"
                  value={tempS}
                  onChange={e => setTempS(e.target.value)}
                  className="w-full h-8 px-3 rounded-lg border border-gray-200 text-[12px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400/40 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Data final</label>
                <input
                  type="date"
                  value={tempE}
                  min={tempS}
                  onChange={e => setTempE(e.target.value)}
                  className="w-full h-8 px-3 rounded-lg border border-gray-200 text-[12px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400/40 focus:border-gray-400"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 h-8 rounded-lg text-[12px] text-gray-500 hover:bg-gray-50 border border-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={applyCustom}
                disabled={!tempS || !tempE || tempE < tempS}
                className="flex-1 h-8 rounded-lg text-[12px] bg-gray-900 text-white hover:bg-gray-800 transition-colors font-medium disabled:opacity-40"
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
  const showWarning = warning && value > 0

  const inner = featured ? (
    <div
      className="h-full rounded-2xl bg-[#0f172a] p-5 flex flex-col gap-3 hover:bg-[#1e293b] transition-colors duration-200"
      style={{ boxShadow: '0 4px 20px rgba(15,23,42,0.18)' }}
    >
      <div className="flex items-start justify-between">
        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-white/75" />
        </div>
        <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-white/8 text-white/35 uppercase tracking-widest">
          Total
        </span>
      </div>
      <div className="mt-auto">
        <p className="text-[28px] font-semibold text-white tabular-nums leading-none">{displayValue ?? value}</p>
        <p className="text-[12px] text-white/60 mt-1.5 leading-tight">{label}</p>
        {subtitle && <p className="text-[10px] text-white/30 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  ) : (
    <div
      className={`h-full rounded-2xl bg-white p-4 flex flex-col gap-3 transition-all duration-200 hover:shadow-md ${
        showWarning ? 'border border-red-100' : 'border border-[#f1f5f9]'
      }`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-start justify-between">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${showWarning ? 'bg-red-50' : iconBg}`}>
          <Icon className={`w-4 h-4 ${showWarning ? 'text-red-700' : iconColor}`} />
        </div>
        {showWarning && (
          <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-200">
            Atenção
          </span>
        )}
      </div>
      <div>
        <p className="text-[26px] font-semibold text-[#0f172a] tabular-nums leading-none">{displayValue ?? value}</p>
        <p className="text-[12px] text-[#64748b] mt-1.5 leading-tight">{label}</p>
        {subtitle && <p className="text-[10px] text-[#94a3b8] mt-0.5">{subtitle}</p>}
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
      className="bg-white rounded-2xl border border-[#f1f5f9] p-5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {/* Month + nav */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setOffset(o => o - 5)}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#0f172a] transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <h3 className="text-[13px] font-semibold text-[#0f172a] capitalize">
          {format(center, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <button
          onClick={() => setOffset(o => o + 5)}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#0f172a] transition-colors"
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
              className={`flex flex-col items-center py-2.5 rounded-xl cursor-pointer transition-all duration-150 select-none ${
                isCurrent
                  ? 'bg-[#0f172a]'
                  : 'hover:bg-[#f8fafc]'
              }`}
            >
              <span className={`text-[14px] font-semibold leading-none ${isCurrent ? 'text-white' : 'text-[#1e293b]'}`}>
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
            <div key={item.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-[#f8fafc]">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDotColor[item.status] ?? 'bg-[#94a3b8]'}`} />
              <p className="text-[11.5px] text-[#0f172a] truncate flex-1 font-medium">{item.title}</p>
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
      <div className="flex flex-wrap gap-3 mt-4 pt-3.5 border-t border-[#f8fafc]">
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
      icon:       <DollarSign className="w-4 h-4 text-[#0f172a]" />,
      iconBg:     'bg-[#f1f5f9]',
      label:      'MRR',
      sub:        'receita mensal recorrente',
      value:      fmtBRL(data.mrr),
      valueColor: 'text-[#0f172a]',
      show:       true,
    },
    {
      icon:       <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      iconBg:     'bg-emerald-50',
      label:      'Recebido',
      sub:        'pago no ciclo atual',
      value:      fmtBRL(data.received),
      valueColor: 'text-emerald-700',
      show:       true,
    },
    {
      icon:       <Clock className="w-4 h-4 text-amber-500" />,
      iconBg:     'bg-amber-50',
      label:      'Pendente',
      sub:        'a receber no ciclo',
      value:      fmtBRL(data.pending),
      valueColor: data.pending > 0 ? 'text-amber-600' : 'text-[#94a3b8]',
      show:       true,
    },
    {
      icon:       <AlertTriangle className="w-4 h-4 text-red-500" />,
      iconBg:     'bg-red-50',
      label:      'Inadimplência',
      sub:        data.overdueCount > 0
                    ? `${data.overdueCount} cliente${data.overdueCount !== 1 ? 's' : ''} em atraso`
                    : 'nenhum em atraso',
      value:      fmtBRL(data.overdueAmt),
      valueColor: data.overdueCount > 0 ? 'text-red-600' : 'text-[#94a3b8]',
      show:       true,
    },
    {
      icon:       <TrendingUp className="w-4 h-4 text-blue-500" />,
      iconBg:     'bg-blue-50',
      label:      'Ticket médio',
      sub:        'por cliente ativo',
      value:      fmtBRL(data.avgTicket),
      valueColor: 'text-[#0f172a]',
      show:       true,
    },
  ]

  return (
    <div
      className="bg-white rounded-2xl border border-[#ececec] overflow-hidden"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#f5f5f7] flex items-center">
        <h3 className="text-[13px] font-semibold text-[#0f172a]">Resumo financeiro</h3>
        <Link to="/financial" className="ml-auto text-[11px] text-[#94a3b8] hover:text-[#475569] transition-colors">
          Ver detalhes →
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-[#f5f5f7]">
        {items.map((item, i) => (
          <div key={i} className="px-6 py-5 flex flex-col gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${item.iconBg}`}>
              {item.icon}
            </div>
            <div>
              <p className={`text-[20px] font-bold leading-tight tabular-nums ${item.valueColor}`}>
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
    { icon: CheckCircle2, label: 'Aprovados no período',    value: periodApproved,  color: 'text-emerald-800', bg: 'bg-emerald-50', href: '/planner' },
    { icon: Clock,        label: 'Aguardando aprovação',    value: pendingApproval, color: pendingApproval > 0 ? 'text-amber-800'  : 'text-gray-400', bg: pendingApproval > 0 ? 'bg-amber-50'  : 'bg-gray-50', href: '/planner' },
    { icon: CheckSquare,  label: 'Tarefas em aberto',       value: pendingTasks,    color: pendingTasks    > 0 ? 'text-blue-800'   : 'text-gray-400', bg: pendingTasks    > 0 ? 'bg-blue-50'   : 'bg-gray-50', href: '/tasks'   },
    { icon: AlertTriangle,label: 'Tarefas atrasadas',       value: overdueTasks,    color: overdueTasks    > 0 ? 'text-red-800'    : 'text-gray-400', bg: overdueTasks    > 0 ? 'bg-red-50'    : 'bg-gray-50', href: '/tasks'   },
  ]

  return (
    <div
      className="bg-white rounded-2xl border border-[#f1f5f9] p-5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-[13px] font-semibold text-[#0f172a]">Resumo operacional</h3>
      </div>
      <div className="space-y-0.5">
        {rows.map((row, i) => (
          <Link key={i} to={row.href}>
            <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-[#f8fafc] transition-colors cursor-pointer">
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${row.bg}`}>
                <row.icon className={`w-3.5 h-3.5 ${row.color}`} />
              </div>
              <p className="text-[11.5px] text-[#475569] flex-1 leading-snug">{row.label}</p>
              <span className={`text-[14px] font-semibold tabular-nums ${row.color}`}>{row.value}</span>
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
  const [stats, setStats]                       = useState<Stats>({ total_clients: 0, active_clients: 0, pending_tasks: 0, overdue_tasks: 0, period_pending_approval: 0, period_approved: 0, period_scheduled: 0, period_published: 0, period_in_production: 0, period_adjustments: 0 })
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

    // ── Derivar TODOS os contadores de aprovação a partir de plannerRes ────────
    // Usa isAwaitingApproval() — única fonte de verdade, alinhada com o Planner
    const pList = plannerRes.data || []
    const period_pending_approval = pList.filter(isAwaitingApproval).length
    const period_approved         = pList.filter((p: any) => p.approval_status === 'aprovado').length
    const period_scheduled     = pList.filter((p: any) => p.status === 'agendado').length
    const period_published     = pList.filter((p: any) => p.status === 'publicado').length
    const period_in_production = pList.filter((p: any) => p.status === 'producao' || p.status === 'revisao').length
    const period_adjustments   = pList.filter((p: any) => p.approval_status === 'ajuste_solicitado' || p.approval_status === 'reprovado').length

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
      period_in_production,
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
      { label: 'Ideia',         value: pList.filter((p: any) => p.status === 'ideia').length,   color: '#8b5cf6' },
      { label: 'Revisão',       value: pList.filter((p: any) => p.status === 'revisao').length, color: '#f59e0b' },
      { label: 'Ag. aprovação', value: pList.filter(isAwaitingApproval).length,                 color: '#f97316' },
      { label: 'Aprovado',      value: period_approved,                                          color: '#10b981' },
    ])
  }

  // ── Greeting com IA ───────────────────────────────────────────────────────
  const { greeting, message, pills, isLoading: greetingLoading, refresh: refreshGreeting } =
    useDashboardGreeting(user?.id, userName, stats, statsReady, (profile as any)?.agency_name || '')

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-[#f5f5f7]">

      {/* Header */}
      <Header
        title="Dashboard"
        subtitle="Visão geral da operação"
        dark={false}
      />

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

        {/* KPI Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Posts Agendados"
            value={stats.period_scheduled}
            subtitle="no período"
            href="/planner"
            icon={CalendarDays}
            iconBg="bg-blue-50"
            iconColor="text-blue-700"
          />
          <KpiCard
            label="Posts Publicados"
            value={stats.period_published}
            subtitle="no período"
            href="/planner"
            icon={CheckCircle2}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-700"
          />
          <KpiCard
            label="Em Produção"
            value={stats.period_in_production}
            subtitle="criação e revisão"
            href="/planner"
            icon={Clock}
            iconBg="bg-purple-50"
            iconColor="text-purple-700"
          />
          <KpiCard
            label="Ajustes Solicitados"
            value={stats.period_adjustments}
            subtitle={stats.period_adjustments > 0 ? 'requer correção' : 'nenhum pendente'}
            href="/planner"
            icon={AlertTriangle}
            warning
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
          </div>
        </div>

        {/* ── Resumo Financeiro — full width ── */}
        <FinancialSummary data={finStats} />

      </div>
    </div>
  )
}
