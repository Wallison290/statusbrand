// ── Definição central dos planos ──────────────────────────────────────────────
// Preencha os stripePriceId após criar os produtos no Stripe

export type PlanId = 'starter' | 'pro' | 'agency'

export interface Plan {
  id: PlanId
  name: string
  price: number
  maxClients: number      // -1 = ilimitado
  aiRequestsPerMonth: number
  stripePriceId: string | null
  badge?: string
  description: string
  features: string[]
}

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 47,
    maxClients: 5,
    aiRequestsPerMonth: 100,
    stripePriceId: 'price_1TYsFlP29s2RNZxUOJJW67IL',
    description: 'Para quem está começando a agência',
    features: [
      'Até 5 clientes',
      '100 requests de IA por mês',
      'Planejador de conteúdo',
      'Tarefas e notas',
      'Financeiro básico',
      'Biblioteca de conteúdo',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 97,
    maxClients: 20,
    aiRequestsPerMonth: 400,
    stripePriceId: 'price_1TYsFpP29s2RNZxUNzOUbAPr',
    badge: 'Mais popular',
    description: 'Para agências em crescimento',
    features: [
      'Até 20 clientes',
      '400 requests de IA por mês',
      'IA Copilot completo',
      'Portal do cliente',
      'Relatórios mensais',
      'Suporte prioritário',
    ],
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    price: 197,
    maxClients: -1,
    aiRequestsPerMonth: 1500,
    stripePriceId: 'price_1TYsFqP29s2RNZxUpqsRsVEw',
    badge: 'Ilimitado',
    description: 'Para agências consolidadas',
    features: [
      'Clientes ilimitados',
      '1.500 requests de IA por mês',
      'Tudo do Pro',
      'Onboarding personalizado',
      'SLA garantido',
    ],
  },
}

export const PLAN_AI_LIMITS: Record<PlanId, number> = {
  starter: 100,
  pro:     400,
  agency:  1500,
}

export function getPlan(id: PlanId | string | null | undefined): Plan {
  return PLANS[(id as PlanId) ?? 'starter'] ?? PLANS.starter
}
