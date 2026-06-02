import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  TrendingUp, DollarSign, AlertCircle, BarChart3,
  CheckCircle2, Clock, Ban, Search, ExternalLink, ChevronDown,
  CalendarDays, AlertTriangle, MessageCircle, History, X, Loader2,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useClients, useUpdateClient } from '@/hooks/useClients'
import { useCreatePayment, useClientPayments } from '@/hooks/usePayments'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { calcFinancialStatus, financialStatusLabel, getFinancialAuxText } from '@/utils/financial'
import type { Client, FinancialStatus } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function currentMonthLabel() {
  const now = new Date()
  return `${MONTHS_PT[now.getMonth()]} ${now.getFullYear()}`
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function fmtBRL(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)
}

function fmtBRLDecimal(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function buildWhatsAppLink(client: Client): string | null {
  if (!client.whatsapp) return null
  const digits = client.whatsapp.replace(/\D/g, '')
  if (!digits) return null
  const phone = digits.startsWith('55') ? digits : `55${digits}`
  const month = currentMonthLabel()
  const dueDay = client.dia_vencimento ? `dia ${client.dia_vencimento}` : 'data prevista'
  const amount = client.valor_mensal != null ? fmtBRLDecimal(client.valor_mensal) : ''
  const msg = `Olá, tudo bem?\n\nSeu pagamento referente a ${month} venceu no ${dueDay}.\n\nValor: ${amount}\n\nPode me confirmar o pagamento, por favor?`
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}

type FilterKey = 'todos' | FinancialStatus

const filterLabels: Record<FilterKey, string> = {
  todos: 'Todos',
  ativo: 'Em dia',
  vence_em_breve: 'Vence em breve',
  atrasado: 'Atrasados',
  cancelado: 'Cancelados',
}

const statusStyles: Record<FinancialStatus, { bg: string; text: string; dot: string; icon: React.ReactNode }> = {
  ativo:          { bg: 'bg-emerald-50 border-emerald-200',  text: 'text-emerald-700', dot: 'bg-emerald-500', icon: <CheckCircle2 className="w-3 h-3" /> },
  vence_em_breve: { bg: 'bg-amber-50 border-amber-200',     text: 'text-amber-700',   dot: 'bg-amber-500',   icon: <Clock className="w-3 h-3" /> },
  atrasado:       { bg: 'bg-red-50 border-red-200',          text: 'text-red-700',     dot: 'bg-red-500',     icon: <AlertCircle className="w-3 h-3" /> },
  cancelado:      { bg: 'bg-zinc-100 border-zinc-300',       text: 'text-zinc-600',    dot: 'bg-zinc-400',    icon: <Ban className="w-3 h-3" /> },
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, sub, borderAccent, iconBg, delay = 0, onClick,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string
  borderAccent: string; iconBg: string; delay?: number; onClick?: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`rounded-2xl border bg-white shadow-sm p-4 flex flex-col gap-3.5 transition-all ${borderAccent} ${
        onClick ? 'cursor-pointer hover:bg-[#fafafa] active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <p className="text-[10px] text-[#9ca3af] uppercase tracking-wide text-right leading-tight mt-1">{label}</p>
      </div>
      <div className="min-w-0">
        <p className="text-[22px] font-bold text-[#0f0f0f] leading-tight break-words">{value}</p>
        {sub && <p className="text-[11px] text-[#9ca3af] mt-0.5 break-words">{sub}</p>}
      </div>
    </motion.div>
  )
}

// ─── Alert Card (conditional) ─────────────────────────────────────────────────

function AlertCard({
  mrr, previsto, diff, affectedCount, onViewAffected, delay = 0,
}: {
  mrr: number; previsto: number; diff: number
  affectedCount: number; onViewAffected: () => void; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center mt-0.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-amber-700">Receita prevista menor que o MRR</p>
          <p className="text-[11px] text-amber-600 mt-0.5">
            Impacto de {affectedCount} cliente{affectedCount !== 1 ? 's' : ''} em atraso
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[9px] text-[#9ca3af] uppercase tracking-wide mb-0.5">Previsto</p>
          <p className="text-[13px] font-semibold text-[#0f0f0f]">{fmtBRL(previsto)}</p>
        </div>
        <div>
          <p className="text-[9px] text-[#9ca3af] uppercase tracking-wide mb-0.5">MRR</p>
          <p className="text-[13px] font-semibold text-[#0f0f0f]">{fmtBRL(mrr)}</p>
        </div>
        <div>
          <p className="text-[9px] text-[#9ca3af] uppercase tracking-wide mb-0.5">Diferença</p>
          <p className="text-[13px] font-semibold text-red-600">-{fmtBRL(diff)}</p>
        </div>
      </div>
      <button
        onClick={onViewAffected}
        className="w-full h-7 rounded-lg border border-amber-200 bg-amber-100 text-[11px] text-amber-700 hover:bg-amber-200 transition-colors"
      >
        Ver clientes afetados
      </button>
    </motion.div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: FinancialStatus }) {
  const s = statusStyles[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium ${s.bg} ${s.text}`}>
      {s.icon}
      {financialStatusLabel(status)}
    </span>
  )
}

