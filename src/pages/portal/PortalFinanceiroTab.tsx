import {
  CheckCircle2, Clock, AlertCircle, Ban, DollarSign,
  CalendarDays, History, MessageCircle, ExternalLink,
} from 'lucide-react'
import { usePortalClient, usePortalPayments, usePortalSupportContacts } from '@/hooks/usePortal'
import { calcFinancialStatus, getFinancialAuxText } from '@/utils/financial'
import type { FinancialStatus, ContactType } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

// ─── Status config ─────────────────────────────────────────────────────────────

const statusConfig: Record<FinancialStatus, {
  icon: React.ReactNode
  color: string          // border + bg
  titleColor: string
  label: string
  message: (aux: string | null) => string
}> = {
  ativo: {
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    color: 'border-emerald-500/20 bg-emerald-500/[0.06]',
    titleColor: 'text-emerald-400',
    label: 'Em dia',
    message: (aux) => aux ?? 'Seu plano está em dia. Obrigado!',
  },
  vence_em_breve: {
    icon: <Clock className="w-5 h-5 text-amber-400" />,
    color: 'border-amber-500/20 bg-amber-500/[0.06]',
    titleColor: 'text-amber-400',
    label: 'Vence em breve',
    message: (aux) => aux ? `${aux}. Fique atento ao pagamento.` : 'Seu pagamento vence em breve.',
  },
  atrasado: {
    icon: <AlertCircle className="w-5 h-5 text-red-400" />,
    color: 'border-red-500/20 bg-red-500/[0.06]',
    titleColor: 'text-red-400',
    label: 'Pagamento em atraso',
    message: (aux) => aux ? `${aux}. Entre em contato para regularizar.` : 'Seu pagamento está em atraso.',
  },
  cancelado: {
    icon: <Ban className="w-5 h-5 text-zinc-400" />,
    color: 'border-zinc-500/20 bg-zinc-500/[0.06]',
    titleColor: 'text-zinc-400',
    label: 'Contrato cancelado',
    message: () => 'Seu contrato está cancelado. Entre em contato com a agência para mais informações.',
  },
}

// ─── Contact button ────────────────────────────────────────────────────────────

const contactTypeLabel: Partial<Record<ContactType, string>> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  phone: 'Telefone',
  instagram: 'Instagram',
}

function buildContactHref(type: ContactType, value: string, directLink: string | null): string {
  if (directLink) return directLink
  if (type === 'whatsapp') {
    const digits = value.replace(/\D/g, '')
    const phone = digits.startsWith('55') ? digits : `55${digits}`
    const msg = encodeURIComponent('Olá! Gostaria de falar sobre minha situação financeira.')
    return `https://wa.me/${phone}?text=${msg}`
  }
  if (type === 'email') return `mailto:${value}`
  if (type === 'phone') return `tel:${value}`
  return value
}

// ─── Main component ────────────────────────────────────────────────────────────

