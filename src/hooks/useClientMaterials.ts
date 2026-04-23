import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { ClientMaterial, ClientMaterialWithClient } from '@/types'

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

// Todos os materiais (opcionalmente filtrados por cliente) — para a aba Biblioteca
export function useAllClientMaterials(clientId?: string) {
  return useQuery({
    queryKey: ['client-materials-all', clientId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('client_materials')
        .select('*, client:clients(id, company_name)')
        .order('folder_name', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: false })
      if (clientId) query = (query as any).eq('client_id', clientId)
      const { data, error } = await query
      if (error) throw error
      return data as ClientMaterialWithClient[]
    },
  })
}

export function useAddMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (mat: Omit<ClientMaterial, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('client_materials')
        .insert(mat as any)
        .select()
        .single()
      if (error) throw error
      return data as ClientMaterial
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['client-materials', data.client_id] })
      qc.invalidateQueries({ queryKey: ['client-materials-all'] })
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
        .update({ ...fields, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as ClientMaterial
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['client-materials', vars.clientId] })
      qc.invalidateQueries({ queryKey: ['client-materials-all'] })
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
      qc.invalidateQueries({ queryKey: ['client-materials-all'] })
    },
  })
}

function extractMaterialStoragePath(url: string): string | null {
  const marker = '/client-materials/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}
