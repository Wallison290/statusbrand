import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { LibraryItem } from '@/types'

export function useLibrary(category?: string) {
  return useQuery({
    queryKey: ['library', category],
    queryFn: async () => {
      let q = supabase
        .from('library')
        .select('*')
        .order('created_at', { ascending: false })
      if (category) q = q.eq('category', category)
      const { data, error } = await q
      if (error) throw error
      return data as LibraryItem[]
    },
  })
}

export function useCreateLibraryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Omit<LibraryItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('library').insert(item).select().single()
      if (error) throw error
      return data as LibraryItem
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['library'] }),
  })
}

export function useDeleteLibraryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('library').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['library'] }),
  })
}