export function PortalFinanceiroTab() {
  const { data: client, isLoading: loadingClient } = usePortalClient()
  const { data: payments = [], isLoading: loadingPayments } = usePortalPayments()
  const { data: contacts = [] } = usePortalSupportContacts()

  // Loading
  if (loadingClient) {
    return <div className="py-12 text-center text-[12px] text-gray-600">Carregando...</div>
  }

  // No financial data configured
  if (!client || (client.valor_mensal == null && client.dia_vencimento == null)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-12 h-12 rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center mb-4">
          <DollarSign className="w-5 h-5 text-gray-600" />
        </div>
        <p className="text-[14px] font-medium text-gray-400">Informações financeiras não disponíveis</p>
        <p className="text-[12px] text-gray-600 mt-1 max-w-xs">
          A agência ainda não cadastrou as informações financeiras do seu plano.
        </p>
      </div>
    )
  }

  const status = calcFinancialStatus(client)
  const aux = getFinancialAuxText(client, status)
  const cfg = statusConfig[status]

  // Best contact for financial matters: prefer whatsapp, then email, then first available
  const preferOrder: ContactType[] = ['whatsapp', 'email', 'phone', 'instagram', 'facebook', 'tiktok', 'website', 'other']
  const financialContact = contacts
    .slice()
    .sort((a, b) => preferOrder.indexOf(a.contact_type) - preferOrder.indexOf(b.contact_type))[0] ?? null

  // Compute next due date for display
  const nextDueLabel = (() => {
    if (!client.dia_vencimento) return '—'
    const today = new Date()
    const dueThisMonth = new Date(today.getFullYear(), today.getMonth(), client.dia_vencimento)
    const dueDate = dueThisMonth < today
      ? new Date(today.getFullYear(), today.getMonth() + 1, client.dia_vencimento)
      : dueThisMonth
    return dueDate.toLocaleDateString('pt-BR')
  })()

  return (
    <div className="space-y-5">

      {/* ── Status hero card ────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-5 flex items-start gap-4 ${cfg.color}`}>
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[11px] font-semibold uppercase tracking-wide ${cfg.titleColor}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-[14px] text-zinc-200 leading-relaxed">
            {cfg.message(aux)}
          </p>
        </div>
      </div>

      {/* ── Summary row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-gray-500">
            <DollarSign className="w-3.5 h-3.5" />
            <p className="text-[10px] uppercase tracking-wide">Mensalidade</p>
          </div>
          <p className="text-[18px] font-bold text-white leading-tight">
            {client.valor_mensal != null ? fmtBRL(client.valor_mensal) : '—'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-gray-500">
            <CalendarDays className="w-3.5 h-3.5" />
            <p className="text-[10px] uppercase tracking-wide">Próximo venc.</p>
          </div>
          <p className="text-[18px] font-bold text-white leading-tight">{nextDueLabel}</p>
          {client.dia_vencimento != null && (
            <p className="text-[10px] text-gray-600">dia {client.dia_vencimento} de cada mês</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-gray-500">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <p className="text-[10px] uppercase tracking-wide">Último pgto.</p>
          </div>
          <p className="text-[18px] font-bold text-white leading-tight">
            {fmtDate(client.last_payment_date)}
          </p>
        </div>
      </div>

      {/* ── Payment history ─────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.05]">
          <History className="w-3.5 h-3.5 text-gray-500" />
          <p className="text-[13px] font-semibold text-white">Histórico de pagamentos</p>
          {payments.length > 0 && (
            <span className="text-[11px] text-gray-600">{payments.length}</span>
          )}
        </div>

        {loadingPayments && (
          <div className="px-5 py-6 text-center text-[12px] text-gray-600">Carregando...</div>
        )}

        {!loadingPayments && payments.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-gray-500">Nenhum pagamento registrado ainda.</p>
          </div>
        )}

        {!loadingPayments && payments.length > 0 && (
          <div className="divide-y divide-white/[0.04]">
            {payments.map(p => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.status === 'pago' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-zinc-200">{p.reference_month}</p>
                  {p.notes && <p className="text-[10px] text-gray-600 truncate mt-0.5">{p.notes}</p>}
                </div>
                <p className="text-[13px] font-semibold text-zinc-300 flex-shrink-0">{fmtBRL(p.amount)}</p>
                <p className="hidden sm:block text-[11px] text-gray-500 flex-shrink-0 w-24 text-right">
                  {fmtDate(p.payment_date)}
                </p>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0 ${
                  p.status === 'pago'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {p.status === 'pago' ? 'Pago' : 'Atrasado'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Contact button ───────────────────────────────────────────── */}
      {financialContact && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white">Precisa de ajuda com o financeiro?</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Fale diretamente com a nossa equipe.
            </p>
          </div>
          <a
            href={buildContactHref(financialContact.contact_type, financialContact.contact_value, financialContact.direct_link)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.10] bg-white/[0.04] text-[12px] font-medium text-zinc-200 hover:bg-white/[0.08] hover:border-white/[0.16] transition-all"
          >
            {financialContact.contact_type === 'whatsapp'
              ? <MessageCircle className="w-3.5 h-3.5 text-green-400" />
              : <ExternalLink className="w-3.5 h-3.5 text-blue-400" />}
            Falar com financeiro
            {contactTypeLabel[financialContact.contact_type] && (
              <span className="text-[10px] text-gray-500">
                ({contactTypeLabel[financialContact.contact_type]})
              </span>
            )}
          </a>
        </div>
      )}
    </div>
  )
}
