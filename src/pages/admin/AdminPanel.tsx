// ── Painel de Admin — visão de todos os usuários e clientes do sistema ────────
// Só carrega dados quando profile.is_admin === true. A RLS do banco (policies
// *_admin_read_all) é quem realmente bloqueia o acesso — esta tela é só a
// camada visual. Nenhum dado de senha é lido, exibido ou armazenado aqui.

import { useMemo, useState } from 'react'
import {
  ShieldCheck, Users, Building2, Search, Loader2,
  Crown, TrendingUp, Wallet,
} from 'lucide-react'
import { useAdminUsers, useAdminClients } from '@/hooks/useAdmin'
import { formatDate, statusLabels } from '@/utils/formatters'
import { calcFinancialStatus, financialStatusLabel } from '@/utils/financial'
import type { PlanId } from '@/config/plans'

type Tab = 'users' | 'clients'

const PLAN_LABEL: Record<PlanId, string> = { starter: 'Starter', pro: 'Pro', agency: 'Agency' }

const SUB_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: 'Pagante',   color: '#34d399', bg: 'rgba(16,185,129,0.12)' },
  trialing: { label: 'Trial',     color: '#60a5fa', bg: 'rgba(37,99,235,0.14)' },
  past_due: { label: 'Em atraso', color: '#fbbf24', bg: 'rgba(245,158,11,0.14)' },
  canceled: { label: 'Cancelado', color: '#f87171', bg: 'rgba(239,68,68,0.12)' },
  inactive: { label: 'Inativo',   color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
}

