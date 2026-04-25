import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, Sparkles, CheckSquare, ArrowRight, Plus, Clock } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { formatRelative, contentTypeLabels, statusColors } from '@/utils/formatters'
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns'
// recharts used inside MetricsCarousel — no direct import needed here
import { ptBR } from 'date-fns/locale'
import { MetricsCarousel } from '@/components/dashboard/MetricsCarousel'

interface Stats {
  total_clients: number
  active_clients: number
  contents_this_week: number
  pending_tasks: number
  overdue_tasks: number
  contents_in_production: number
}

const StatCard = ({ label, value, href }: {
  label: string, value: number, href?: string
}) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-[11px] text-zinc-500 font-normal">{label}</p>
      <p className="text-2xl font-medium text-[#0f0f0f] mt-1 tabular-nums">{value}</p>
      {href && (
        <Link to={href} className="flex items-center gap-1 text-[11px] text-[#737373] hover:text-[#0f0f0f] mt-2 transition-colors">
          Ver detalhes <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </CardContent>
  </Card>
)

export function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({ total_clients: 0, active_clients: 0, contents_this_week: 0, pending_tasks: 0, overdue_tasks: 0, contents_in_production: 0 })
  const [recentContents, setRecentContents] = useState<any[]>([])
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [assetTypes, setAssetTypes]           = useState<{ type: string; count: number }[]>([])
  const [plannerStatuses, setPlannerStatuses] = useState<{ status: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchStats()
  }, [user])

  async function fetchStats() {
    const now = new Date()
    const weekStart = startOfWeek(now, { locale: ptBR }).toISOString()
    const weekEnd = endOfWeek(now, { locale: ptBR }).toISOString()

    const [
      clientsRes, contentsWeekRes, tasksRes, plannerRes,
      recentRes, allContentsRes, assetsRes, plannerFullRes,
    ] = await Promise.all([
      supabase.from('clients').select('id, status').eq('user_id', user!.id),
      supabase.from('contents').select('id').eq('user_id', user!.id).gte('created_at', weekStart).lte('created_at', weekEnd),
      supabase.from('tasks').select('id, status, due_date').eq('user_id', user!.id).neq('status', 'concluido'),
      supabase.from('planner').select('id, status').eq('user_id', user!.id).eq('status', 'producao'),
      supabase.from('contents').select('id, term, content_type, status, created_at, client:clients(company_name)').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('contents').select('created_at').eq('user_id', user!.id).gte('created_at', weekStart).lte('created_at', weekEnd),
      // NEW: arsenal (content_assets) — group by type client-side
      supabase.from('content_assets').select('content_type').eq('user_id', user!.id),
      // NEW: planner — all statuses for the chart
      supabase.from('planner').select('status').eq('user_id', user!.id),
    ])

    const clients = clientsRes.data || []
    const taskList = tasksRes.data || []
    const overdue = taskList.filter(t => t.due_date && new Date(t.due_date) < now).length

    setStats({
      total_clients: clients.length,
      active_clients: clients.filter(c => c.status === 'ativo').length,
      contents_this_week: contentsWeekRes.data?.length || 0,
      pending_tasks: taskList.length,
      overdue_tasks: overdue,
      contents_in_production: plannerRes.data?.length || 0,
    })

    setRecentContents(recentRes.data || [])

    // Build weekly bar chart data
    const days = eachDayOfInterval({ start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) })
    const contents = allContentsRes.data || []
    const daily = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const count = contents.filter(c => c.created_at.startsWith(dayStr)).length
      return { day: format(day, 'EEE', { locale: ptBR }), conteudos: count }
    })
    setWeeklyData(daily)

    // Build asset-types donut data
    const assetList = assetsRes.data || []
    const typeMap: Record<string, number> = {}
    assetList.forEach(a => { typeMap[a.content_type] = (typeMap[a.content_type] || 0) + 1 })
    setAssetTypes(Object.entries(typeMap).map(([type, count]) => ({ type, count })))

    // Build planner-status donut data
    const plannerList = plannerFullRes.data || []
    const statusMap: Record<string, number> = {}
    plannerList.forEach(p => { statusMap[p.status] = (statusMap[p.status] || 0) + 1 })
    setPlannerStatuses(Object.entries(statusMap).map(([status, count]) => ({ status, count })))

    setLoading(false)
  }

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Visão geral da operação"
        action={
          <Button asChild size="sm">
            <Link to="/content"><Plus className="w-3.5 h-3.5" /> Gerar conteúdo</Link>
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard label="Total Clientes" value={stats.total_clients} href="/clients" />
          <StatCard label="Clientes Ativos" value={stats.active_clients} href="/clients" />
          <StatCard label="Conteúdos (semana)" value={stats.contents_this_week} href="/history" />
          <StatCard label="Tarefas Pendentes" value={stats.pending_tasks} href="/tasks" />
          <StatCard label="Tarefas Atrasadas" value={stats.overdue_tasks} href="/tasks" />
          <StatCard label="Em Produção" value={stats.contents_in_production} href="/planner" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metrics carousel — replaces the old fixed bar chart */}
          <MetricsCarousel
            weeklyData={weeklyData}
            assetTypes={assetTypes}
            plannerStatuses={plannerStatuses}
            contentsThisWeek={stats.contents_this_week}
            totalAssets={assetTypes.reduce((s, t) => s + t.count, 0)}
            totalPlanner={plannerStatuses.reduce((s, p) => s + p.count, 0)}
          />

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Novo cliente', href: '/clients/new', icon: Users },
                { label: 'Gerar conteúdo', href: '/content', icon: Sparkles },
                { label: 'Nova tarefa', href: '/tasks', icon: CheckSquare },
                { label: 'Planejar post', href: '/planner', icon: Clock },
              ].map(a => (
                <Link key={a.href} to={a.href}>
                  <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-[#f0f0f0] transition-colors group">
                    <a.icon className="w-3.5 h-3.5 text-[#a0a0a0] group-hover:text-[#737373]" />
                    <span className="text-[13px] text-[#737373] group-hover:text-[#0f0f0f]">{a.label}</span>
                    <ArrowRight className="w-3 h-3 text-[#c0c0c0] ml-auto group-hover:text-[#a0a0a0]" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent contents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Conteúdos Recentes</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/history">Ver todos <ArrowRight className="w-3 h-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentContents.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">Nenhum conteúdo gerado ainda.</p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link to="/content">Gerar primeiro conteúdo</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentContents.map(c => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-[#f7f7f7] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-normal text-[#0f0f0f] truncate">{c.term}</p>
                      <p className="text-[11px] text-zinc-600">{(c.client as any)?.company_name || 'Sem cliente'} · {formatRelative(c.created_at)}</p>
                    </div>
                    <Badge status={c.status} />
                    <span className="text-[11px] text-zinc-600 hidden sm:block">{contentTypeLabels[c.content_type]}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
