import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, BarChart3, Instagram, Sparkles, RefreshCw, Plus,
  Users, Eye, Heart, DollarSign, TrendingUp, Calendar, CheckCircle2, BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useClient } from '@/hooks/useClients'
import { useSubscription } from '@/hooks/useSubscription'
import { useClientReports, useCreateReport, useUpdateReport } from '@/hooks/useReports'
import { usePlanningReport } from '@/hooks/usePlanningReport'
import { IgInsights } from '@/components/reports/IgInsights'
import { supabase } from '@/integrations/supabase/client'
import { callProxy } from '@/lib/aiProxy'
import { contentTypeLabels, statusLabels } from '@/utils/formatters'
import type { ClientReport } from '@/types'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function monthLabel(month: number, year: number) {
  return `${MONTHS[month - 1]} ${year}`
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtBRL(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(n)
}

function followerDiff(r: ClientReport): string {
  if (r.followers_start == null || r.followers_end == null) return fmt(r.followers_end)
  const diff = r.followers_end - r.followers_start
  return diff >= 0 ? `+${fmt(diff)}` : fmt(diff)
}

function hasPaid(r: ClientReport) {
  return r.paid_investment != null || r.paid_leads != null || r.paid_cpl != null
    || r.paid_conversions != null || r.paid_roas != null
}

// ── KPI pequeno pro resumo do mês ──────────────────────────────────────────

function KpiPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5" style={{ background: 'var(--sm-bg-alt)', border: '1px solid var(--sm-border)' }}>
      <div className="opacity-70">{icon}</div>
      <div>
        <p className="text-[14px] font-bold leading-tight" style={{ color: 'var(--sm-text-1)' }}>{value}</p>
        <p className="text-[10px]" style={{ color: 'var(--sm-text-2)' }}>{label}</p>
      </div>
    </div>
  )
}

function StatRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] w-20 flex-shrink-0 truncate" style={{ color: 'var(--sm-text-2)' }}>{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--sm-bg)' }}>
        <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-semibold w-6 text-right flex-shrink-0" style={{ color: 'var(--sm-text-1)' }}>{count}</span>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────

