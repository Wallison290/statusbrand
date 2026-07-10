// ── Definição central dos planos ──────────────────────────────────────────────
// Preencha os stripePriceId após criar os produtos no Stripe

export type PlanId = 'starter' | 'pro' | 'agency'

// Features agrupadas por categoria — facilita a comparação entre planos
// (padrão recomendado para páginas de preços de SaaS)
export interface PlanFeatureGroup {
  title: string
  items: string[]
}

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
  featureGroups: PlanFeatureGroup[]
}

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 57,
    maxClients: 5,
    aiRequestsPerMonth: 150,
    storageGB: 10,
    hasClientPortal: true,
    hasReports: false,
    maxTeamMembers: 1,
    instagramProfiles: 1,
    supportLevel: 'email',
    supportLabel: 'E-mail',
    stripePriceId: 'price_1Tjj4F0khDYycmTvwkNmnfFk',
    description: 'Para quem está começando a agência',
    featureGroups: [
      { title: 'Gestão da Agência', items: ['Até 5 clientes', 'Equipe com 1 usuário', '10 GB de armazenamento'] },
      { title: 'Marketing', items: ['Planejamento de conteúdo', 'Agendamento Instagram (1 perfil)', 'Biblioteca inteligente', 'Tarefas e notas'] },
      { title: 'Cliente', items: ['Portal de aprovação (até 2 clientes)', 'Notificações via WhatsApp'] },
      { title: 'IA', items: ['150 créditos de IA por mês'] },
      { title: 'Suporte', items: ['E-mail'] },
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 97,
    maxClients: 20,
    aiRequestsPerMonth: 600,
    storageGB: 50,
    hasClientPortal: true,
    hasReports: true,
    maxTeamMembers: 3,
    instagramProfiles: 5,
    supportLevel: 'priority',
    supportLabel: 'Prioritário (24h)',
    stripePriceId: 'price_1Tjj4w0khDYycmTvDDOmCvi7',
    badge: 'Mais popular',
    description: 'Para agências em crescimento',
    featureGroups: [
      { title: 'Gestão da Agência', items: ['Até 20 clientes', 'Equipe com até 3 usuários', '50 GB de armazenamento', 'Relatórios mensais'] },
      { title: 'Marketing', items: ['Planejamento de conteúdo', 'Agendamento Instagram (até 5 perfis)', 'Biblioteca inteligente', 'Tarefas e notas'] },
      { title: 'Cliente', items: ['Portal de aprovação (até 10 clientes)', 'Notificações via WhatsApp'] },
      { title: 'IA', items: ['600 créditos de IA por mês', 'IA Copilot completo'] },
      { title: 'Suporte', items: ['Prioritário (24h)'] },
    ],
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    price: 197,
    maxClients: 50,
    aiRequestsPerMonth: 2000,
    storageGB: 100,
    hasClientPortal: true,
    hasReports: true,
    maxTeamMembers: -1,
    instagramProfiles: 20,
    supportLevel: 'sla',
    supportLabel: 'WhatsApp + SLA 4h',
    stripePriceId: 'price_1Tjj5c0khDYycmTvDDntAKuf',
    badge: 'Ilimitado',
    description: 'Para agências consolidadas',
    featureGroups: [
      { title: 'Gestão da Agência', items: ['Até 50 clientes', 'Equipe com usuários ilimitados', '100 GB de armazenamento', 'Relatórios mensais'] },
      { title: 'Marketing', items: ['Planejamento de conteúdo', 'Agendamento Instagram (até 20 perfis)', 'Biblioteca inteligente', 'Tarefas e notas'] },
      { title: 'Cliente', items: ['Portal de aprovação (até 50 clientes)', 'Notificações via WhatsApp'] },
      { title: 'IA', items: ['2.000 créditos de IA por mês', 'IA Copilot completo'] },
      { title: 'Suporte', items: ['WhatsApp + SLA 4h'] },
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
