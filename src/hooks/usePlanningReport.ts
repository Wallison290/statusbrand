import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { ContentType, PlannerStatus } from '@/types'

// ── Item mínimo do planejador usado na agregação do relatório ─────────────────

export interface PlanningReportItem {
  id: string
  title: string
  content_type: ContentType
  scheduled_date: string
  status: PlannerStatus
}

export interface PlanningReport {
  items: PlanningReportItem[]
  total: number
  byStatus: Partial<Record<PlannerStatus, number>>
  byContentType: Partial<Record<ContentType, number>>
  published: PlanningReportItem[]
}

interface UsePlanningReportOptions {
  clientId: string | null | undefined
  month: number
  year: number
  /** true = visão do cliente no portal (só itens com sent_to_client = true) */
  clientVisibleOnly?: boolean
}

// Intervalo de datas em string simples (scheduled_date é DATE, sem timezone —
// não usar epoch/UTC aqui, senão a virada do mês fica errada pra quem não está em UTC).
function monthDateRange(year: number, month: number) {
  const since = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear  = month === 12 ? year + 1 : year
  const until = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  return { since, until }
}

function aggregate(items: PlanningReportItem[]): PlanningReport {
  const byStatus: Partial<Record<PlannerStatus, number>> = {}
  const byContentType: Partial<Record<ContentType, number>> = {}
  for (const item of items) {
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1
    byContentType[item.content_type] = (byContentType[item.content_type] ?? 0) + 1
  }
  return {
    items,
    total: items.length,
    byStatus,
    byContentType,
    published: items.filter(i => i.status === 'publicado'),
  }
}

/** Agrega os itens do planejador de um cliente num mês — usado no relatório combinado. */
export function usePlanningReport({ clientId, month, year, clientVisibleOnly = false }: UsePlanningReportOptions) {
  return useQuery({
    queryKey: ['planning-report', clientId, month, year, clientVisibleOnly],
    queryFn: async () => {
      const { since, until } = monthDateRange(year, month)
      let query = supabase
        .from('planner')
        .select('id, title, content_type, scheduled_date, status')
        .eq('client_id', clientId!)
        .gte('scheduled_date', since)
        .lt('scheduled_date', until)
      if (clientVisibleOnly) query = query.eq('sent_to_client' as any, true)
      const { data, error } = await query.order('scheduled_date', { ascending: true })
      if (error) throw error
      return aggregate(data as PlanningReportItem[])
    },
    enabled: !!clientId && !!month && !!year,
  })
}
