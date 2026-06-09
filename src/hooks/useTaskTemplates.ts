import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { offsetToDate } from '@/utils/businessDays'

// ── Tipos ──────────────────────────────────────────────────────────────────────
export interface TaskTemplate {
  id:          string
  user_id:     string | null
  name:        string
  description: string | null
  category:    string
  emoji:       string | null
  is_system:   boolean
  item_count?: number
}

export interface TaskTemplateItem {
  id:              string
  template_id:     string
  position:        number
  title:           string
  description:     string | null
  priority:        'baixa' | 'media' | 'alta' | 'urgente'
  tags:            string[]
  due_offset_days: number | null
  is_recurring:    boolean
  squad_id:        string | null
}

// ── Leitura ─────────────────────────────────────────────────────────────────────
export function useTaskTemplates() {
  return useQuery<TaskTemplate[]>({
    queryKey: ['task_templates'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('task_templates')
        .select('*, task_template_items(count)')
        .order('is_system', { ascending: false })
        .order('name')
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((t: any) => ({ ...t, item_count: t.task_template_items?.[0]?.count ?? 0 }))
    },
  })
}

export function useTaskTemplateItems(templateId: string | null) {
  return useQuery<TaskTemplateItem[]>({
    queryKey: ['task_template_items', templateId],
    enabled:  !!templateId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('task_template_items')
        .select('*')
        .eq('template_id', templateId)
        .order('position')
      if (error) throw error
      return data ?? []
    },
  })
}

// ── Aplicação (cria as tarefas no kanban) ───────────────────────────────────────
export interface ApplyTemplateInput {
  templateId:   string
  templateName: string
  clientId:     string | null
  assignee:     string | null
  assigneeId:   string | null
  startDate:    string              // yyyy-MM-dd
  mode:         'separate' | 'checklist'
}

export function useApplyTaskTemplate() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (input: ApplyTemplateInput): Promise<number> => {
      if (!user) throw new Error('Não autenticado')

      const { data: items, error } = await (supabase as any)
        .from('task_template_items')
        .select('*')
        .eq('template_id', input.templateId)
        .order('position')
      if (error) throw error
      const list = (items ?? []) as TaskTemplateItem[]
      if (list.length === 0) throw new Error('Modelo sem tarefas')

      // Modo: 1 tarefa com checklist (itens viram checklist em markdown na descrição)
      if (input.mode === 'checklist') {
        const checklist = list.map(it => `- [ ] ${it.title}`).join('\n')
        const { error: e2 } = await (supabase as any).from('tasks').insert({
          user_id: user.id, client_id: input.clientId,
          title: input.templateName, description: checklist,
          due_date: null, due_time: null,
          priority: 'media', status: 'a_fazer',
          assignee: input.assignee, assignee_id: input.assigneeId, tags: [],
        })
        if (e2) throw e2
        return 1
      }

      // Modo: tarefas separadas (uma por item, com prazo em dias úteis)
      const rows = list.map(it => ({
        user_id:     user.id,
        client_id:   input.clientId,
        title:       it.title,
        description: it.description,
        due_date:    it.is_recurring ? null : offsetToDate(input.startDate, it.due_offset_days),
        due_time:    null,
        priority:    it.priority,
        status:      'a_fazer',
        assignee:    input.assignee,
        assignee_id: input.assigneeId,
        tags:        it.tags ?? [],
      }))
      const { error: e3 } = await (supabase as any).from('tasks').insert(rows)
      if (e3) throw e3
      return rows.length
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['team_tasks'] })
    },
  })
}
