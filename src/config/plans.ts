// ── Definição central dos planos ──────────────────────────────────────────────
// Preencha os stripePriceId após criar os produtos no Stripe

export type PlanId = 'starter' | 'pro' | 'agency'

export interface Plan {
  id: PlanId
  name: string
  price: number
  maxClients: number          // -1 = ilimitado
  aiRequestsPerMonth: number
  storageGB: number           // armazenamento em GB
  hasClientPortal: boolean
  hasReports: boolean
  hasTeamAccess: boolean      // acesso de membros de equipe
  hasInstagramScheduling: boolean // agendamento automático Instagram
  supportLevel: 'email' | 'priority' | 'sla'
  stripePriceId: string | null
  badge?: string
  description: string
  features: string[]
}

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 97,
    maxClients: 5,
    aiRequestsPerMonth: 100,
    storageGB: 10,
    hasClientPortal: false,
    hasReports: false,
    hasTeamAccess: false,
    hasInstagramScheduling: false,
    supportLevel: 'email',
    stripePriceId: 'price_1TYsFlP29s2RNZxUOJJW67IL',
    description: 'Para quem está começando a agência',
    features: [
      'Até 5 clientes',
      '100 requests de IA por mês',
      '10 GB de armazenamento',
      'Planejador de conteúdo',
      'Tarefas e notas',
      'Financeiro básico',
      'Biblioteca de conteúdo',
      'Suporte por e-mail',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 147,
    maxClients: 20,
    aiRequestsPerMonth: 400,
    storageGB: 20,
    hasClientPortal: true,
    hasReports: true,
    hasTeamAccess: false,
    hasInstagramScheduling: false,
    supportLevel: 'priority',
    stripePriceId: 'price_1TYsFpP29s2RNZxUNzOUbAPr',
    badge: 'Mais popular',
    description: 'Para agências em crescimento',
    features: [
      'Até 20 clientes',
      '400 requests de IA por mês',
      '20 GB de armazenamento',
      'IA Copilot completo',
      'Portal do cliente',
      'Relatórios mensais',
      'Suporte prioritário',
    ],
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    price: 297,
    maxClients: -1,
    aiRequestsPerMonth: 1500,
    storageGB: 30,
    hasClientPortal: true,
    hasReports: true,
    hasTeamAccess: true,
    hasInstagramScheduling: true,
    supportLevel: 'sla',
    stripePriceId: 'price_1TYsFqP29s2RNZxUpqsRsVEw',
    badge: 'Ilimitado',
    description: 'Para agências consolidadas',
    features: [
      'Clientes ilimitados',
      '1.500 requests de IA por mês',
      '30 GB de armazenamento',
      'Equipe com acesso às demandas',
      'Agendamento automático no Instagram',
      'Portal do cliente',
      'Relatórios mensais',
      'SLA garantido',
    ],
  },
}

export const PLAN_AI_LIMITS: Record<PlanId, number> = {
  starter: 100,
  pro:     400,
  agency:  1500,
}

export const PLAN_STORAGE_GB: Record<PlanId, number> = {
  starter: 10,
  pro:     20,
  agency:  30,
}

/** Verifica se o plano tem acesso a um recurso específico */
export function planHas(planId: PlanId | string | null | undefined, feature: keyof Pick<Plan,
  'hasClientPortal' | 'hasReports' | 'hasTeamAccess' | 'hasInstagramScheduling'
>): boolean {
  return getPlan(planId)[feature] ?? false
}

export function getPlan(id: PlanId | string | null | undefined): Plan {
  return PLANS[(id as PlanId) ?? 'starter'] ?? PLANS.starter
}
