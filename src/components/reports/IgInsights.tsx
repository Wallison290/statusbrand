// ── IgInsights ────────────────────────────────────────────────────────────────
// Seções RICAS do relatório (vindas de client_reports.ig_data): visitas ao
// perfil, contas engajadas, impressões, interações totais, quebra de interações,
// top publicações do mês e demografia da audiência.
//
// Componente compartilhado entre a aba Resultados da agência (ReportsTab) e o
// portal do cliente (PortalResultadosTab). Read-only, tema claro.
// ─────────────────────────────────────────────────────────────────────────────

import { Eye, Users, TrendingUp, Zap, Heart, Instagram, ImageIcon, BarChart3 } from 'lucide-react'
import type { ClientReport } from '@/types'

const GENDER_LABEL: Record<string, string> = { M: 'Masculino', F: 'Feminino', U: 'Outro' }

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function MetricCard({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: string; accent: string
}) {
  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-2.5 ${accent}`}>
      <div className="opacity-70">{icon}</div>
      <div>
        <p className="text-[11px] text-[#64748b] font-medium">{label}</p>
        <p className="text-[20px] font-bold text-[#0f0f0f] leading-tight mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-[#64748b] w-24 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-[#f0f0f0] overflow-hidden">
        <div className="h-full rounded-full bg-[#29457a]" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-[#0f0f0f] w-14 text-right flex-shrink-0">{fmt(value)}</span>
    </div>
  )
}

export function IgInsights({ report }: { report: ClientReport }) {
  const ig = report.ig_data
  if (!ig) return null

  const inter = ig.interactions
  const demo  = ig.demographics
  const genderEntries = demo?.gender ? Object.entries(demo.gender).sort((a, b) => b[1] - a[1]) : []
  const genderTotal   = genderEntries.reduce((s, [, v]) => s + v, 0)
  const ageEntries    = demo?.age ? Object.entries(demo.age).sort((a, b) => a[0].localeCompare(b[0])) : []
  const ageMax        = ageEntries.reduce((m, [, v]) => Math.max(m, v), 0)
  const cities        = demo?.cities ?? []
  const cityMax       = cities.reduce((m, c) => Math.max(m, c.value), 0)
  const hasInter      = !!inter && [inter.likes, inter.comments, inter.saves, inter.shares].some(v => v != null)
  const interTotal    = inter ? [inter.likes, inter.comments, inter.saves, inter.shares].reduce<number>((s, v) => s + (v ?? 0), 0) : null
  const hasDemo       = genderEntries.length > 0 || ageEntries.length > 0 || cities.length > 0
  const hasExtraKpis  = ig.profile_views != null || ig.accounts_engaged != null || report.impressions != null || interTotal != null

  return (
    <>
      {/* Visão extra — 4 KPIs preenchem a linha por completo */}
      {hasExtraKpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard icon={<Eye className="w-4 h-4 text-amber-600" />} label="Visitas ao perfil"
            value={fmt(ig.profile_views)} accent="border-amber-200 bg-amber-50" />
          <MetricCard icon={<Users className="w-4 h-4 text-teal-600" />} label="Contas engajadas"
            value={fmt(ig.accounts_engaged)} accent="border-teal-200 bg-teal-50" />
          <MetricCard icon={<TrendingUp className="w-4 h-4 text-sky-600" />} label="Impressões"
            value={fmt(report.impressions)} accent="border-sky-200 bg-sky-50" />
          <MetricCard icon={<Zap className="w-4 h-4 text-violet-600" />} label="Interações totais"
            value={fmt(interTotal)} accent="border-violet-200 bg-violet-50" />
        </div>
      )}

      {/* Interações */}
      {hasInter && (
        <section className="rounded-2xl border border-[#e8e8e8] bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f0f0f0] flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 text-[#64748b]" />
            <p className="text-[13px] font-semibold text-[#0f0f0f]">Interações do mês</p>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {([
              ['Curtidas', inter!.likes],
              ['Comentários', inter!.comments],
              ['Salvamentos', inter!.saves],
              ['Compartilhamentos', inter!.shares],
            ] as [string, number | null][]).map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] text-[#64748b] uppercase tracking-wide mb-1">{label}</p>
                <p className="text-[16px] font-bold text-[#0f0f0f]">{fmt(value)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top publicações */}
      {ig.top_posts && ig.top_posts.length > 0 && (
        <section className="rounded-2xl border border-[#e8e8e8] bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f0f0f0] flex items-center gap-2">
            <Instagram className="w-3.5 h-3.5 text-[#64748b]" />
            <p className="text-[13px] font-semibold text-[#0f0f0f]">Top publicações do mês</p>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ig.top_posts.map(post => (
              <a key={post.id} href={post.permalink ?? undefined} target="_blank" rel="noopener noreferrer"
                className="group rounded-xl border border-[#e8e8e8] overflow-hidden bg-[#fafafa] hover:border-[#29457a]/50 transition-colors">
                <div className="aspect-square bg-[#eee] overflow-hidden">
                  {post.thumbnail
                    ? <img src={post.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    : <div className="w-full h-full flex items-center justify-center text-[#c0c0c0]"><ImageIcon className="w-6 h-6" /></div>}
                </div>
                <div className="p-2.5">
                  {post.media_type && <p className="text-[9px] uppercase tracking-wide text-[#94a3b8] mb-1">{post.media_type}</p>}
                  <div className="flex items-center gap-3 text-[11px] text-[#0f0f0f] font-medium">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-pink-500" /> {fmt(post.likes)}</span>
                    <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3 text-blue-500" /> {fmt(post.reach)}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Audiência */}
      {hasDemo && (
        <section className="rounded-2xl border border-[#e8e8e8] bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f0f0f0] flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-[#64748b]" />
            <p className="text-[13px] font-semibold text-[#0f0f0f]">Audiência</p>
          </div>
          <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {genderEntries.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-[#64748b] uppercase tracking-wide">Gênero</p>
                {genderEntries.map(([g, v]) => (
                  <Bar key={g} label={GENDER_LABEL[g] ?? g} value={v} max={genderTotal} />
                ))}
              </div>
            )}
            {ageEntries.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-[#64748b] uppercase tracking-wide">Faixa etária</p>
                {ageEntries.map(([a, v]) => (
                  <Bar key={a} label={a} value={v} max={ageMax} />
                ))}
              </div>
            )}
            {cities.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-[#64748b] uppercase tracking-wide">Principais cidades</p>
                {cities.map(c => (
                  <Bar key={c.name} label={c.name} value={c.value} max={cityMax} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  )
}
