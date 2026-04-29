import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Note, NoteChecklistItem } from '@/types'

const db = () => (supabase.from('notes') as any)

export function useNotes() {
  return useQuery<Note[]>({
    queryKey: ['notes'],
    queryFn: async () => {
      const { data, error } = await db()
        .select('*')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map((n: any) => ({
        ...n,
        checklist: Array.isArray(n.checklist) ? n.checklist : [],
      }))
    },
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { title: string; content?: string; checklist?: NoteChecklistItem[] }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await db()
        .insert({ user_id: user!.id, ...payload, checklist: payload.checklist ?? [] })
        .select()
        .single()
      if (error) throw error
      return data as Note
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Note> & { id: string }) => {
      const { data, error } = await db()
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Note
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}
