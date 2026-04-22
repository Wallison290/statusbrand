import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { ClientSupportContact } from '@/types'

export function useClientSupportContacts(clientId: string) {
  return useQuery({
    queryKey: ['client-support', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_support_contacts')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as ClientSupportContact[]
    },
    enabled: !!clientId,
  })
}

export function useAddSupportContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (contact: Omit<ClientSupportContact, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('client_support_contacts')
        .insert(contact)
        .select()
        .single()
      if (error) throw error
      return data as ClientSupportContact
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['client-support', data.client_id] })
    },
  })
}

export function useUpdateSupportContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      clientId,
      ...fields
    }: Partial<Omit<ClientSupportContact, 'id' | 'client_id' | 'user_id' | 'created_at'>> & {
      id: string
      clientId: string
    }) => {
      const { data, error } = await supabase
        .from('client_support_contacts')
        .update(fields)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as ClientSupportContact
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['client-support', vars.clientId] })
    },
  })
}

export function useDeleteSupportContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_support_contacts')
        .delete()
        .eq('id', id)
      if (error) throw error
      return clientId
    },
    onSuccess: (clientId) => {
      qc.invalidateQueries({ queryKey: ['client-support', clientId] })
    },
  })
}
