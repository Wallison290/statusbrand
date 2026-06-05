import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import type { Task } from '@/types'

export function useTasks(clientId?: string) {
  return useQuery({
    queryKey: ['tasks', clientId],
    queryFn: async () => {
      let q = supabase
        .from('tasks')
        .select('*, client:clients(id,company_name)')
        .order('created_at', { ascending: false })
      if (clientId) q = q.eq('client_id', clientId)
      const { data, error } = await q
      if (error) throw error
      return data as Task[]
    },
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'client'>) => {
      const { data, error } = await (supabase as any).from('tasks').insert(task).select().single()
      if (error) throw error
      return data as Task
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['team_tasks'] })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      // Notifica a agência quando uma tarefa for marcada como concluída
      // (útil quando um colaborador conclui a tarefa)
      if (updates.status === 'concluido' && data?.user_id && data.user_id !== user?.id) {
        try {
          await (supabase as any).from('notifications').insert({
            user_id:   data.user_id,
            client_id: data.client_id ?? null,
            type:      'TASK_DONE',
            title:     'Demanda concluída ✅',
            message:   '"' + (data.title ?? 'Tarefa') + '" foi marcada como concluída.',
            link:      null,
          })
        } catch { /* silencioso */ }
      }

      return data as Task
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['team_tasks'] })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['team_tasks'] })
    },
  })
}
