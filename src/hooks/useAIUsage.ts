// ── Hook: consumo de IA do usuário no mês atual ────────────────────────────────
// Lê da tabela ai_usage (somente leitura pelo usuário — update é feito via Edge Function)

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSubscription } from '@/hooks/useSubscription'
import { PLAN_AI_LIMITS, type PlanId } from '@/config/plans'

export interface AIUsageData {
  requests: number
  limit: number
  percent: number
  month: string
}

export function useAIUsage(userId: string | undefined) {
  const { data: subData } = useSubscription()

  // Limite sempre calculado ao vivo a partir do plano — nunca usa cache de limite
  const planId  = (subData?.subscription.plan ?? 'starter') as PlanId
  const planLimit = PLAN_AI_LIMITS[planId] ?? 100

  const month = new Date().toISOString().slice(0, 7)

  const query = useQuery<number | null>({
    queryKey: ['ai_usage', userId, month],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('ai_usage')
        .select('requests')
        .eq('user_id', userId)
        .eq('month', month)
        .maybeSingle()
      if (error) throw error
      return data?.requests ?? 0
    },
  })

  // Computa limit e percent FORA do queryFn para refletir o plano atual sempre
  const requests = query.data ?? 0
  const data: AIUsageData | null = query.data !== undefined && query.data !== null
    ? {
        requests,
        limit:   planLimit,
        percent: Math.min(100, Math.round((requests / planLimit) * 100)),
        month,
      }
    : null

  return { ...query, data }
}
