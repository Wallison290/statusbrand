import { format } from 'date-fns'

/** Adiciona N dias ÚTEIS (pula sábado e domingo) a partir de uma data. */
export function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return d
}

/**
 * Converte um offset em dias úteis (a partir de uma data de início yyyy-MM-dd)
 * para uma data yyyy-MM-dd. Retorna null se o offset for null (tarefa sem prazo).
 */
export function offsetToDate(startIso: string, offset: number | null): string | null {
  if (offset == null) return null
  const start = new Date(startIso + 'T00:00:00')
  if (offset <= 0) return format(start, 'yyyy-MM-dd')
  return format(addBusinessDays(start, offset), 'yyyy-MM-dd')
}
