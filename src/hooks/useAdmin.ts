// ── Hook: Painel de Admin (visão de todos os usuários e clientes do sistema) ──
// Só retorna dados quando a conta logada tem is_admin=true — a RLS do banco
// (policies profiles_admin_read_all / clients_admin_read_all /
// subscriptions_admin_read_all) já bloqueia no servidor quem não é admin;
// aqui é só a leitura em si.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Profile, Client } from '@/types'
import type { PlanId } from '@/config/plans'

export interface AdminUserRow {
  id: string
  email: string
  full_name: string | null
  agency_name: string | null
  role: 'agency' | 'client'
  linked_client_id: string | null
  created_at: string
  whatsapp: string | null
  plan: PlanId | null
  subStatus: 'active' | 'trialing' | 'past_due' | 'canceled' | 'inactive' | null
  trial_ends_at: string | null
  current_period_end: string | null
}

export function useAdminUsers() {
  const { profile } = useAuth()
  const isAdmin = !!profile?.is_admin

  return useQuery<AdminUserRow[]>({
    queryKey: ['admin-users'],
    enabled: isAdmin,
    staleTime: 30_000,
    queryFn: async () => {
      const [{ data: profiles, error: profErr }, { data: subs, error: subErr }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('user_id, plan, status, trial_ends_at, current_period_end'),
      ])
      if (profErr) throw profErr
      if (subErr) throw subErr

      const subByUser = new Map((subs ?? []).map((s: any) => [s.user_id, s]))

      return ((profiles ?? []) as Profile[]).map(p => {
        const sub = subByUser.get(p.id)
        return {
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          agency_name: p.agency_name,
          role: p.role,
          linked_client_id: p.linked_client_id,
          created_at: p.created_at,
          whatsapp: p.whatsapp ?? null,
          plan: sub?.plan ?? null,
          subStatus: sub?.status ?? null,
          trial_ends_at: sub?.trial_ends_at ?? null,
          current_period_end: sub?.current_period_end ?? null,
        }
      })
    },
  })
}

export interface AdminClientRow extends Client {
  ownerEmail: string | null
  ownerAgencyName: string | null
}

export function useAdminClients() {
  const { profile } = useAuth()
  const isAdmin = !!profile?.is_admin

  return useQuery<AdminClientRow[]>({
    queryKey: ['admin-clients'],
    enabled: isAdmin,
    staleTime: 30_000,
    queryFn: async () => {
      const [{ data: clients, error: cliErr }, { data: profiles, error: profErr }] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, email, agency_name').eq('role', 'agency'),
      ])
      if (cliErr) throw cliErr
      if (profErr) throw profErr

      const ownerById = new Map((profiles ?? []).map((p: any) => [p.id, p]))

      return ((clients ?? []) as Client[]).map(c => {
        const owner = ownerById.get(c.user_id)
        return {
          ...c,
          ownerEmail: owner?.email ?? null,
          ownerAgencyName: owner?.agency_name ?? null,
        }
      })
    },
  })
}
