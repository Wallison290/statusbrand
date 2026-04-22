import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Content } from '@/types'

export function useContents(clientId?: string) {
  return useQuery({
    queryKey: ['contents', clientId],
    queryFn: async () => {
      let q = supabase
        .from('contents')
        .select('*, client:clients(id,company_name,niche)')
        .order('created_at', { ascending: false })
      if (clientId) q = q.eq('client_id', clientId)
      const { data, error } = await q
      if (error) throw error
      return data as Content[]
    },
  })
}

export function useContent(id: string) {
  return useQuery({
    queryKey: ['contents', 'single', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contents')
        .select('*, client:clients(id,company_name,niche)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Content
    },
    enabled: !!id,
  })
}

export function useSaveContent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (content: Omit<Content, 'id' | 'created_at' | 'updated_at' | 'client'>) => {
      const { data, error } = await supabase.from('contents').insert(content).select().single()
      if (error) throw error
      return data as Content
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contents'] }),
  })
}

export function useUpdateContent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Content> & { id: string }) => {
      const { data, error } = await supabase
        .from('contents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Content
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contents'] }),
  })
}

export function useDeleteContent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contents').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contents'] }),
  })
}
