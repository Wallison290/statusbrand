import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface ClientPayment {
  id: string
  client_id: string
  user_id: string
  amount: number
  payment_date: string
  reference_month: string
  status: 'pago' | 'atrasado'
  notes: string | null
  created_at: string
}

export function useClientPayments(clientId: string | null) {
  return useQuery({
    queryKey: ['client_payments', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_payments')
        .select('*')
        .eq('client_id', clientId!)
        .order('payment_date', { ascending: false })
      if (error) throw error
      return data as ClientPayment[]
    },
    enabled: !!clientId,
  })
}

export function useCreatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      client_id, user_id, amount, payment_date, reference_month, notes,
    }: Omit<ClientPayment, 'id' | 'status' | 'created_at'>) => {
      // 1. Insert payment record
      const { data, error } = await supabase
        .from('client_payments')
        .insert({ client_id, user_id, amount, payment_date, reference_month, notes: notes || null, status: 'pago' })
        .select()
        .single()
      if (error) throw error

      // 2. Update client: last_payment_date, financial_status, clear manual override
      const { error: clientErr } = await supabase
        .from('clients')
        .update({
          last_payment_date: payment_date,
          financial_status: 'ativo',
          manual_status_override: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', client_id)
      if (clientErr) throw clientErr

      return data as ClientPayment
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['client_payments', data.client_id] })
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}
