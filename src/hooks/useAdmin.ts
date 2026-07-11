// ── Hook: Painel de Admin (visão de todos os usuários e clientes do sistema) ──
// Usa RPCs dedicadas (admin_list_profiles/admin_list_clients/
// admin_list_subscriptions) em vez de consultar as tabelas diretamente. Isso é
// proposital: se o "ver tudo" fosse uma policy de RLS nas tabelas, ele vazaria
// para QUALQUER tela do app que consulta profiles/clients (Clientes,
// Financeiro...), misturando dados de todas as agências nas telas normais do
// admin. As RPCs são SECURITY DEFINER e só devolvem linhas quando
// is_admin()=true — RLS das tabelas continua isolando cada usuário aos
// próprios dados em todo o resto do sistema.

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
        supabase.rpc('admin_list_profiles'),
        supabase.rpc('admin_list_subscriptions'),
      ])
      if (profErr) throw profErr
      if (subErr) throw subErr

      const subByUser = new Map((subs ?? []).map((s: any) => [s.user_id, s]))

      return ((profiles ?? []) as Profile[])
        .slice()
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(p => {
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
        supabase.rpc('admin_list_clients'),
        supabase.rpc('admin_list_profiles'),
      ])
      if (cliErr) throw cliErr
      if (profErr) throw profErr

      const agencyProfiles = ((profiles ?? []) as Profile[]).filter(p => p.role === 'agency')
      const ownerById = new Map(agencyProfiles.map(p => [p.id, p]))

      return ((clients ?? []) as Client[])
        .slice()
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(c => {
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
