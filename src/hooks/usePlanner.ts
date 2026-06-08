import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { PlannerItem } from '@/types'

// ── Realtime: invalida o cache do planner quando qualquer row mudar ─────────────
// Isso garante que quando o CLIENTE aprova/rejeita, a agência vê na hora.
function usePlannerRealtime(clientId?: string) {
  const qc = useQueryClient()
  useEffect(() => {
    const channel = supabase
      .channel(`planner-rt-${clientId ?? 'all'}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'planner' },
        () => { qc.invalidateQueries({ queryKey: ['planner'] }) }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clientId, qc])
}

export function usePlanner(clientId?: string) {
  // Subscription em tempo real — qualquer UPDATE no banco atualiza a agência
  usePlannerRealtime(clientId)

  return useQuery({
    queryKey: ['planner', clientId],
    staleTime: 10_000,          // considera dado "novo" por 10s
    refetchInterval: 30_000,    // polling a cada 30s como fallback
    queryFn: async () => {
      let q = supabase
        .from('planner')
        .select('*, client:clients(id,company_name), attachments:planner_attachments(id,file_name,file_type,file_url,file_size,sort_order,is_ig_media,created_at), links:planner_links(id,url,label,created_at)')
        .order('scheduled_date', { ascending: true })
        // Garante que os anexos venham na ordem dos slides (sort_order)
        .order('sort_order', { referencedTable: 'planner_attachments', ascending: true })
      if (clientId) q = q.eq('client_id', clientId)
      const { data, error } = await q
      if (error) throw error
      return data as PlannerItem[]
    },
  })
}

export function useCreatePlannerItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Omit<PlannerItem, 'id' | 'created_at' | 'updated_at' | 'client'>) => {
      const { data, error } = await supabase.from('planner').insert(item as any).select().single()
      if (error) throw error
      return data as PlannerItem
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planner'] }),
  })
}

export function useUpdatePlannerItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlannerItem> & { id: string }) => {
      const patch: any = { ...updates, updated_at: new Date().toISOString() }

      // Quando a agência marca o conteúdo como "publicado", consideramos que ele
      // já foi aprovado pelo cliente (muitos aprovam por WhatsApp / fora do sistema).
      // Isso atualiza também o acesso do cliente, que deixa de mostrar "pendente
      // de aprovação". Não setamos reviewed_by, então o trigger do banco NÃO dispara
      // a notificação falsa de "aprovado pelo cliente".
      if (updates.status === 'publicado') {
        patch.approval_status = 'aprovado'
        if (patch.art_approval_status == null || patch.art_approval_status === 'pendente_aprovacao') {
          patch.art_approval_status = 'aprovado'
        }
        if (patch.copy_approval_status == null || patch.copy_approval_status === 'pendente_aprovacao') {
          patch.copy_approval_status = 'aprovado'
        }
      }

      const { data, error } = await supabase
        .from('planner')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as PlannerItem
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planner'] }),
  })
}

export function useDeletePlannerItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('planner').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planner'] }),
  })
}
