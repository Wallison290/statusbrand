// ── Hook: assinatura do usuário atual ─────────────────────────────────────────

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { getPlan, PLAN_AI_LIMITS, type Plan, type PlanId } from '@/config/plans'
// PlanId agora é 'starter' | 'pro' | 'agency'
import { useAuth } from '@/hooks/useAuth'

export interface Subscription {
  plan: PlanId
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'inactive'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_end: string | null
}

export interface SubscriptionData {
  subscription: Subscription
  plan: Plan
  isActive: boolean
  isPro: boolean
  isAgency: boolean
  aiLimit: number
}

export function useSubscription() {
  const { user } = useAuth()

  return useQuery<SubscriptionData | null>({
    queryKey: ['subscription', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user) return null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('subscriptions')
        .select('plan, status, stripe_customer_id, stripe_subscription_id, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error

      // Se não existe ainda (usuário antigo antes da migration), assume inativo
      const sub: Subscription = data ?? {
        plan: 'starter',
        status: 'inactive',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        current_period_end: null,
      }

      const planId = sub.plan as PlanId
      const plan   = getPlan(planId)
      const isActive = sub.status === 'active' || sub.status === 'trialing'

      return {
        subscription: sub,
        plan,
        isActive,
        isPro:    planId === 'pro',
        isAgency: planId === 'agency',
        aiLimit:  PLAN_AI_LIMITS[planId] ?? 50,
      }
    },
  })
}
