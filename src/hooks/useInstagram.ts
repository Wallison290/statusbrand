// ── Hook: agendamento Instagram ───────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InstagramAccount {
  id:                  string
  ig_user_id:          string
  client_id:           string | null
  username:            string
  name:                string | null
  profile_picture_url: string | null
  followers_count:     number
  token_expires_at:    string | null
  is_active:           boolean
  connected_at:        string
}

export interface ScheduledPost {
  id:            string
  ig_account_id: string
  client_id:     string | null
  post_type:     'IMAGE' | 'CAROUSEL_ALBUM' | 'REELS'
  caption:       string | null
  media_urls:    string[]
  scheduled_at:  string
  status:        'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled'
  ig_post_id:    string | null
  error_message: string | null
  published_at:  string | null
  retry_count:   number | null
  created_at:    string
  // Joined
  instagram_accounts?: { username: string; profile_picture_url: string | null } | null
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useInstagramAccount() {
  const { user } = useAuth()

  return useQuery<InstagramAccount | null>({
    queryKey:  ['instagram_account', user?.id],
    enabled:   !!user,
    staleTime: 60_000,
    queryFn:   async () => {
      const { data, error } = await (supabase as any)
        .from('instagram_accounts')
        .select('*')
        .eq('user_id', user!.id)
        .is('client_id', null)
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/** Todas as contas Instagram ativas do usuário (própria + clientes) */
export function useAllInstagramAccounts() {
  const { user } = useAuth()

  return useQuery<InstagramAccount[]>({
    queryKey:  ['instagram_accounts_all', user?.id],
    enabled:   !!user,
    staleTime: 60_000,
    queryFn:   async () => {
      const { data, error } = await (supabase as any)
        .from('instagram_accounts')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('connected_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

/** Conta Instagram vinculada a um cliente específico */
export function useClientInstagramAccount(clientId: string | undefined) {
  const { user } = useAuth()

  return useQuery<InstagramAccount | null>({
    queryKey:  ['instagram_account_client', clientId],
    enabled:   !!user && !!clientId,
    staleTime: 60_000,
    queryFn:   async () => {
      const { data, error } = await (supabase as any)
        .from('instagram_accounts')
        .select('*')
        .eq('user_id', user!.id)
        .eq('client_id', clientId)
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useScheduledPosts() {
  const { user } = useAuth()

  return useQuery<ScheduledPost[]>({
    queryKey:  ['scheduled_posts', user?.id],
    enabled:   !!user,
    staleTime: 30_000,
    refetchInterval: 30_000, // Atualiza a cada 30s para capturar mudanças de status
    queryFn:   async () => {
      const { data, error } = await (supabase as any)
        .from('scheduled_posts')
        .select('*, instagram_accounts!ig_account_id(username, profile_picture_url)')
        .eq('user_id', user!.id)
        .order('scheduled_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateScheduledPost() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (post: {
      ig_account_id: string
      client_id:     string | null
      post_type:     'IMAGE' | 'CAROUSEL_ALBUM' | 'REELS'
      caption:       string
      media_urls:    string[]
      scheduled_at:  string
      planner_id?:   string | null
    }) => {
      const { error } = await (supabase as any)
        .from('scheduled_posts')
        .insert({ ...post, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scheduled_posts'] }),
  })
}

export function useCancelScheduledPost() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('scheduled_posts')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduled_posts'] })
      // O cancelamento reverte o item do planner (trigger no banco) → atualiza a aba/modal de planejamento
      qc.invalidateQueries({ queryKey: ['planner'] })
    },
  })
}

// Altera a data/hora de um post ainda agendado.
export function useRescheduleScheduledPost() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, scheduled_at }: { id: string; scheduled_at: string }) => {
      const { error } = await (supabase as any)
        .from('scheduled_posts')
        .update({ scheduled_at, status: 'scheduled', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scheduled_posts'] }),
  })
}

// Recoloca um post que falhou de volta na fila de publicação.
// Zera retry_count para o post ter direito às 3 tentativas automáticas de novo
// e limpa a mensagem de erro anterior. O cron pega no próximo ciclo.
export function useRetryScheduledPost() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('scheduled_posts')
        .update({
          status:        'scheduled',
          retry_count:   0,
          error_message: null,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scheduled_posts'] }),
  })
}

export function useDisconnectInstagram() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('instagram_accounts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instagram_account'] })
      qc.invalidateQueries({ queryKey: ['instagram_account_client'] })
      qc.invalidateQueries({ queryKey: ['scheduled_posts'] })
    },
  })
}
