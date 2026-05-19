import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Zap, Crown, Building2, Loader2, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { useAIUsage } from '@/hooks/useAIUsage'
import { PLANS, type PlanId } from '@/config/plans'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)
}

async function startCheckout(priceId: string): Promise<string | null> {
  if (priceId.startsWith('CONFIGURE_')) {
    alert('Configure o Price ID do Stripe em src/config/plans.ts')
    return null
  }
  const { data, error } = await supabase.functions.invoke('create-checkout', { body: { priceId } })
  if (error || data?.error) { alert(data?.error ?? error?.message ?? 'Erro ao iniciar pagamento.'); return null }
  return data?.url ?? null
}

async function openPortal(): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('create-portal', {})
  if (error || data?.error) { alert(data?.error ?? error?.message ?? 'Erro ao abrir portal.'); return null }
  return data?.url ?? null
}

// ── Ícone / cor por plano ─────────────────────────────────────────────────────

const PLAN_ICON: Record<PlanId, React.ElementType> = {
  starter: Zap,
  pro:     Crown,
  agency:  Building2,
}

const PLAN_GRADIENT: Record<PlanId, string> = {
  starter: 'from-blue-500 to-cyan-500',
  pro:     'from-violet-500 to-purple-600',
  agency:  'from-amber-400 to-orange-500',
}

// ── Barra de uso da IA ────────────────────────────────────────────────────────

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-violet-500'
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[12px] text-[#64748b]">
        <span>IA usada este mês</span>
        <span className={pct >= 90 ? 'text-red-500 font-semibold' : ''}>{used} / {limit} requests</span>
      </div>
      <div className="h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      {pct >= 90 && (
        <p className="text-[11px] text-red-500 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Quase no limite — considere fazer upgrade
        </p>
      )}
    </div>
  )
}

// ── Card de plano ─────────────────────────────────────────────────────────────

