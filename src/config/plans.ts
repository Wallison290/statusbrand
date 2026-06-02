// ── Definição central dos planos ──────────────────────────────────────────────
// Preencha os stripePriceId após criar os produtos no Stripe

export type PlanId = 'starter' | 'pro' | 'agency'

export interface Plan {
  id: PlanId
  name: string
  price: number
  maxClients: number            // -1 = ilimitado
  aiRequestsPerMonth: number
  storageGB: number             // armazenamento em GB
  hasClientPortal: boolean
  hasReports: boolean
  hasTeamAccess: boolean        // acesso de membros de equipe
  instagramProfiles: number     // perfis com agendamento automático (-1 = ilimitado, 0 = sem agendamento)
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
    instagramProfiles: 1,       // agendamento só para 1 perfil
    supportLevel: 'email',
    stripePriceId: 'price_1TYsFlP29s2RNZxUOJJW67IL',
    description: 'Para quem está começando a agência',
    features: [
      'Até 5 clientes',
      '100 requests de IA por mês',
      '10 GB de armazenamento',
      'Agendamento Instagram (1 perfil)',
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
    hasTeamAccess: true,        // equipe no Pro também
    instagramProfiles: -1,      // agendamento ilimitado
    supportLevel: 'priority',
    stripePriceId: 'price_1TYsFpP29s2RNZxUNzOUbAPr',
    badge: 'Mais popular',
    description: 'Para agências em crescimento',
    features: [
      'Até 20 clientes',
      '400 requests de IA por mês',
      '20 GB de armazenamento',
      'Agendamento Instagram (ilimitado)',
      'Equipe com acesso às demandas',
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
    instagramProfiles: -1,      // agendamento ilimitado
    supportLevel: 'sla',
    stripePriceId: 'price_1TYsFqP29s2RNZxUpqsRsVEw',
    badge: 'Ilimitado',
    description: 'Para agências consolidadas',
    features: [
      'Clientes ilimitados',
      '1.500 requests de IA por mês',
      '30 GB de armazenamento',
      'Agendamento Instagram (ilimitado)',
      'Equipe com acesso às demandas',
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

/** Retorna o label de agendamento Instagram para exibição */
export function instagramSchedulingLabel(planId: PlanId | string | null | undefined): string {
  const profiles = getPlan(planId).instagramProfiles
  if (profiles === 0)  return '—'
  if (profiles === 1)  return '1 perfil'
  return 'Ilimitado'
}

/** Verifica se o plano tem acesso a um recurso específico */
export function planHas(planId: PlanId | string | null | undefined, feature: keyof Pick<Plan,
  'hasClientPortal' | 'hasReports' | 'hasTeamAccess'
>): boolean {
  return getPlan(planId)[feature] ?? false
}

export function getPlan(id: PlanId | string | null | undefined): Plan {
  return PLANS[(id as PlanId) ?? 'starter'] ?? PLANS.starter
}