const FIN_STATUS_CFG: Record<string, { color: string; bg: string }> = {
  ativo:          { color: '#34d399', bg: 'rgba(16,185,129,0.12)' },
  vence_em_breve: { color: '#fbbf24', bg: 'rgba(245,158,11,0.14)' },
  atrasado:       { color: '#f87171', bg: 'rgba(239,68,68,0.12)' },
  cancelado:      { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-[#182233] border border-[#1e293b] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-[#64748b] uppercase tracking-wide font-semibold">{label}</p>
        <p className="text-[20px] font-bold text-[#F8FAFC] leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-[#94a3b8] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function Avatar({ label }: { label: string }) {
  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #29457a, #16284d)' }}
    >
      {label[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

// ─── Aba: Usuários ──────────────────────────────────────────────────────────

function UsersTab({ search }: { search: string }) {
  const { data: rows = [], isLoading, error } = useAdminUsers()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = !q ? rows : rows.filter(r =>
      r.email.toLowerCase().includes(q) ||
      (r.full_name ?? '').toLowerCase().includes(q) ||
      (r.agency_name ?? '').toLowerCase().includes(q)
    )
    return base
  }, [rows, search])

  const kpis = useMemo(() => {
    const agencies = rows.filter(r => r.role === 'agency')
    const clientsPortal = rows.filter(r => r.role === 'client')
    const trialing = rows.filter(r => r.subStatus === 'trialing').length
    const paying = rows.filter(r => r.subStatus === 'active').length
    return { agencies: agencies.length, clientsPortal: clientsPortal.length, trialing, paying }
  }, [rows])

  if (isLoading) {
    return <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#64748b]" /></div>
  }
  if (error) {
    return <div className="py-16 text-center text-[13px] text-red-400">Erro ao carregar usuários: {(error as Error).message}</div>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={<Building2 className="w-4 h-4 text-[#6f93c9]" />} label="Contas de agência" value={String(kpis.agencies)} />
        <KpiCard icon={<Users className="w-4 h-4 text-purple-400" />} label="Clientes com portal" value={String(kpis.clientsPortal)} sub="acesso via /portal" />
        <KpiCard icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} label="Assinantes pagantes" value={String(kpis.paying)} />
        <KpiCard icon={<Crown className="w-4 h-4 text-amber-400" />} label="Em trial" value={String(kpis.trialing)} />
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-[13px] text-[#64748b]">Nenhum usuário encontrado.</div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(u => {
            const subCfg = u.subStatus ? SUB_STATUS_CFG[u.subStatus] : null
            return (
              <div key={u.id} className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-[#1e293b] bg-[#111827] hover:border-[#2563EB]/40 transition-all flex-wrap sm:flex-nowrap">
                <Avatar label={u.full_name || u.email} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-medium text-[#F8FAFC] truncate">{u.full_name || '—'}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      u.role === 'client' ? 'bg-purple-500/15 text-purple-300' : 'bg-[#2563EB]/15 text-[#60A5FA]'
                    }`}>
                      {u.role === 'client' ? 'Cliente (portal)' : 'Agência'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748b] truncate mt-0.5">{u.email}</p>
                </div>
                <div className="hidden sm:block w-36 text-[12px] text-[#94a3b8] truncate">
                  {u.agency_name || '—'}
                </div>
                <div className="hidden md:flex w-24 flex-shrink-0">
                  {u.plan ? (
                    <span className="text-[10px] font-semibold text-[#CBD5E1] bg-[#182233] border border-[#1e293b] px-2 py-1 rounded-lg">
                      {PLAN_LABEL[u.plan] ?? u.plan}
                    </span>
                  ) : <span className="text-[11px] text-[#475569]">—</span>}
                </div>
                <div className="hidden md:flex w-24 flex-shrink-0">
                  {subCfg && (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ color: subCfg.color, background: subCfg.bg }}>
                      {subCfg.label}
                    </span>
                  )}
                </div>
                <div className="hidden lg:block w-24 text-right text-[11px] text-[#64748b] flex-shrink-0">
                  {formatDate(u.created_at)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Aba: Clientes ──────────────────────────────────────────────────────────

function ClientsTab({ search }: { search: string }) {
  const { data: rows = [], isLoading, error } = useAdminClients()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(c =>
      c.company_name.toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.responsible_name ?? '').toLowerCase().includes(q) ||
      (c.ownerAgencyName ?? '').toLowerCase().includes(q) ||
      (c.ownerEmail ?? '').toLowerCase().includes(q)
    )
  }, [rows, search])

  const kpis = useMemo(() => {
    const totalMrr = rows.reduce((s, c) => s + (c.valor_mensal ?? 0), 0)
    const active = rows.filter(c => c.status === 'ativo' || c.status === 'fechado').length
    return { total: rows.length, active, totalMrr }
  }, [rows])

  if (isLoading) {
    return <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#64748b]" /></div>
  }
  if (error) {
    return <div className="py-16 text-center text-[13px] text-red-400">Erro ao carregar clientes: {(error as Error).message}</div>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard icon={<Building2 className="w-4 h-4 text-[#6f93c9]" />} label="Clientes cadastrados" value={String(kpis.total)} sub="somando todas as agências" />
        <KpiCard icon={<Users className="w-4 h-4 text-emerald-400" />} label="Ativos" value={String(kpis.active)} />
        <KpiCard icon={<Wallet className="w-4 h-4 text-amber-400" />} label="Faturamento somado" value={`R$ ${kpis.totalMrr.toLocaleString('pt-BR')}`} sub="soma de valor_mensal" />
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-[13px] text-[#64748b]">Nenhum cliente encontrado.</div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(c => {
            const finStatus = calcFinancialStatus(c)
            const finCfg = FIN_STATUS_CFG[finStatus]
            return (
              <div key={c.id} className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-[#1e293b] bg-[#111827] hover:border-[#2563EB]/40 transition-all flex-wrap sm:flex-nowrap">
                {c.logo_url ? (
                  <img src={c.logo_url} alt={c.company_name} className="w-9 h-9 rounded-lg object-cover border border-[#1e293b] flex-shrink-0" />
                ) : (
                  <Avatar label={c.company_name} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#F8FAFC] truncate">{c.company_name}</p>
                  <p className="text-[11px] text-[#64748b] truncate mt-0.5">{c.email || c.responsible_name || '—'}</p>
                </div>
                <div className="hidden sm:block w-44 min-w-0">
                  <p className="text-[12px] text-[#94a3b8] truncate">{c.ownerAgencyName || '—'}</p>
                  <p className="text-[10px] text-[#64748b] truncate">{c.ownerEmail || 'sem dono'}</p>
                </div>
                <div className="hidden md:flex w-24 flex-shrink-0">
                  <span className="text-[10px] font-semibold text-[#CBD5E1] bg-[#182233] border border-[#1e293b] px-2 py-1 rounded-lg">
                    {statusLabels[c.status] ?? c.status}
                  </span>
                </div>
                <div className="hidden md:flex w-28 flex-shrink-0">
                  {c.valor_mensal != null ? (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ color: finCfg.color, background: finCfg.bg }}>
                      {financialStatusLabel(finStatus)}
                    </span>
                  ) : <span className="text-[11px] text-[#475569]">—</span>}
                </div>
                <div className="hidden lg:block w-24 text-right text-[11px] text-[#64748b] flex-shrink-0">
                  {formatDate(c.entry_date)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Página ─────────────────────────────────────────────────────────────────

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>('users')
  const [search, setSearch] = useState('')

  return (
    <div className="min-h-full bg-[#0B1020]">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[19px] font-bold text-[#F8FAFC] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#60A5FA]" />
              Painel de Admin
            </h1>
            <p className="text-[12.5px] text-[#94a3b8] mt-1">
              Visão de todos os usuários e clientes cadastrados no sistema. Visível só para você.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-1.5">
            <button
              onClick={() => setTab('users')}
              className={`px-3.5 py-2 rounded-lg text-[12px] font-medium transition-all border flex items-center gap-1.5 ${
                tab === 'users'
                  ? 'bg-[#2563EB] text-white border-transparent'
                  : 'bg-[#182233] text-[#94a3b8] hover:text-white hover:bg-[#1e293b] border-[#1e293b]'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Usuários
            </button>
            <button
              onClick={() => setTab('clients')}
              className={`px-3.5 py-2 rounded-lg text-[12px] font-medium transition-all border flex items-center gap-1.5 ${
                tab === 'clients'
                  ? 'bg-[#2563EB] text-white border-transparent'
                  : 'bg-[#182233] text-[#94a3b8] hover:text-white hover:bg-[#1e293b] border-[#1e293b]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Clientes
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
            <input
              type="text"
              placeholder={tab === 'users' ? 'Buscar usuário...' : 'Buscar cliente...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#1e293b] bg-[#182233] text-[12px] text-[#E2E8F0] placeholder:text-[#64748b] focus:outline-none focus:border-[#2563EB]/50 transition-colors"
            />
          </div>
        </div>

        {tab === 'users' ? <UsersTab search={search} /> : <ClientsTab search={search} />}
      </div>
    </div>
  )
}
