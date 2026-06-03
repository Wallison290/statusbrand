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
  maxTeamMembers: number      // membros de equipe (-1 = ilimitado)
  instagramProfiles: number   // perfis com agendamento automático (-1 = ilimitado)
  supportLevel: 'email' | 'priority' | 'sla'
  supportLabel: string        // label completo para exibição
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
    aiRequestsPerMonth: 150,
    storageGB: 10,
    hasClientPortal: false,
    hasReports: false,
    maxTeamMembers: 1,
    instagramProfiles: 1,
    supportLevel: 'email',
    supportLabel: 'E-mail',
    stripePriceId: 'price_1Te09b0khDYycmTv1muADpGv',
    description: 'Para quem está começando a agência',
    features: [
      'Até 5 clientes',
      '150 requests de IA por mês',
      '10 GB de armazenamento',
      'Agendamento Instagram (1 perfil)',
      '1 usuário na equipe',
      'Planejador de conteúdo',
      'Tarefas, notas e biblioteca',
      'Suporte por e-mail',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 197,
    maxClients: 15,
    aiRequestsPerMonth: 600,
    storageGB: 50,
    hasClientPortal: true,
    hasReports: true,
    maxTeamMembers: 3,
    instagramProfiles: 5,
    supportLevel: 'priority',
    supportLabel: 'Prioritário (24h)',
    stripePriceId: 'price_1Te3yB0khDYycmTvPxQfIaPL',
    badge: 'Mais popular',
    description: 'Para agências em crescimento',
    features: [
      'Até 15 clientes',
      '600 requests de IA por mês',
      '50 GB de armazenamento',
      'Agendamento Instagram (até 5 perfis)',
      'Até 3 usuários na equipe',
      'IA Copilot completo',
      'Portal do cliente',
      'Relatórios mensais',
      'Suporte prioritário (24h)',
    ],
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    price: 397,
    maxClients: 50,
    aiRequestsPerMonth: 2000,
    storageGB: 100,
    hasClientPortal: true,
    hasReports: true,
    maxTeamMembers: -1,
    instagramProfiles: 20,
    supportLevel: 'sla',
    supportLabel: 'WhatsApp + SLA 4h',
    stripePriceId: 'price_1Te09n0khDYycmTvrseP5spd',
    badge: 'Ilimitado',
    description: 'Para agências consolidadas',
    features: [
      'Até 50 clientes',
      '2.000 requests de IA por mês',
      '100 GB de armazenamento',
      'Agendamento Instagram (até 20 perfis)',
      'Equipe ilimitada',
      'IA Copilot completo',
      'Portal do cliente',
      'Relatórios mensais',
      'WhatsApp + SLA 4h',
    ],
  },
}

export const PLAN_AI_LIMITS: Record<PlanId, number> = {
  starter: 150,
  pro:     600,
  agency:  2000,
}

export const PLAN_STORAGE_GB: Record<PlanId, number> = {
  starter: 10,
  pro:     50,
  agency:  100,
}

/** Label legível para agendamento Instagram */
export function instagramSchedulingLabel(planId: PlanId | string | null | undefined): string {
  const n = getPlan(planId).instagramProfiles
  if (n === -1) return 'Ilimitado'
  if (n === 1)  return '1 perfil'
  return `Até ${n} perfis`
}

/** Label legível para equipe */
export function teamMembersLabel(planId: PlanId | string | null | undefined): string {
  const n = getPlan(planId).maxTeamMembers
  if (n === -1) return 'Ilimitado'
  if (n === 1)  return '1'
  return `Até ${n}`
}

/** Verifica se o plano tem acesso a um recurso booleano */
export function planHas(planId: PlanId | string | null | undefined, feature: keyof Pick<Plan,
  'hasClientPortal' | 'hasReports'
>): boolean {
  return getPlan(planId)[feature] ?? false
}

export function getPlan(id: PlanId | string | null | undefined): Plan {
  return PLANS[(id as PlanId) ?? 'starter'] ?? PLANS.starter
}
