import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WeeklyFormConfig {
  id: string
  client_id: string
  user_id: string
  day_of_week: number          // 0=Dom 1=Seg … 6=Sáb
  is_active: boolean
  public_token: string
  created_at: string
  updated_at: string
}

export interface WeeklyFormResponse {
  id: string
  config_id: string
  client_id: string
  week_reference: string       // YYYY-MM-DD (segunda da semana)
  respondent_name: string
  respondent_role: string
  q_doubts: string | null
  q_objections: string | null
  q_highlights: string | null
  q_demands: string | null
  q_cases: string | null
  q_trends: string | null
  q_faq: string | null
  q_suggestions: string | null
  q_important: string | null
  is_internal: boolean
  user_id: string | null
  created_at: string
}

// ── Config hooks ──────────────────────────────────────────────────────────────

export function useWeeklyFormConfig(clientId: string) {
  return useQuery({
    queryKey: ['weekly-form-config', clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('weekly_form_configs')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle()
      if (error) throw error
      return data as WeeklyFormConfig | null
    },
    enabled: !!clientId,
  })
}

export function useUpsertWeeklyFormConfig() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (payload: {
      clientId: string
      dayOfWeek: number
      isActive: boolean
      existingId?: string
    }) => {
      if (payload.existingId) {
        const { data, error } = await (supabase as any)
          .from('weekly_form_configs')
          .update({
            day_of_week: payload.dayOfWeek,
            is_active: payload.isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payload.existingId)
          .select()
          .single()
        if (error) throw error
        return data as WeeklyFormConfig
      } else {
        const { data, error } = await (supabase as any)
          .from('weekly_form_configs')
          .insert({
            client_id: payload.clientId,
            user_id: user!.id,
            day_of_week: payload.dayOfWeek,
            is_active: payload.isActive,
          })
          .select()
          .single()
        if (error) throw error
        return data as WeeklyFormConfig
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['weekly-form-config', vars.clientId] })
    },
  })
}

// ── Responses hooks ───────────────────────────────────────────────────────────

export function useWeeklyFormResponses(clientId: string) {
  return useQuery({
    queryKey: ['weekly-form-responses', clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('weekly_form_responses')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as WeeklyFormResponse[]
    },
    enabled: !!clientId,
    refetchInterval: 60_000,
  })
}

// ── Submit response (usado tanto interno quanto público) ──────────────────────

export interface SubmitFormPayload {
  configId: string
  clientId: string
  respondentName: string
  respondentRole: string
  qDoubts: string
  qObjections: string
  qHighlights: string
  qDemands: string
  qCases: string
  qTrends: string
  qFaq: string
  qSuggestions: string
  qImportant: string
  isInternal: boolean
  userId?: string
}

export async function submitWeeklyFormResponse(payload: SubmitFormPayload) {
  const monday = getMonday(new Date())

  const { data, error } = await (supabase as any)
    .from('weekly_form_responses')
    .insert({
      config_id:       payload.configId,
      client_id:       payload.clientId,
      week_reference:  monday,
      respondent_name: payload.respondentName,
      respondent_role: payload.respondentRole,
      q_doubts:        payload.qDoubts       || null,
      q_objections:    payload.qObjections   || null,
      q_highlights:    payload.qHighlights   || null,
      q_demands:       payload.qDemands      || null,
      q_cases:         payload.qCases        || null,
      q_trends:        payload.qTrends       || null,
      q_faq:           payload.qFaq          || null,
      q_suggestions:   payload.qSuggestions  || null,
      q_important:     payload.qImportant    || null,
      is_internal:     payload.isInternal,
      user_id:         payload.userId        || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as WeeklyFormResponse
}

// ── Config by public token (sem auth) ────────────────────────────────────────

export async function fetchConfigByToken(token: string) {
  const { data, error } = await (supabase as any)
    .from('weekly_form_configs')
    .select('*, clients(name)')
    .eq('public_token', token)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw error
  return data as (WeeklyFormConfig & { clients: { name: string } }) | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMonday(d: Date): string {
  const date = new Date(d)
  const day  = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return date.toISOString().slice(0, 10)
}

export const DAY_LABELS = [
  'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado',
]