function PlanCard({
  planId, currentPlanId, hasStripe, onUpgrade, onPortal, loading,
}: {
  planId: PlanId
  currentPlanId: PlanId
  hasStripe: boolean
  onUpgrade: (priceId: string) => void
  onPortal: () => void
  loading: boolean
}) {
  const plan      = PLANS[planId]
  const Icon      = PLAN_ICON[planId]
  const isCurrent = planId === currentPlanId
  const isDowngrade = (
    (currentPlanId === 'agency' && planId !== 'agency') ||
    (currentPlanId === 'pro'    && planId === 'starter')
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border p-6 flex flex-col gap-5 ${
        isCurrent
          ? 'border-violet-400 bg-white shadow-lg shadow-violet-100/60'
          : 'border-[#e8e8e8] bg-white'
      }`}
    >
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className={`text-[10px] font-bold px-3 py-1 rounded-full text-white bg-gradient-to-r ${PLAN_GRADIENT[planId]}`}>
            {plan.badge}
          </span>
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 right-4">
          <span className="text-[10px] font-bold px-3 py-1 rounded-full text-violet-600 bg-violet-100 border border-violet-200">
            Plano atual
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${PLAN_GRADIENT[planId]}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-[#0f172a]">{plan.name}</h3>
          <p className="text-[11px] text-[#94a3b8]">
            {plan.maxClients === -1 ? 'Clientes ilimitados' : `Até ${plan.maxClients} clientes`}
          </p>
        </div>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-[13px] text-[#64748b]">R$</span>
        <span className="text-[28px] font-black text-[#0f172a]">{plan.price}</span>
        <span className="text-[12px] text-[#94a3b8]">/mês</span>
      </div>

      <ul className="space-y-2 flex-1">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-[12.5px] text-[#374151]">
            <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        hasStripe ? (
          <button onClick={onPortal} disabled={loading}
            className="w-full py-2.5 rounded-xl border border-[#e2e8f0] text-[13px] font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
            Gerenciar assinatura
          </button>
        ) : (
          <div className="w-full py-2.5 rounded-xl bg-[#f8fafc] text-center text-[13px] text-[#94a3b8]">Plano atual</div>
        )
      ) : isDowngrade ? (
        <button onClick={onPortal} disabled={loading}
          className="w-full py-2.5 rounded-xl border border-[#e2e8f0] text-[13px] font-medium text-[#94a3b8] hover:bg-[#f8fafc] transition-colors">
          Fazer downgrade
        </button>
      ) : plan.stripePriceId && !plan.stripePriceId.startsWith('CONFIGURE') ? (
        <button onClick={() => onUpgrade(plan.stripePriceId!)} disabled={loading}
          className={`w-full py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all flex items-center justify-center gap-2 bg-gradient-to-r ${PLAN_GRADIENT[planId]} hover:opacity-90 active:scale-[0.98]`}>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Fazer upgrade
        </button>
      ) : (
        <div className="w-full py-2.5 rounded-xl bg-[#fef9c3] text-center text-[12px] text-[#92400e] font-medium">
          Configure o Stripe para ativar
        </div>
      )}
    </motion.div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export function Subscription() {
  const { user }                                 = useAuth()
  const { data: subData, isLoading: subLoading } = useSubscription()
  const { data: usage }                          = useAIUsage(user?.id)
  const [searchParams]                           = useSearchParams()
  const [loading, setLoading]                    = useState(false)

  const success       = searchParams.get('success') === '1'
  const canceled      = searchParams.get('canceled') === '1'
  const currentPlanId = (subData?.subscription.plan ?? 'starter') as PlanId
  const hasStripe     = !!subData?.subscription.stripe_subscription_id

  const handleUpgrade = async (priceId: string) => {
    setLoading(true)
    const url = await startCheckout(priceId)
    if (url) window.location.href = url
    setLoading(false)
  }

  const handlePortal = async () => {
    setLoading(true)
    const url = await openPortal()
    if (url) window.location.href = url
    setLoading(false)
  }

  if (subLoading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-[22px] font-bold text-[#0f172a]">Assinatura</h1>
        <p className="text-[13.5px] text-[#64748b] mt-1">Gerencie seu plano e uso da IA</p>
      </div>

      {success && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-[13px] text-green-700">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
          Pagamento confirmado! Seu plano foi atualizado.
        </motion.div>
      )}
      {canceled && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-[13px] text-amber-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Pagamento cancelado. Você continua no plano atual.
        </motion.div>
      )}

      {/* Plano atual + uso */}
      <div className="bg-white rounded-2xl border border-[#e8e8e8] p-6 space-y-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(() => {
              const Icon = PLAN_ICON[currentPlanId]
              return (
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${PLAN_GRADIENT[currentPlanId]}`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              )
            })()}
            <div>
              <p className="text-[13px] text-[#64748b]">Plano atual</p>
              <p className="text-[16px] font-bold text-[#0f172a]">{subData?.plan.name ?? 'Starter'}</p>
            </div>
          </div>
          {subData?.subscription.current_period_end && (
            <p className="text-[12px] text-[#94a3b8]">
              Renova em {new Date(subData.subscription.current_period_end).toLocaleDateString('pt-BR')}
            </p>
          )}
          {hasStripe && (
            <button onClick={handlePortal} disabled={loading}
              className="flex items-center gap-1.5 text-[12px] text-[#64748b] hover:text-[#0f172a] transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
              Gerenciar
            </button>
          )}
        </div>
        {usage && <UsageBar used={usage.requests} limit={usage.limit} />}
      </div>

      {/* Cards de planos */}
      <div>
        <h2 className="text-[14px] font-semibold text-[#0f172a] mb-4">Planos disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(['starter', 'pro', 'agency'] as PlanId[]).map(id => (
            <PlanCard key={id} planId={id} currentPlanId={currentPlanId}
              hasStripe={hasStripe} onUpgrade={handleUpgrade} onPortal={handlePortal} loading={loading} />
          ))}
        </div>
      </div>

      {/* Tabela comparativa */}
      <div className="bg-white rounded-2xl border border-[#e8e8e8] overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#f1f5f9]">
              <th className="text-left px-5 py-3.5 text-[#64748b] font-medium">Recurso</th>
              {(['starter', 'pro', 'agency'] as PlanId[]).map(id => (
                <th key={id} className={`text-center px-4 py-3.5 font-semibold ${id === currentPlanId ? 'text-violet-600' : 'text-[#0f172a]'}`}>
                  {PLANS[id].name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f8fafc]">
            {[
              { label: 'Clientes',       values: ['5', '20', 'Ilimitado'] },
              { label: 'Requests IA/mês', values: ['100', '400', '1.500'] },
              { label: 'IA Copilot',     values: [true, true, true] },
              { label: 'Portal cliente', values: [false, true, true] },
              { label: 'Relatórios',     values: [false, true, true] },
              { label: 'Suporte',        values: ['E-mail', 'Prioritário', 'SLA'] },
              { label: 'Preço/mês',      values: [fmtBRL(47), fmtBRL(97), fmtBRL(197)] },
            ].map(row => (
              <tr key={row.label} className="hover:bg-[#fafafa]">
                <td className="px-5 py-3 text-[#374151]">{row.label}</td>
                {row.values.map((v, i) => {
                  const ids: PlanId[] = ['starter', 'pro', 'agency']
                  return (
                    <td key={i} className="text-center px-4 py-3 text-[#0f172a]">
                      {typeof v === 'boolean' ? (
                        v
                          ? <Check className="w-4 h-4 text-green-500 mx-auto" />
                          : <span className="text-[#cbd5e1]">—</span>
                      ) : (
                        <span className={ids[i] === currentPlanId ? 'font-semibold text-violet-600' : ''}>
                          {v}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
