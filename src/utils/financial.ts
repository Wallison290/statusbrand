import type { Client, FinancialStatus } from '@/types'

// Returns true when client_payments contains a 'pago' record for the current
// billing cycle.
// A payment counts for the current cycle if:
//   1. It was made ON or AFTER the due date (paid on time / late)
//   2. It was made BEFORE the due date (early payment) AND the due date hasn't
//      passed yet — once the due date passes, early payments from this month no
//      longer cover the cycle and the client becomes overdue.
export function hasPaidCurrentCycle(
  payments: Array<{ status: string; payment_date: string }>,
  diaVencimento: number | null | undefined,
): boolean {
  if (!diaVencimento || payments.length === 0) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueThisMonth = new Date(today.getFullYear(), today.getMonth(), diaVencimento)
  const prevDue = new Date(today.getFullYear(), today.getMonth() - 1, diaVencimento)
  return payments.some(p => {
    if (p.status !== 'pago') return false
    const paid = new Date(p.payment_date + 'T00:00:00')
    // Paid on/after this month's due date → always counts
    if (paid >= dueThisMonth) return true
    // Paid early (before due date) → only counts if due date hasn't passed yet
    if (today < dueThisMonth && paid >= prevDue) return true
    return false
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
  const prevDue = new Date(today.getFullYear(), today.getMonth() - 1, dayDue)
  const lastPaid = client.last_payment_date
    ? new Date(client.last_payment_date + 'T00:00:00')
    : null

  // Paid for this cycle if:
  //   1. Payment is on/after the due date (on time or late catch-up), OR
  //   2. Payment is before the due date (early) AND today is still before the due date.
  //      Once the due date passes, early payments no longer cover the cycle.
  const paidThisCycle = lastPaid != null && (
    lastPaid >= dueThisMonth ||
    (today < dueThisMonth && lastPaid >= prevDue)
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