export function ReportsWorkspace() {
  const { clientId } = useParams<{ clientId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const now = new Date()
  const initialMonth = Number(searchParams.get('month')) || now.getMonth() + 1
  const initialYear  = Number(searchParams.get('year'))  || now.getFullYear()

  const { data: subData } = useSubscription()
  const { data: client } = useClient(clientId!)
  const { data: reports = [], isLoading: reportsLoading } = useClientReports(clientId!)
  const createReport = useCreateReport()
  const updateReport = useUpdateReport()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [syncing, setSyncing]       = useState(false)
  const [aiLoading, setAiLoading]   = useState(false)

  useEffect(() => {
    if (reports.length === 0) { setSelectedId(null); return }
    if (selectedId && reports.some(r => r.id === selectedId)) return
    const match = reports.find(r => r.month === initialMonth && r.year === initialYear)
    setSelectedId((match ?? reports[0]).id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports])

  const selected = reports.find(r => r.id === selectedId) ?? null

  const planning = usePlanningReport({
    clientId,
    month: selected?.month ?? initialMonth,
    year: selected?.year ?? initialYear,
    clientVisibleOnly: false,
  })

  const handleNewReport = async () => {
    try {
      const report = await createReport.mutateAsync({ client_id: clientId!, month: initialMonth, year: initialYear })
      setSelectedId(report.id)
      toast('Relatório criado!', 'success')
    } catch (err: any) { toast(err.message ?? 'Erro ao criar relatório.', 'error') }
  }

  const handleAutoGenerate = async () => {
    if (!selected) return
    setSyncing(true)
    try {
      const { data, error } = await supabase.functions.invoke('instagram-report', {
        body: { client_id: clientId, month: selected.month, year: selected.year },
      })
      if (error) throw error
      if (data && data.ok === false) {
        toast(data.message ?? 'Não foi possível gerar o relatório.', 'error')
        return
      }
      toast('Relatório atualizado com dados do Instagram.', 'success')
    } catch (err: any) {
      toast(err.message ?? 'Erro ao gerar relatório.', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handleAiAnalysis = async () => {
    if (!selected) return
    setAiLoading(true)
    try {
      const ig = selected.ig_data
      const pl = planning.data
      const payload = {
        mes: monthLabel(selected.month, selected.year),
        seguidores_inicio: selected.followers_start,
        seguidores_fim: selected.followers_end,
        alcance: selected.reach,
        impressoes: selected.impressions,
        engajamento_pct: selected.engagement,
        posts_publicados: selected.posts_published,
        visitas_perfil: ig?.profile_views ?? null,
        contas_engajadas: ig?.accounts_engaged ?? null,
        interacoes: ig?.interactions ?? null,
        top_posts: ig?.top_posts?.map(p => ({ tipo: p.media_type, curtidas: p.likes, comentarios: p.comments, alcance: p.reach })) ?? null,
        demografia: ig?.demographics ?? null,
        planejamento: pl ? {
          total_conteudos: pl.total,
          publicados: pl.published.length,
          por_status: pl.byStatus,
          por_tipo: pl.byContentType,
          titulos_publicados: pl.published.slice(0, 10).map(p => p.title),
        } : null,
      }
      const { content } = await callProxy<{ content?: string }>('report-analysis', payload)
      if (!content) throw new Error('A IA não retornou texto.')
      await updateReport.mutateAsync({ id: selected.id, analysis_text: content })
      toast('Análise gerada pela IA!', 'success')
    } catch (err: any) {
      toast(err.message ?? 'Erro ao gerar análise.', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  if (!subData?.plan.hasReports) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="flex flex-col items-center text-center gap-4 max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-violet-400" />
          </div>
          <p className="text-[14px] font-semibold" style={{ color: 'var(--sm-text-1)' }}>Relatórios disponíveis no Pro e Agency</p>
          <a href="/assinatura" className="px-4 py-2 rounded-xl bg-violet-600 text-white text-[12px] font-semibold hover:bg-violet-700 transition-colors">
            Ver planos
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full p-6" style={{ background: 'var(--sm-bg)' }}>
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/reports')}
              className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 transition-colors"
              style={{ color: 'var(--sm-text-2)' }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[18px] font-bold truncate" style={{ color: 'var(--sm-text-1)' }}>{client?.company_name ?? 'Cliente'}</h1>
              <p className="text-[12px]" style={{ color: 'var(--sm-text-2)' }}>Relatório combinado — Instagram, planejamento e IA</p>
            </div>
          </div>
          <Button size="sm" onClick={handleNewReport} disabled={createReport.isPending}>
            <Plus className="w-3 h-3" /> Novo relatório
          </Button>
        </div>

        {reportsLoading ? (
          <div className="py-16 text-center text-[12px]" style={{ color: 'var(--sm-text-2)' }}>Carregando...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed" style={{ borderColor: 'var(--sm-border)' }}>
            <BarChart3 className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--sm-text-2)' }} />
            <p className="text-[13px] font-medium" style={{ color: 'var(--sm-text-1)' }}>Nenhum relatório ainda</p>
            <p className="text-[11px] mt-1 mb-4" style={{ color: 'var(--sm-text-2)' }}>Crie o primeiro relatório mensal para este cliente.</p>
            <Button size="sm" onClick={handleNewReport} disabled={createReport.isPending}>
              <Plus className="w-3 h-3" /> Criar primeiro relatório
            </Button>
          </div>
        ) : (
          <>
            {/* ── Lista de meses ── */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {reports.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className="flex-shrink-0 text-left px-3.5 py-2 rounded-xl text-[12px] font-medium transition-all"
                  style={r.id === selectedId
                    ? { background: '#1e293b', color: '#fff', border: '1px solid #1e293b' }
                    : { background: 'var(--sm-bg-alt)', color: 'var(--sm-text-2)', border: '1px solid var(--sm-border)' }}
                >
                  {monthLabel(r.month, r.year)}
                </button>
              ))}
            </div>

            {selected && (
              <div className="space-y-5">

                {/* ── Ações ── */}
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleAutoGenerate} disabled={syncing}
                    title="Preencher com os dados reais da conta de Instagram conectada">
                    {syncing
                      ? <><RefreshCw className="w-3 h-3 animate-spin" /> Sincronizando...</>
                      : <><Instagram className="w-3 h-3" /> Gerar do Instagram</>}
                  </Button>
                </div>

                {/* ── Resumo do mês ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <KpiPill icon={<Users className="w-4 h-4 text-green-600" />} label="Seguidores" value={followerDiff(selected)} />
                  <KpiPill icon={<Eye className="w-4 h-4 text-blue-600" />} label="Alcance" value={fmt(selected.reach)} />
                  <KpiPill icon={<Heart className="w-4 h-4 text-pink-600" />} label="Engajamento" value={selected.engagement != null ? `${selected.engagement}%` : '—'} />
                  <KpiPill icon={<Instagram className="w-4 h-4 text-violet-600" />} label="Posts publicados" value={fmt(selected.posts_published)} />
                  <KpiPill icon={<Calendar className="w-4 h-4 text-amber-600" />} label="Planejados" value={String(planning.data?.total ?? 0)} />
                  <KpiPill icon={<CheckCircle2 className="w-4 h-4 text-teal-600" />} label="Publicados (calendário)" value={String(planning.data?.published.length ?? 0)} />
                </div>

                {/* ── Instagram ── */}
                <section className="rounded-2xl overflow-hidden" style={{ background: 'var(--sm-bg-card)', border: '1px solid var(--sm-border)' }}>
                  <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--sm-border)' }}>
                    <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--sm-text-3, var(--sm-text-2))' }} />
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--sm-text-1)' }}>Redes sociais</p>
                  </div>
                  <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {([
                      ['Seguidores (início)', fmt(selected.followers_start)],
                      ['Seguidores (fim)', fmt(selected.followers_end)],
                      ['Alcance', fmt(selected.reach)],
                      ['Engajamento', selected.engagement != null ? `${selected.engagement}%` : '—'],
                      ['Impressões', fmt(selected.impressions)],
                      ['Posts publicados', fmt(selected.posts_published)],
                    ] as [string, string][]).map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--sm-text-3, var(--sm-text-2))' }}>{label}</p>
                        <p className="text-[14px] font-semibold" style={{ color: 'var(--sm-text-1)' }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <IgInsights report={selected} />

                {/* ── Planejamento ── */}
                <section className="rounded-2xl overflow-hidden" style={{ background: 'var(--sm-bg-card)', border: '1px solid var(--sm-border)' }}>
                  <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--sm-border)' }}>
                    <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--sm-text-3, var(--sm-text-2))' }} />
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--sm-text-1)' }}>Planejamento</p>
                  </div>
                  <div className="p-5 space-y-5">
                    {planning.isLoading ? (
                      <p className="text-[12px]" style={{ color: 'var(--sm-text-2)' }}>Carregando...</p>
                    ) : !planning.data || planning.data.total === 0 ? (
                      <p className="text-[12px] italic" style={{ color: 'var(--sm-text-2)' }}>
                        Nenhum item planejado para este cliente neste mês.
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--sm-text-3, var(--sm-text-2))' }}>Por status</p>
                            {Object.entries(planning.data.byStatus).map(([status, count]) => (
                              <StatRow key={status} label={statusLabels[status] ?? status} count={count} total={planning.data!.total} />
                            ))}
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--sm-text-3, var(--sm-text-2))' }}>Por tipo de conteúdo</p>
                            {Object.entries(planning.data.byContentType).map(([type, count]) => (
                              <StatRow key={type} label={contentTypeLabels[type] ?? type} count={count} total={planning.data!.total} />
                            ))}
                          </div>
                        </div>

                        {planning.data.published.length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: 'var(--sm-text-3, var(--sm-text-2))' }}>Publicados no mês</p>
                            <div className="space-y-1">
                              {planning.data.published.map(item => (
                                <button
                                  key={item.id}
                                  onClick={() => navigate('/planner')}
                                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left hover:opacity-80 transition-opacity"
                                  style={{ background: 'var(--sm-bg-alt)' }}
                                >
                                  <span className="text-[12px] truncate" style={{ color: 'var(--sm-text-1)' }}>{item.title}</span>
                                  <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--sm-text-2)' }}>{contentTypeLabels[item.content_type] ?? item.content_type}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </section>

                {/* ── Tráfego pago ── */}
                {hasPaid(selected) && (
                  <section className="rounded-2xl overflow-hidden" style={{ background: 'var(--sm-bg-card)', border: '1px solid var(--sm-border)' }}>
                    <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--sm-border)' }}>
                      <DollarSign className="w-3.5 h-3.5" style={{ color: 'var(--sm-text-3, var(--sm-text-2))' }} />
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--sm-text-1)' }}>Tráfego pago</p>
                    </div>
                    <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {([
                        ['Investimento', fmtBRL(selected.paid_investment)],
                        ['Leads', fmt(selected.paid_leads)],
                        ['CPL', fmtBRL(selected.paid_cpl)],
                        ['Conversões', fmt(selected.paid_conversions)],
                        ['ROAS', selected.paid_roas != null ? `${selected.paid_roas}x` : '—'],
                      ] as [string, string][]).map(([label, value]) => (
                        <div key={label}>
                          <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--sm-text-3, var(--sm-text-2))' }}>{label}</p>
                          <p className="text-[14px] font-semibold" style={{ color: 'var(--sm-text-1)' }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* ── Análise por IA ── */}
                <section className="rounded-2xl overflow-hidden" style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}>
                  <div className="px-5 py-4 flex items-center justify-between gap-2" style={{ borderBottom: '1px solid #ddd6fe' }}>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                      <p className="text-[13px] font-semibold text-[#0f0f0f]">Análise do mês</p>
                    </div>
                    <Button size="sm" onClick={handleAiAnalysis} disabled={aiLoading}
                      className="bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
                      title="Gera uma narrativa combinando Instagram e execução do planejamento">
                      {aiLoading
                        ? <><RefreshCw className="w-3 h-3 animate-spin" /> Gerando...</>
                        : <><Sparkles className="w-3 h-3" /> {selected.analysis_text ? 'Refazer com IA' : 'Gerar com IA'}</>}
                    </Button>
                  </div>
                  <div className="p-5">
                    {selected.analysis_text ? (
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-[#0f0f0f]">{selected.analysis_text}</p>
                    ) : (
                      <p className="text-[12px] italic text-[#6366f1]/70">
                        Nenhuma análise ainda. Clique em <strong>Gerar com IA</strong> pra um resumo automático combinando Instagram e planejamento.
                      </p>
                    )}
                  </div>
                </section>

              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
