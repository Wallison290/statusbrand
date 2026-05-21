// ── Hook: consumo de IA do usuário no mês atual ────────────────────────────────
// Lê da tabela ai_usage (somente leitura pelo usuário — update é feito via Edge Function)

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSubscription } from '@/hooks/useSubscription'

export interface AIUsageData {
  requests: number
  limit: number
  percent: number
  month: string
}

export function useAIUsage(userId: string | undefined) {
  const { data: subData } = useSubscription()
  // Usa o limite real do plano; fallback 100 se ainda carregando
  const planLimit = subData?.aiLimit ?? 100

  return useQuery<AIUsageData | null>({
    queryKey: ['ai_usage', userId],
    enabled: !!userId,
    staleTime: 60_000,   // revalida a cada 1 min
    queryFn: async () => {
      if (!userId) return null
      const month = new Date().toISOString().slice(0, 7)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('ai_usage')
        .select('requests')
        .eq('user_id', userId)
        .eq('month', month)
        .maybeSingle()

      if (error) throw error

      const requests = data?.requests ?? 0
      return {
        requests,
        limit: planLimit,
        percent: Math.min(100, Math.round((requests / planLimit) * 100)),
        month,
      }
    },
  })
}