// ─── Status Dropdown ──────────────────────────────────────────────────────────

function StatusDropdown({ client }: { client: Client }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const updateClient = useUpdateClient()
  const { toast } = useToast()

  const handleSelect = async (status: FinancialStatus) => {
    setSaving(true)
    try {
      await updateClient.mutateAsync({
        id: client.id,
        financial_status: status,
        manual_status_override: status === 'cancelado',
      })
      toast('Status atualizado.', 'success')
      setOpen(false)
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className="h-7 px-2.5 flex items-center gap-1 rounded-lg text-[11px] text-[#737373] hover:text-[#0f0f0f] hover:bg-[#f0f0f0] border border-transparent hover:border-[#e8e8e8] transition-all"
      >
        <ChevronDown className="w-3 h-3" /> Status
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-44 max-w-[90vw] rounded-xl border border-[#e8e8e8] bg-white shadow-lg overflow-hidden">
            {(['ativo', 'vence_em_breve', 'atrasado', 'cancelado'] as FinancialStatus[]).map(s => {
              const st = statusStyles[s]
              return (
                <button
                  key={s}
                  onClick={() => handleSelect(s)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-left transition-colors hover:bg-[#f0f0f0] ${st.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
                  {financialStatusLabel(s)}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Register Payment Modal ───────────────────────────────────────────────────

function RegisterPaymentModal({
  client, open, onClose,
}: {
  client: Client | null; open: boolean; onClose: () => void
}) {
  const { user } = useAuth()
  const createPayment = useCreatePayment()
  const { toast } = useToast()

  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [referenceMonth, setReferenceMonth] = useState(currentMonthLabel())
  const [notes, setNotes] = useState('')

  // Reset when modal opens for a new client
  const handleOpen = (isOpen: boolean) => {
    if (isOpen && client) {
      setAmount(client.valor_mensal != null ? String(client.valor_mensal) : '')
      setPaymentDate(todayISO())
      setReferenceMonth(currentMonthLabel())
      setNotes('')
    }
    if (!isOpen) onClose()
  }

  const handleConfirm = async () => {
    if (!client || !user || !amount || !paymentDate || !referenceMonth) return
    try {
      await createPayment.mutateAsync({
        client_id: client.id,
        user_id: user.id,
        amount: parseFloat(amount),
        payment_date: paymentDate,
        reference_month: referenceMonth,
        notes: notes.trim() || null,
      })
      toast(`Pagamento de ${client.company_name} registrado!`, 'success')
      onClose()
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  if (!client) return null

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="w-[95vw] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[14px]">Registrar pagamento</DialogTitle>
          <p className="text-[12px] text-zinc-500 mt-0.5">{client.company_name}</p>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          <Input
            label="Valor (R$) *"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0,00"
          />
          <Input
            label="Data do pagamento *"
            type="date"
            value={paymentDate}
            onChange={e => setPaymentDate(e.target.value)}
          />
          <Input
            label="Mês de referência *"
            value={referenceMonth}
            onChange={e => setReferenceMonth(e.target.value)}
            placeholder="ex: Abril 2026"
          />
          <Textarea
            label="Observação (opcional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notas sobre este pagamento..."
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={createPayment.isPending || !amount || !paymentDate || !referenceMonth}
          >
            {createPayment.isPending
              ? <><Loader2 className="w-3 h-3 animate-spin" /> Salvando...</>
              : <><CheckCircle2 className="w-3 h-3" /> Confirmar pagamento</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Payment History Modal ────────────────────────────────────────────────────

function PaymentHistoryModal({
  client, open, onClose,
}: {
  client: Client | null; open: boolean; onClose: () => void
}) {
  const { data: payments = [], isLoading } = useClientPayments(open && client ? client.id : null)

  if (!client) return null

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="w-[95vw] max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-[14px]">Histórico de pagamentos</DialogTitle>
          <p className="text-[12px] text-zinc-500 mt-0.5">{client.company_name}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 mt-2 pr-1">
          {isLoading && (
            <div className="py-8 text-center">
              <Loader2 className="w-4 h-4 animate-spin text-zinc-600 mx-auto" />
            </div>
          )}

          {!isLoading && payments.length === 0 && (
            <div className="py-10 text-center">
              <History className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
              <p className="text-[12px] text-zinc-600">Nenhum pagamento registrado ainda.</p>
            </div>
          )}

          {payments.map(p => (
            <div
              key={p.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-[#e8e8e8] bg-[#f7f7f7]"
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.status === 'pago' ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-[#0f0f0f]">{p.reference_month}</p>
                {p.notes && <p className="text-[10px] text-[#737373] truncate mt-0.5">{p.notes}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[13px] font-semibold text-[#0f0f0f]">{fmtBRLDecimal(p.amount)}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">{fmtDate(p.payment_date)}</p>
              </div>
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0 ${
                p.status === 'pago'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {p.status === 'pago' ? 'Pago' : 'Atrasado'}
              </span>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-3">
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Client Row ───────────────────────────────────────────────────────────────

function ClientRow({ client, onOpenPayment, onOpenHistory }: {
  client: Client
  onOpenPayment: (c: Client) => void
  onOpenHistory: (c: Client) => void
}) {
  const status = calcFinancialStatus(client)
  const aux = getFinancialAuxText(client, status)
  const waLink = buildWhatsAppLink(client)
  const showCobrar = (status === 'atrasado' || status === 'vence_em_breve') && !!waLink

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-[#e8e8e8] bg-white hover:bg-[#f7f7f7] hover:border-[#d0d0d0] transition-all group flex-wrap sm:flex-nowrap"
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {client.logo_url ? (
          <img src={client.logo_url} alt={client.company_name}
            className="w-8 h-8 rounded-lg object-cover border border-[#e8e8e8]" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-[#f0f0f0] border border-[#e8e8e8] flex items-center justify-center text-[12px] font-medium text-[#737373]">
            {client.company_name[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Name — clickable */}
      <div className="flex-1 min-w-0">
        <Link to={`/clients/${client.id}`} className="group/name">
          <p className="text-[13px] font-medium text-[#0f0f0f] truncate group-hover/name:text-[#0f0f0f] transition-colors">
            {client.company_name}
          </p>
        </Link>
        {aux && (
          <p className={`text-[10px] mt-0.5 ${
            status === 'atrasado' ? 'text-red-600' :
            status === 'vence_em_breve' ? 'text-amber-600' : 'text-[#737373]'
          }`}>{aux}</p>
        )}
      </div>

      {/* Valor mensal */}
      <div className="hidden sm:block w-28 text-right flex-shrink-0">
        <p className="text-[13px] font-semibold text-[#0f0f0f]">
          {client.valor_mensal != null ? fmtBRLDecimal(client.valor_mensal) : '—'}
        </p>
        {client.dia_vencimento != null && (
          <p className="text-[10px] text-zinc-600 flex items-center justify-end gap-1 mt-0.5">
            <CalendarDays className="w-2.5 h-2.5" /> dia {client.dia_vencimento}
          </p>
        )}
      </div>

      {/* Status badge */}
      <div className="hidden md:block flex-shrink-0 w-36">
        <StatusBadge status={status} />
      </div>

      {/* Último pagamento */}
      <div className="hidden lg:block w-28 text-right flex-shrink-0">
        <p className="text-[11px] text-zinc-500">{fmtDate(client.last_payment_date)}</p>
      </div>

      {/* Actions (show on hover) */}
      <div className="flex items-center gap-1 flex-shrink-0 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        {/* Registrar pagamento */}
        {status !== 'cancelado' && (
          <button
            onClick={() => onOpenPayment(client)}
            title="Registrar pagamento"
            className="h-7 px-2.5 flex items-center gap-1.5 rounded-lg text-[11px] text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all"
          >
            <CheckCircle2 className="w-3 h-3" /> Pago
          </button>
        )}

        {/* Cobrar via WhatsApp */}
        {showCobrar && (
          <a
            href={waLink!}
            target="_blank"
            rel="noopener noreferrer"
            title="Cobrar via WhatsApp"
            className="h-7 px-2.5 flex items-center gap-1.5 rounded-lg text-[11px] text-green-700 hover:bg-green-50 border border-transparent hover:border-green-200 transition-all"
          >
            <MessageCircle className="w-3 h-3" /> Cobrar
          </a>
        )}

        {/* Histórico */}
        <button
          onClick={() => onOpenHistory(client)}
          title="Histórico de pagamentos"
          className="h-7 w-7 flex items-center justify-center rounded-lg text-[#737373] hover:text-[#0f0f0f] hover:bg-[#f0f0f0] border border-transparent hover:border-[#e8e8e8] transition-all"
        >
          <History className="w-3 h-3" />
        </button>

        {/* Alterar status */}
        <StatusDropdown client={client} />

        {/* Abrir perfil */}
        <Link
          to={`/clients/${client.id}`}
          title="Abrir perfil"
          className="h-7 w-7 flex items-center justify-center rounded-lg text-[#737373] hover:text-[#0f0f0f] hover:bg-[#f0f0f0] border border-transparent hover:border-[#e8e8e8] transition-all"
        >
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Financial() {
  const { data: allClients = [], isLoading } = useClients()
  const { toast } = useToast()

  const [filter, setFilter] = useState<FilterKey>('todos')
  const [search, setSearch] = useState('')

  // Modal state
  const [paymentTarget, setPaymentTarget] = useState<Client | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [historyTarget, setHistoryTarget] = useState<Client | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const openPaymentModal = (c: Client) => { setPaymentTarget(c); setPaymentOpen(true) }
  const openHistoryModal = (c: Client) => { setHistoryTarget(c); setHistoryOpen(true) }

  // Only clients with financial data
  const financialClients = useMemo(() =>
    allClients.filter(c => c.valor_mensal != null || c.dia_vencimento != null),
    [allClients]
  )

  // Compute status for each
  const withStatus = useMemo(() =>
    financialClients.map(c => ({ client: c, status: calcFinancialStatus(c) })),
    [financialClients]
  )

  // KPI calculations
  const kpis = useMemo(() => {
    const now = new Date()
    const thisYear = now.getFullYear()
    const thisMonth = now.getMonth() + 1

    const mrrClients = withStatus.filter(x => x.status !== 'cancelado')
    const mrr = mrrClients.reduce((s, x) => s + (x.client.valor_mensal ?? 0), 0)

    const previstaClients = withStatus.filter(x => x.status === 'ativo' || x.status === 'vence_em_breve')
    const previsto = previstaClients.reduce((s, x) => s + (x.client.valor_mensal ?? 0), 0)

    const overdueList = withStatus.filter(x => x.status === 'atrasado')
    const overdueRevenue = overdueList.reduce((s, x) => s + (x.client.valor_mensal ?? 0), 0)

    const soonList = withStatus.filter(x => x.status === 'vence_em_breve')
    const soonRevenue = soonList.reduce((s, x) => s + (x.client.valor_mensal ?? 0), 0)

    const receivedList = withStatus.filter(x => {
      if (!x.client.last_payment_date) return false
      const [y, m] = x.client.last_payment_date.split('-').map(Number)
      return y === thisYear && m === thisMonth
    })
    const receivedRevenue = receivedList.reduce((s, x) => s + (x.client.valor_mensal ?? 0), 0)

    const avgTicket = mrrClients.length > 0 ? mrr / mrrClients.length : 0

    return {
      mrr, previsto, overdueRevenue, overdueCount: overdueList.length,
      soonRevenue, soonCount: soonList.length,
      receivedRevenue, receivedCount: receivedList.length,
      avgTicket, mrrCount: mrrClients.length,
      showAlert: previsto < mrr && overdueList.length > 0,
      alertDiff: mrr - previsto,
    }
  }, [withStatus])

  // Filter + search
  const filtered = useMemo(() => {
    let list = withStatus
    if (filter !== 'todos') list = list.filter(x => x.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(x => x.client.company_name.toLowerCase().includes(q))
    }
    return list
  }, [withStatus, filter, search])

  // Filter counts
  const counts = useMemo(() => {
    const map: Record<FilterKey, number> = { todos: withStatus.length, ativo: 0, vence_em_breve: 0, atrasado: 0, cancelado: 0 }
    withStatus.forEach(x => { map[x.status] = (map[x.status] ?? 0) + 1 })
    return map
  }, [withStatus])

  return (
    <div className="min-h-full bg-[#f5f7fb]">
      <Header title="Financeiro" subtitle="Visão consolidada da receita dos clientes" />

      <div className="p-4 md:p-6 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            label="Recebido no mês"
            value={fmtBRL(kpis.receivedRevenue)}
            sub={`${kpis.receivedCount} pagamento${kpis.receivedCount !== 1 ? 's' : ''} confirmado${kpis.receivedCount !== 1 ? 's' : ''}`}
            borderAccent="border-emerald-500/20"
            iconBg="bg-emerald-500/15"
            delay={0}
          />
          <KpiCard
            icon={<TrendingUp className="w-4 h-4 text-blue-400" />}
            label="MRR"
            value={fmtBRL(kpis.mrr)}
            sub={`${kpis.mrrCount} contrato${kpis.mrrCount !== 1 ? 's' : ''} ativo${kpis.mrrCount !== 1 ? 's' : ''}`}
            borderAccent="border-blue-500/20"
            iconBg="bg-blue-500/15"
            delay={0.04}
          />
          <KpiCard
            icon={<Clock className="w-4 h-4 text-amber-400" />}
            label="Vence em breve"
            value={kpis.soonCount > 0 ? fmtBRL(kpis.soonRevenue) : '—'}
            sub={kpis.soonCount > 0
              ? `${kpis.soonCount} cliente${kpis.soonCount !== 1 ? 's' : ''} vence${kpis.soonCount !== 1 ? 'm' : ''} em até 5 dias`
              : 'nenhum vencimento próximo'}
            borderAccent={kpis.soonCount > 0 ? 'border-amber-500/20' : 'border-[#e2e8f0]'}
            iconBg="bg-amber-500/15"
            delay={0.08}
            onClick={kpis.soonCount > 0 ? () => setFilter('vence_em_breve') : undefined}
          />
          <KpiCard
            icon={<AlertCircle className="w-4 h-4 text-red-400" />}
            label="Em atraso"
            value={kpis.overdueCount > 0 ? fmtBRL(kpis.overdueRevenue) : '—'}
            sub={`${kpis.overdueCount} cliente${kpis.overdueCount !== 1 ? 's' : ''} em atraso`}
            borderAccent={kpis.overdueCount > 0 ? 'border-red-500/20' : 'border-[#e2e8f0]'}
            iconBg="bg-red-500/15"
            delay={0.12}
            onClick={kpis.overdueCount > 0 ? () => setFilter('atrasado') : undefined}
          />
          <KpiCard
            icon={<BarChart3 className="w-4 h-4 text-violet-400" />}
            label="Ticket médio"
            value={kpis.mrrCount > 0 ? fmtBRL(kpis.avgTicket) : '—'}
            sub="média por contrato ativo"
            borderAccent="border-violet-500/20"
            iconBg="bg-violet-500/15"
            delay={0.16}
          />
        </div>

        {/* Alert card — only when previsto < MRR */}
        {kpis.showAlert && (
          <AlertCard
            mrr={kpis.mrr}
            previsto={kpis.previsto}
            diff={kpis.alertDiff}
            affectedCount={kpis.overdueCount}
            onViewAffected={() => setFilter('atrasado')}
            delay={0.2}
          />
        )}

        {/* Filter + Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-1.5 flex-wrap">
            {(Object.keys(filterLabels) as FilterKey[]).map(key => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                  filter === key
                    ? 'bg-[#0f0f0f] text-white border-transparent'
                    : 'bg-white text-[#6b7280] hover:text-[#0f0f0f] hover:bg-[#f0f4f8] border-[#e2e8f0]'
                }`}
              >
                {filterLabels[key]}
                {counts[key] > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                    filter === key ? 'bg-white/20 text-white' : 'bg-[#f0f4f8] text-[#6b7280]'
                  }`}>
                    {counts[key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af] pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-[#e8e8e8] bg-white text-[12px] text-[#0f0f0f] placeholder:text-[#a0a0a0] focus:outline-none focus:border-[#a0a0a0] transition-colors"
            />
          </div>
        </div>

        {/* Table header */}
        {filtered.length > 0 && (
          <div className="hidden md:grid grid-cols-[32px_1fr_112px_144px_112px_auto] items-center gap-4 px-4 pb-1">
            <div />
            <p className="text-[10px] text-[#9ca3af] uppercase tracking-wide">Cliente</p>
            <p className="text-[10px] text-[#9ca3af] uppercase tracking-wide text-right">Mensalidade</p>
            <p className="text-[10px] text-[#9ca3af] uppercase tracking-wide">Status</p>
            <p className="text-[10px] text-[#9ca3af] uppercase tracking-wide text-right">Últ. pagamento</p>
            <div />
          </div>
        )}

        {/* Client list */}
        <div className="space-y-1.5">
          {isLoading && (
            <div className="py-12 text-center text-[12px] text-[#9ca3af]">Carregando clientes...</div>
          )}

          {!isLoading && financialClients.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-12 h-12 rounded-xl border border-[#e2e8f0] bg-white shadow-sm flex items-center justify-center mb-4">
                <DollarSign className="w-5 h-5 text-[#c7d2e0]" />
              </div>
              <p className="text-[14px] font-medium text-[#0f0f0f]">Nenhum cliente com dados financeiros</p>
              <p className="text-[12px] text-[#6b7280] mt-1 max-w-xs">
                Cadastre o valor mensal e o dia de vencimento no perfil de cada cliente.
              </p>
              <Link
                to="/clients"
                className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium transition-colors hover:opacity-90"
                style={{ background: '#0f0f0f', color: '#ffffff' }}
              >
                Ver clientes
              </Link>
            </div>
          )}

          {!isLoading && financialClients.length > 0 && filtered.length === 0 && (
            <div className="py-12 text-center text-[12px] text-[#9ca3af]">
              Nenhum cliente encontrado para este filtro.
            </div>
          )}

          {filtered.map(({ client }) => (
            <ClientRow
              key={client.id}
              client={client}
              onOpenPayment={openPaymentModal}
              onOpenHistory={openHistoryModal}
            />
          ))}
        </div>

        {filtered.length > 0 && (
          <p className="text-[11px] text-[#9ca3af] text-center">
            {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} exibido{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Modals */}
      <RegisterPaymentModal
        client={paymentTarget}
        open={paymentOpen}
        onClose={() => { setPaymentOpen(false); setPaymentTarget(null) }}
      />
      <PaymentHistoryModal
        client={historyTarget}
        open={historyOpen}
        onClose={() => { setHistoryOpen(false); setHistoryTarget(null) }}
      />
    </div>
  )
}
