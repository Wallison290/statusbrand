import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { ClientMaterial } from '@/types'

export function useClientMaterials(clientId: string) {
  return useQuery({
    queryKey: ['client-materials', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_materials')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ClientMaterial[]
    },
    enabled: !!clientId,
  })
}

export function useAddMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (mat: Omit<ClientMaterial, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('client_materials')
        .insert(mat)
        .select()
        .single()
      if (error) throw error
      return data as ClientMaterial
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['client-materials', data.client_id] })
    },
  })
}

export function useUpdateMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      clientId,
      ...fields
    }: Partial<Omit<ClientMaterial, 'id' | 'client_id' | 'user_id' | 'created_at' | 'updated_at'>> & {
      id: string
      clientId: string
    }) => {
      const { data, error } = await supabase
        .from('client_materials')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as ClientMaterial
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['client-materials', vars.clientId] })
    },
  })
}

export function useDeleteMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      clientId,
      fileUrl,
    }: {
      id: string
      clientId: string
      fileUrl: string | null
    }) => {
      if (fileUrl) {
        const path = extractMaterialStoragePath(fileUrl)
        if (path) await supabase.storage.from('client-materials').remove([path])
      }
      const { error } = await supabase.from('client_materials').delete().eq('id', id)
      if (error) throw error
      return clientId
    },
    onSuccess: (clientId) => {
      qc.invalidateQueries({ queryKey: ['client-materials', clientId] })
    },
  })
}

function extractMaterialStoragePath(url: string): string | null {
  const marker = '/client-materials/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}
