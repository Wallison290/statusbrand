import type { Client, FinancialStatus } from '@/types'

// Returns true when client_payments contains a 'pago' record for the current
// billing cycle (same month as dueThisMonth, or on/after it).
export function hasPaidCurrentCycle(
  payments: Array<{ status: string; payment_date: string }>,
  diaVencimento: number | null | undefined,
): boolean {
  if (!diaVencimento || payments.length === 0) return false
  const today = new Date()
  const dueThisMonth = new Date(today.getFullYear(), today.getMonth(), diaVencimento)
  return payments.some(p => {
    if (p.status !== 'pago') return false
    const paid = new Date(p.payment_date + 'T00:00:00')
    return (
      paid >= dueThisMonth ||
      (paid.getFullYear() === dueThisMonth.getFullYear() &&
        paid.getMonth() === dueThisMonth.getMonth())
    )
  })
}

export function calcFinancialStatus(client: Client): FinancialStatus {
  // Cancelled is always manual and never overridden automatically
  if (client.manual_status_override && client.financial_status === 'cancelado') return 'cancelado'

  // Any other manual override: trust stored value
  if (client.manual_status_override && client.financial_status) return client.financial_status

  // No due day configured → can't determine status
  if (!client.dia_vencimento) return 'ativo'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayDue = client.dia_vencimento

  const dueThisMonth = new Date(today.getFullYear(), today.getMonth(), dayDue)
  const lastPaid = client.last_payment_date
    ? new Date(client.last_payment_date + 'T00:00:00')
    : null

  // Paid for this cycle if payment date is on/after due date OR falls within the same
  // calendar month as the due date (covers payments made before the due day)
  const paidThisCycle = lastPaid != null && (
    lastPaid >= dueThisMonth ||
    (lastPaid.getFullYear() === dueThisMonth.getFullYear() &&
      lastPaid.getMonth() === dueThisMonth.getMonth())
  )

  if (paidThisCycle) {
    const nextDue = new Date(today.getFullYear(), today.getMonth() + 1, dayDue)
    const daysUntil = Math.ceil((nextDue.getTime() - today.getTime()) / 86_400_000)
    if (daysUntil <= 5) return 'vence_em_breve'
    return 'ativo'
  }

  // Not yet paid for this cycle
  const daysUntil = Math.ceil((dueThisMonth.getTime() - today.getTime()) / 86_400_000)
  if (daysUntil < 0) return 'atrasado'
  if (daysUntil <= 5) return 'vence_em_breve'
  return 'ativo'
}

export function financialStatusLabel(status: FinancialStatus): string {
  return {
    ativo: 'Em dia',
    vence_em_breve: 'Vence em breve',
    atrasado: 'Atrasado',
    cancelado: 'Cancelado',
  }[status]
}

export function getFinancialAuxText(client: Client, status: FinancialStatus): string | null {
  const lastPaid = client.last_payment_date
    ? new Date(client.last_payment_date + 'T00:00:00')
    : null

  if (status === 'cancelado') {
    return lastPaid ? `Último pagamento: ${lastPaid.toLocaleDateString('pt-BR')}` : null
  }

  if (!client.dia_vencimento) {
    return lastPaid ? `Pago em ${lastPaid.toLocaleDateString('pt-BR')}` : null
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueThisMonth = new Date(today.getFullYear(), today.getMonth(), client.dia_vencimento)
  const paidThisCycle = lastPaid != null && lastPaid >= dueThisMonth

  if (status === 'atrasado') {
    const days = Math.abs(Math.ceil((dueThisMonth.getTime() - today.getTime()) / 86_400_000))
    return `Atrasado há ${days} dia${days !== 1 ? 's' : ''}`
  }

  if (status === 'vence_em_breve') {
    const nextDue = paidThisCycle
      ? new Date(today.getFullYear(), today.getMonth() + 1, client.dia_vencimento)
      : dueThisMonth
    const days = Math.ceil((nextDue.getTime() - today.getTime()) / 86_400_000)
    if (days === 0) return 'Vence hoje'
    return `Vence em ${days} dia${days !== 1 ? 's' : ''}`
  }

  // ativo
  if (lastPaid) return `Pago em ${lastPaid.toLocaleDateString('pt-BR')}`
  return null
}
