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
  const isWarning = warning && value > 0

  const inner = (
    <div className={`group rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col gap-3 ${
      isWarning
        ? 'border-red-200/60 bg-red-50/60 hover:border-red-300/60'
        : 'border-white/10 bg-white hover:border-white/20'
    }`}>
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        {isWarning && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-500 uppercase tracking-wide">
            Atenção
          </span>
        )}
      </div>
      <div>
        <p className="text-[30px] font-bold text-[#0f0f0f] tabular-nums leading-none">
          {value}
        </p>
        <p className="text-[12px] font-medium text-[#737373] mt-1">{label}</p>
        {subtitle && (
          <p className="text-[11px] text-[#a0a0a0] mt-0.5">{subtitle}</p>
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
              className={`relative flex-1 flex flex-col items-center py-2.5 px-1 rounded-xl cursor-pointer transition-all duration-150 select-none ${
                active
                  ? 'bg-[#0f0f0f]'
                  : 'hover:bg-[#f5f5f5] border border-transparent hover:border-[#e8e8e8]'
              }`}
            >
              <span className={`text-[10px] font-medium mb-1 capitalize ${active ? 'text-white/60' : 'text-[#a0a0a0]'}`}>
                {format(day, 'EEE', { locale: ptBR }).replace('.', '')}
              </span>
              <span className={`text-[15px] font-bold leading-none ${active ? 'text-white' : 'text-[#0f0f0f]'}`}>
                {format(day, 'd')}
              </span>

              {dayItems.length > 0 && (
                <div className="flex gap-0.5 mt-2 flex-wrap justify-center">
                  {dayItems.slice(0, 3).map(item => (
                    <div
                      key={item.id}
                      className={`w-1.5 h-1.5 rounded-full ${
                        active ? 'bg-white/70' : (statusDotColor[item.status] ?? 'bg-[#0f0f0f]')
                      }`}
                    />
                  ))}
                  {dayItems.length > 3 && (
                    <span className={`text-[8px] font-bold ${active ? 'text-white/60' : 'text-[#a0a0a0]'}`}>
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
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-30 w-[160px] bg-[#0f0f0f] rounded-xl shadow-xl p-2.5"
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
                      <div className="w-2 h-2 bg-[#0f0f0f] rotate-45 mx-auto" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {Object.entries(statusDotColor).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
            <span className="text-[10px] text-[#a0a0a0] capitalize">
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
      color: 'text-red-600',
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
        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <p className="text-[12px] text-[#737373]">Tudo em ordem!</p>
        <p className="text-[11px] text-[#a0a0a0]">Nenhum alerta no momento</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <Link key={i} to={alert.href}>
          <div className={`flex items-center gap-2.5 p-2.5 rounded-xl border border-transparent hover:border-[#e8e8e8] transition-all ${alert.bg} group`}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/70">
              <alert.icon className={`w-3.5 h-3.5 ${alert.color}`} />
            </div>
            <p className={`text-[12px] font-medium flex-1 ${alert.color}`}>{alert.text}</p>
            <ArrowRight className="w-3 h-3 text-[#c0c0c0] group-hover:text-[#a0a0a0] transition-colors" />
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
      // All pending approvals (for smart alerts)
      supabase.from('planner').select('id').eq('user_id', user!.id).eq('approval_status', 'pendente_aprovacao'),
      // This week's pending approval (KPI card)
      supabase.from('planner').select('id').eq('user_id', user!.id).gte('scheduled_date', weekStartDate).lte('scheduled_date', weekEndDate).eq('approval_status', 'pendente_aprovacao'),
      // This week's approved (KPI card)
      supabase.from('planner').select('id').eq('user_id', user!.id).gte('scheduled_date', weekStartDate).lte('scheduled_date', weekEndDate).eq('approval_status', 'aprovado'),
    ])

    const clients  = clientsRes.data || []
    const taskList = tasksRes.data   || []
    const overdue  = taskList.filter(t => t.due_date && new Date(t.due_date) < now).length

    setStats({
      total_clients:         clients.length,
      active_clients:        clients.filter(c => c.status === 'ativo').length,
      pending_tasks:         taskList.length,
      overdue_tasks:         overdue,
      week_pending_approval: weekPendingRes.data?.length  || 0,
      week_approved:         weekApprovedRes.data?.length || 0,
    })

    setRecentContents(recentRes.data || [])
    setPlannerWeekItems((plannerCalRes.data || []) as PlannerDay[])
    setPendingApproval(pendingApprovalRes.data?.length || 0)

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
      { label: 'Ag. aprovação',  value: pList.filter((p: any) => p.approval_status === 'pendente_aprovacao').length, color: '#f97316' },
      { label: 'Aprovado',       value: pList.filter((p: any) => p.approval_status === 'aprovado').length,          color: '#10b981' },
    ])
  }

  function handleDayClick(_dateStr: string) {
    navigate('/planner')
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Header
        dark
        title="Dashboard"
        subtitle="Visão geral da operação"
        action={
          <Button asChild size="sm">
            <Link to="/content"><Plus className="w-3.5 h-3.5 mr-1" /> Gerar conteúdo</Link>
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-5">

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          <KpiCard
            label="Total de Clientes"
            value={stats.total_clients}
            subtitle="total cadastrado"
            href="/clients"
            icon={Users}
            iconBg="bg-[#f5f5f5]"
            iconColor="text-[#737373]"
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
            iconColor="text-blue-600"
          />
          <KpiCard
            label="Tarefas Atrasadas"
            value={stats.overdue_tasks}
            subtitle={stats.overdue_tasks > 0 ? 'requer atenção' : 'nenhuma atrasada'}
            href="/tasks"
            icon={AlertTriangle}
            iconBg="bg-red-50"
            iconColor="text-red-500"
            warning
          />
          <KpiCard
            label="Ag. aprovação"
            value={stats.week_pending_approval}
            subtitle="esta semana"
            href="/planner"
            icon={Clock}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

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
          <div className="flex flex-col gap-4">

            {/* Mini Planner Calendar */}
            <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[13px] font-semibold text-[#0f0f0f]">Próximos dias</h3>
                  <p className="text-[11px] text-[#a0a0a0] mt-0.5">
                    {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <Link to="/planner">
                  <div className="flex items-center gap-1 text-[11px] text-[#a0a0a0] hover:text-[#0f0f0f] transition-colors">
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
                  <p className="text-[11px] text-[#a0a0a0] text-center mt-4">
                    Nenhum post agendado para hoje
                  </p>
                )
                return (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-wide mb-2">Hoje</p>
                    {todayItems.slice(0, 3).map(item => (
                      <div key={item.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#f8f8f8]">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDotColor[item.status] ?? 'bg-[#a0a0a0]'}`} />
                        <p className="text-[12px] text-[#0f0f0f] truncate flex-1">{item.title}</p>
                        <span className="text-[10px] text-[#a0a0a0] flex-shrink-0">
                          {contentTypeLabels[item.content_type as any] ?? item.content_type}
                        </span>
                      </div>
                    ))}
                    {todayItems.length > 3 && (
                      <Link to="/planner">
                        <p className="text-[11px] text-[#a0a0a0] hover:text-[#0f0f0f] text-center transition-colors">
                          +{todayItems.length - 3} mais →
                        </p>
                      </Link>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Smart Alerts */}
            <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="w-3.5 h-3.5 text-[#737373]" />
                <h3 className="text-[13px] font-semibold text-[#0f0f0f]">Atenção</h3>
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
        <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0]">
            <div>
              <h3 className="text-[13px] font-semibold text-[#0f0f0f]">Conteúdos Recentes</h3>
              <p className="text-[11px] text-[#a0a0a0] mt-0.5">Últimos conteúdos gerados</p>
            </div>
            <Link to="/history">
              <div className="flex items-center gap-1 text-[11px] text-[#a0a0a0] hover:text-[#0f0f0f] transition-colors">
                Ver todos <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          </div>

          {recentContents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="w-10 h-10 rounded-2xl bg-[#f8f8f8] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#d0d0d0]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#737373]">Nenhum conteúdo gerado ainda</p>
                <p className="text-[12px] text-[#a0a0a0] mt-0.5">Crie seu primeiro conteúdo agora</p>
              </div>
              <Button asChild size="sm" variant="outline" className="mt-1">
                <Link to="/content">Gerar conteúdo</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-[#f5f5f5]">
              {recentContents.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#fafafa] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#0f0f0f] truncate">{c.term}</p>
                    <p className="text-[11px] text-[#a0a0a0] mt-0.5">
                      {(c.client as any)?.company_name || 'Sem cliente'} · {formatRelative(c.created_at)}
                    </p>
                  </div>
                  <span className="text-[11px] text-[#a0a0a0] hidden sm:block flex-shrink-0">
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
