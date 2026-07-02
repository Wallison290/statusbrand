import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Instagram, Sparkles, ChevronRight, Building2 } from 'lucide-react'
import { useClients } from '@/hooks/useClients'
import { useReportsOverview } from '@/hooks/useReports'
import { useSubscription } from '@/hooks/useSubscription'
import { useTheme } from '@/contexts/ThemeContext'
import type { ClientReport } from '@/types'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const CURRENT = new Date()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT.getFullYear() - i)

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

// ── Card de cliente ─────────────────────────────────────────────────────────

function ClientReportCard({
  client, report, onClick, isDark,
}: {
  client: { id: string; company_name: string; logo_url: string | null; niche: string }
  report: Pick<ClientReport, 'ig_synced_at' | 'analysis_text' | 'reach' | 'followers_end' | 'posts_published'> | undefined
  onClick: () => void
  isDark: boolean
}) {
  const hasReport  = !!report
  const hasIg      = !!report?.ig_synced_at
  const hasAnalysis = !!report?.analysis_text

  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl p-4 transition-all hover:shadow-md group"
      style={{ background: 'var(--sm-bg-alt)', border: '1px solid var(--sm-border)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        {client.logo_url ? (
          <img src={client.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--sm-bg-card)', border: '1px solid var(--sm-border)' }}>
            <Building2 className="w-4.5 h-4.5" style={{ color: 'var(--sm-text-2)' }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--sm-text-1)' }}>{client.company_name}</p>
          <p className="text-[11px] truncate" style={{ color: 'var(--sm-text-2)' }}>{client.niche}</p>
        </div>
        <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--sm-text-2)' }} />
      </div>

      {hasReport ? (
        <>
          <div className="flex items-center gap-1.5 mb-3">
            <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${hasIg
              ? (isDark ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-700/50' : 'bg-emerald-100 text-emerald-800 border border-emerald-300')
              : (isDark ? 'bg-zinc-800/60 text-zinc-400 border border-zinc-700' : 'bg-zinc-100 text-zinc-600 border border-zinc-300')}`}>
              <Instagram className="w-2.5 h-2.5" /> {hasIg ? 'Sincronizado' : 'Sem sync'}
            </span>
            <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${hasAnalysis
              ? (isDark ? 'bg-violet-950/60 text-violet-400 border border-violet-700/50' : 'bg-violet-100 text-violet-800 border border-violet-300')
              : (isDark ? 'bg-zinc-800/60 text-zinc-400 border border-zinc-700' : 'bg-zinc-100 text-zinc-600 border border-zinc-300')}`}>
              <Sparkles className="w-2.5 h-2.5" /> {hasAnalysis ? 'Análise pronta' : 'Sem análise'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[13px] font-bold" style={{ color: 'var(--sm-text-1)' }}>{fmt(report?.followers_end)}</p>
              <p className="text-[9px]" style={{ color: 'var(--sm-text-2)' }}>Seguidores</p>
            </div>
            <div>
              <p className="text-[13px] font-bold" style={{ color: 'var(--sm-text-1)' }}>{fmt(report?.reach)}</p>
              <p className="text-[9px]" style={{ color: 'var(--sm-text-2)' }}>Alcance</p>
            </div>
            <div>
              <p className="text-[13px] font-bold" style={{ color: 'var(--sm-text-1)' }}>{fmt(report?.posts_published)}</p>
              <p className="text-[9px]" style={{ color: 'var(--sm-text-2)' }}>Posts</p>
            </div>
          </div>
        </>
      ) : (
        <p className="text-[11px]" style={{ color: 'var(--sm-text-2)' }}>Nenhum relatório neste mês — clique para gerar.</p>
      )}
    </button>
  )
}

// ── Página ────────────────────────────────────────────────────────────────

export function ReportsOverview() {
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const { data: subData } = useSubscription()
  const { data: clients = [], isLoading: clientsLoading } = useClients()
  const [month, setMonth] = useState(CURRENT.getMonth() + 1)
  const [year, setYear]   = useState(CURRENT.getFullYear())
  const { data: reports = [], isLoading: reportsLoading } = useReportsOverview(month, year)

  const reportByClient = new Map(reports.map(r => [r.client_id, r]))

  if (!subData?.plan.hasReports) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="flex flex-col items-center text-center gap-4 max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <p className="text-[14px] font-semibold" style={{ color: 'var(--sm-text-1)' }}>Relatórios disponíveis no Pro e Agency</p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--sm-text-2)' }}>Faça upgrade para acompanhar os relatórios de todos os seus clientes num só lugar.</p>
          </div>
          <a href="/assinatura" className="px-4 py-2 rounded-xl bg-violet-600 text-white text-[12px] font-semibold hover:bg-violet-700 transition-colors">
            Ver planos
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full p-6" style={{ background: 'var(--sm-bg)' }}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#8b5cf620', border: '1px solid #8b5cf640' }}>
              <BarChart3 className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold" style={{ color: 'var(--sm-text-1)' }}>Relatórios</h1>
              <p className="text-[13px]" style={{ color: 'var(--sm-text-2)' }}>
                Instagram, planejamento e análise por IA de todos os clientes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="text-[12px] font-medium rounded-xl px-3 py-2 outline-none"
              style={{ background: 'var(--sm-bg-alt)', border: '1px solid var(--sm-border)', color: 'var(--sm-text-1)' }}
            >
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="text-[12px] font-medium rounded-xl px-3 py-2 outline-none"
              style={{ background: 'var(--sm-bg-alt)', border: '1px solid var(--sm-border)', color: 'var(--sm-text-1)' }}
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* ── Grid de clientes ── */}
        {clientsLoading || reportsLoading ? (
          <div className="py-16 text-center text-[12px]" style={{ color: 'var(--sm-text-2)' }}>Carregando...</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed" style={{ borderColor: 'var(--sm-border)' }}>
            <Building2 className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--sm-text-2)' }} />
            <p className="text-[13px] font-medium" style={{ color: 'var(--sm-text-1)' }}>Nenhum cliente cadastrado</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--sm-text-2)' }}>Cadastre um cliente para começar a gerar relatórios.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {clients.map(client => (
              <ClientReportCard
                key={client.id}
                client={client}
                report={reportByClient.get(client.id)}
                onClick={() => navigate(`/reports/${client.id}?month=${month}&year=${year}`)}
                isDark={isDark}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
