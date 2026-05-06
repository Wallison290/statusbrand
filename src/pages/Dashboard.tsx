import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Sparkles, CheckSquare, ArrowRight, Plus, Clock,
  AlertTriangle, TrendingUp, CalendarDays, CheckCircle2, BarChart2,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { formatRelative, contentTypeLabels } from '@/utils/formatters'
import {
  startOfWeek, endOfWeek, eachDayOfInterval, format,
  isToday, addDays, subDays, startOfToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MetricsCarousel } from '@/components/dashboard/MetricsCarousel'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  total_clients:         number
  active_clients:        number
  pending_tasks:         number
  overdue_tasks:         number
  week_pending_approval: number
  week_approved:         number
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

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, subtitle, href, icon: Icon, iconBg, iconColor, warning = false,
}: {
  label: string
  value: number
  subtitle?: string
  href?: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  warning?: boolean
}) {
  const showWarning = warning && value > 0

  const inner = (
    <div className="group rounded-3xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 h-full flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-[18px] h-[18px] ${iconColor}`} />
        </div>
        {showWarning && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-400 border border-red-100">
            Atenção
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-semibold text-gray-900 tabular-nums leading-none">
          {value}
        </p>
        <p className="text-[13px] font-medium text-gray-700 mt-2 leading-tight">{label}</p>
        {subtitle && (
          <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  )

  if (href) return <Link to={href} className="block h-full">{inner}</Link>
  return inner
}

// ─── Mini Planner Preview ─────────────────────────────────────────────────────

const statusDotColor: Record<string, string> = {
  ideia:     'bg-purple-400',
  producao:  'bg-blue-400',
  revisao:   'bg-amber-400',
  aprovado:  'bg-emerald-400',
  publicado: 'bg-green-400',
}

function MiniPlannerPreview({
  items,
  onDayClick,
}: {
  items: PlannerDay[]
  onDayClick: (date: string) => void
}) {
  const today = startOfToday()
  const days = [-2, -1, 0, 1, 2].map(d => addDays(today, d))
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  return (
    <div>
      <div className="flex gap-1.5">
        {days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd')
          const dayItems = items.filter(i => i.scheduled_date === dayStr)
          const active = isToday(day)

          return (
            <div
              key={dayStr}
              onClick={() => onDayClick(dayStr)}
              onMouseEnter={() => dayItems.length > 0 ? setHoveredDay(dayStr) : null}
              onMouseLeave={() => setHoveredDay(null)}
              className={`relative flex-1 flex flex-col items-center py-3 px-1 rounded-2xl cursor-pointer transition-all duration-150 select-none ${
                active
                  ? 'bg-gray-900'
                  : 'hover:bg-gray-50 border border-transparent hover:border-gray-100'
              }`}
            >
              <span className={`text-[10px] font-medium mb-1 capitalize ${active ? 'text-white/60' : 'text-gray-400'}`}>
                {format(day, 'EEE', { locale: ptBR }).replace('.', '')}
              </span>
              <span className={`text-[15px] font-semibold leading-none ${active ? 'text-white' : 'text-gray-900'}`}>
                {format(day, 'd')}
              </span>

              {dayItems.length > 0 && (
                <div className="flex gap-0.5 mt-2 flex-wrap justify-center">
                  {dayItems.slice(0, 3).map(item => (
                    <div
                      key={item.id}
                      className={`w-1.5 h-1.5 rounded-full ${
                        active ? 'bg-white/70' : (statusDotColor[item.status] ?? 'bg-gray-400')
                      }`}
                    />
                  ))}
                  {dayItems.length > 3 && (
                    <span className={`text-[8px] font-bold ${active ? 'text-white/60' : 'text-gray-400'}`}>
                      +{dayItems.length - 3}
                    </span>
                  )}
                </div>
              )}

              <AnimatePresence>
                {hoveredDay === dayStr && dayItems.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-30 w-[160px] bg-gray-900 rounded-2xl shadow-xl p-2.5"
                    onClick={e => e.stopPropagation()}
                  >
                    {dayItems.slice(0, 4).map(item => (
                      <div key={item.id} className="flex items-start gap-1.5 py-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full mt-[4px] flex-shrink-0 ${statusDotColor[item.status] ?? 'bg-white/50'}`} />
                        <p className="text-[10px] text-white/90 leading-snug line-clamp-2">{item.title}</p>
                      </div>
                    ))}
                    {dayItems.length > 4 && (
                      <p className="text-[9px] text-white/40 mt-1 text-center">+{dayItems.length - 4} mais</p>
                    )}
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-1.5 overflow-hidden">
                      <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3 mt-4 flex-wrap">
        {Object.entries(statusDotColor).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
            <span className="text-[11px] text-gray-400 capitalize">
              {status === 'producao' ? 'Produção' : status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Smart Alerts ─────────────────────────────────────────────────────────────

function SmartAlerts({
  pendingApproval,
  overdueTasks,
  pendingTasks,
}: {
  pendingApproval: number
  overdueTasks: number
  pendingTasks: number
}) {
  const alerts: { icon: React.ElementType; text: string; color: string; bg: string; href: string }[] = []

  if (pendingApproval > 0) {
    alerts.push({
      icon: Clock,
      text: `${pendingApproval} conteúdo${pendingApproval > 1 ? 's' : ''} aguardando aprovação`,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      href: '/planner',
    })
  }
  if (overdueTasks > 0) {
    alerts.push({
      icon: AlertTriangle,
      text: `${overdueTasks} tarefa${overdueTasks > 1 ? 's' : ''} atrasada${overdueTasks > 1 ? 's' : ''}`,
      color: 'text-red-500',
      bg: 'bg-red-50',
      href: '/tasks',
    })
  }
  if (pendingTasks > 0 && overdueTasks === 0) {
    alerts.push({
      icon: CheckSquare,
      text: `${pendingTasks} tarefa${pendingTasks > 1 ? 's' : ''} em aberto`,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      href: '/tasks',
    })
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 gap-2 text-center">
        <div className="w-9 h-9 rounded-2xl bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <p className="text-[13px] font-medium text-gray-700">Tudo em ordem!</p>
        <p className="text-[11px] text-gray-400">Nenhum alerta no momento</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <Link key={i} to={alert.href}>
          <div className={`flex items-center gap-3 p-3 rounded-2xl border border-transparent hover:border-gray-100 transition-all group cursor-pointer ${alert.bg}`}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 bg-white shadow-sm">
              <alert.icon className={`w-3.5 h-3.5 ${alert.color}`} />
            </div>
            <p className={`text-[13px] font-medium flex-1 leading-snug ${alert.color}`}>{alert.text}</p>
            <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
          </div>
        </Link>
      ))}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState<Stats>({
    total_clients: 0, active_clients: 0,
    pending_tasks: 0, overdue_tasks: 0,
    week_pending_approval: 0, week_approved: 0,
  })
  const [recentContents, setRecentContents]     = useState<any[]>([])
  const [weeklyData, setWeeklyData]             = useState<any[]>([])
  const [assetTypes, setAssetTypes]             = useState<{ type: string; count: number }[]>([])
  const [plannerStatuses, setPlannerStatuses]   = useState<{ status: string; count: number }[]>([])
  const [plannerChartData, setPlannerChartData] = useState<PlannerChartEntry[]>([])
  const [plannerWeekItems, setPlannerWeekItems] = useState<PlannerDay[]>([])
  const [pendingApproval, setPendingApproval]   = useState(0)

  useEffect(() => {
    if (!user) return
    fetchStats()
  }, [user])

  async function fetchStats() {
    const now       = new Date()
    const weekStart = startOfWeek(now, { locale: ptBR })
    const weekEnd   = endOfWeek(now, { locale: ptBR })
    const weekStartIso  = weekStart.toISOString()
    const weekEndIso    = weekEnd.toISOString()
    const weekStartDate = format(weekStart, 'yyyy-MM-dd')
    const weekEndDate   = format(weekEnd,   'yyyy-MM-dd')
    const calStart  = format(subDays(now, 2), 'yyyy-MM-dd')
    const calEnd    = format(addDays(now, 2), 'yyyy-MM-dd')

    const [
      clientsRes, tasksRes,
      recentRes, allContentsRes, assetsRes, plannerFullRes,
      plannerCalRes, pendingApprovalRes,
      weekPendingRes, weekApprovedRes,
    ] = await Promise.all([
      supabase.from('clients').select('id, status').eq('user_id', user!.id),
      supabase.from('tasks').select('id, status, due_date').eq('user_id', user!.id).neq('status', 'concluido'),
      supabase.from('contents').select('id, term, content_type, status, created_at, client:clients(company_name)').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('contents').select('created_at').eq('user_id', user!.id).gte('created_at', weekStartIso).lte('created_at', weekEndIso),
      supabase.from('content_assets').select('content_type').eq('user_id', user!.id),
      // Planner full: status + approval_status for 4-category chart
      supabase.from('planner').select('status, approval_status').eq('user_id', user!.id),
      // Mini calendar (5-day window)
      supabase.from('planner').select('id, title, content_type, status, scheduled_date').eq('user_id', user!.id).gte('scheduled_date', calStart).lte('scheduled_date', calEnd),
      // All pending approvals (for smart alerts) — status revisao + not yet resolved
      supabase.from('planner').select('id, approval_status').eq('user_id', user!.id).eq('status', 'revisao'),
      // This week's items in revisao (KPI card — filtered client-side)
      supabase.from('planner').select('id, approval_status').eq('user_id', user!.id).eq('status', 'revisao').gte('scheduled_date', weekStartDate).lte('scheduled_date', weekEndDate),
      // This week's approved (KPI card)
      supabase.from('planner').select('id').eq('user_id', user!.id).gte('scheduled_date', weekStartDate).lte('scheduled_date', weekEndDate).eq('approval_status', 'aprovado'),
    ])

    const clients  = clientsRes.data || []
    const taskList = tasksRes.data   || []
    const overdue  = taskList.filter(t => t.due_date && new Date(t.due_date) < now).length

    const NOT_AWAITING = ['aprovado', 'reprovado', 'ajuste_solicitado']
    const isAwaiting = (p: any) => !NOT_AWAITING.includes(p.approval_status)

    setStats({
      total_clients:         clients.length,
      active_clients:        clients.filter(c => c.status === 'ativo').length,
      pending_tasks:         taskList.length,
      overdue_tasks:         overdue,
      week_pending_approval: (weekPendingRes.data || []).filter(isAwaiting).length,
      week_approved:         weekApprovedRes.data?.length || 0,
    })

    setRecentContents(recentRes.data || [])
    setPlannerWeekItems((plannerCalRes.data || []) as PlannerDay[])
    setPendingApproval((pendingApprovalRes.data || []).filter(isAwaiting).length)

    // Weekly bar chart (contents)
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const contents = allContentsRes.data || []
    setWeeklyData(days.map(day => ({
      day: format(day, 'EEE', { locale: ptBR }),
      conteudos: contents.filter(c => c.created_at.startsWith(format(day, 'yyyy-MM-dd'))).length,
    })))

    // Asset types donut
    const typeMap: Record<string, number> = {}
    ;(assetsRes.data || []).forEach((a: any) => { typeMap[a.content_type] = (typeMap[a.content_type] || 0) + 1 })
    setAssetTypes(Object.entries(typeMap).map(([type, count]) => ({ type, count })))

    // Legacy planner status (kept for fallback)
    const statusMap: Record<string, number> = {}
    ;(plannerFullRes.data || []).forEach((p: any) => { statusMap[p.status] = (statusMap[p.status] || 0) + 1 })
    setPlannerStatuses(Object.entries(statusMap).map(([status, count]) => ({ status, count })))

    // New 4-category planner chart
    const pList = plannerFullRes.data || []
    setPlannerChartData([
      { label: 'Ideia',          value: pList.filter((p: any) => p.status === 'ideia').length,                      color: '#8b5cf6' },
      { label: 'Revisão',        value: pList.filter((p: any) => p.status === 'revisao').length,                    color: '#f59e0b' },
      { label: 'Ag. aprovação',  value: pList.filter((p: any) => p.status === 'revisao' && !NOT_AWAITING.includes(p.approval_status)).length, color: '#f97316' },
      { label: 'Aprovado',       value: pList.filter((p: any) => p.approval_status === 'aprovado').length,          color: '#10b981' },
    ])
  }

  function handleDayClick(_dateStr: string) {
    navigate('/planner')
  }

  return (
    <div className="min-h-full bg-[#f5f6fa]">
      <Header
        title="Dashboard"
        subtitle="Visão geral da operação"
        dark={false}
        action={
          <Button asChild size="sm" className="bg-gray-900 text-white hover:bg-gray-800 rounded-xl border-0">
            <Link to="/content"><Plus className="w-3.5 h-3.5 mr-1" /> Gerar conteúdo</Link>
          </Button>
        }
      />

      <div className="p-5 md:p-8 space-y-6">

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard
            label="Total de Clientes"
            value={stats.total_clients}
            subtitle="total cadastrado"
            href="/clients"
            icon={Users}
            iconBg="bg-gray-100"
            iconColor="text-gray-500"
          />
          <KpiCard
            label="Clientes Ativos"
            value={stats.active_clients}
            subtitle="em operação"
            href="/clients"
            icon={TrendingUp}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <KpiCard
            label="Tarefas Pendentes"
            value={stats.pending_tasks}
            subtitle="em aberto"
            href="/tasks"
            icon={CheckSquare}
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
          />
          <KpiCard
            label="Tarefas Atrasadas"
            value={stats.overdue_tasks}
            subtitle={stats.overdue_tasks > 0 ? 'requer atenção' : 'nenhuma atrasada'}
            href="/tasks"
            icon={AlertTriangle}
            iconBg="bg-red-50"
            iconColor="text-red-400"
            warning
          />
          <KpiCard
            label="Ag. aprovação"
            value={stats.week_pending_approval}
            subtitle="esta semana"
            href="/planner"
            icon={Clock}
            iconBg="bg-orange-50"
            iconColor="text-orange-500"
          />
          <KpiCard
            label="Aprovados"
            value={stats.week_approved}
            subtitle="esta semana"
            href="/planner"
            icon={CheckCircle2}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
        </div>

        {/* ── Main Grid ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: Métricas */}
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

          {/* RIGHT: Calendário + Alertas */}
          <div className="flex flex-col gap-5">

            {/* Mini Planner Calendar */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900">Próximos dias</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5 capitalize">
                    {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <Link to="/planner">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-700 transition-colors">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Planejamento</span>
                  </div>
                </Link>
              </div>

              <MiniPlannerPreview items={plannerWeekItems} onDayClick={handleDayClick} />

              {(() => {
                const todayStr   = format(new Date(), 'yyyy-MM-dd')
                const todayItems = plannerWeekItems.filter(i => i.scheduled_date === todayStr)
                if (todayItems.length === 0) return (
                  <p className="text-[11px] text-gray-400 text-center mt-5">
                    Nenhum post agendado para hoje
                  </p>
                )
                return (
                  <div className="mt-5 space-y-1.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Hoje</p>
                    {todayItems.slice(0, 3).map(item => (
                      <div key={item.id} className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-gray-50">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDotColor[item.status] ?? 'bg-gray-300'}`} />
                        <p className="text-[12px] text-gray-800 truncate flex-1 font-medium">{item.title}</p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {contentTypeLabels[item.content_type as any] ?? item.content_type}
                        </span>
                      </div>
                    ))}
                    {todayItems.length > 3 && (
                      <Link to="/planner">
                        <p className="text-[11px] text-gray-400 hover:text-gray-700 text-center transition-colors mt-1">
                          +{todayItems.length - 3} mais →
                        </p>
                      </Link>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Smart Alerts */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-xl bg-gray-100 flex items-center justify-center">
                  <BarChart2 className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <h3 className="text-[14px] font-semibold text-gray-900">Atenção</h3>
              </div>
              <SmartAlerts
                pendingApproval={pendingApproval}
                overdueTasks={stats.overdue_tasks}
                pendingTasks={stats.pending_tasks}
              />
            </div>

          </div>
        </div>

        {/* ── Conteúdos Recentes ────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900">Conteúdos Recentes</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Últimos conteúdos gerados</p>
            </div>
            <Link to="/history">
              <div className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-gray-700 transition-colors font-medium">
                Ver todos <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </div>

          {recentContents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
              <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-gray-300" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-gray-600">Nenhum conteúdo gerado ainda</p>
                <p className="text-[12px] text-gray-400 mt-0.5">Crie seu primeiro conteúdo agora</p>
              </div>
              <Button asChild size="sm" variant="outline" className="mt-1 rounded-xl">
                <Link to="/content">Gerar conteúdo</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentContents.map(c => (
                <div key={c.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/70 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{c.term}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {(c.client as any)?.company_name || 'Sem cliente'} · {formatRelative(c.created_at)}
                    </p>
                  </div>
                  <span className="text-[11px] text-gray-400 hidden sm:block flex-shrink-0">
                    {contentTypeLabels[c.content_type]}
                  </span>
                  <Badge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
