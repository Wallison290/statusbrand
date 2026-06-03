// Campos reutilizáveis do formulário semanal
// Usado tanto na aba interna quanto na página pública

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DEFAULT_QUESTIONS } from '@/hooks/useWeeklyForm'
import type { QuestionConfig } from '@/hooks/useWeeklyForm'

export interface FormFields {
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
}

interface Props {
  fields: FormFields
  onChange: (fields: FormFields) => void
  disabled?: boolean
  /** Perguntas a exibir. Se omitido usa DEFAULT_QUESTIONS filtrado por enabled. */
  questions?: QuestionConfig[]
}

export function WeeklyFormFields({ fields, onChange, disabled, questions }: Props) {
  const set = (key: keyof FormFields, value: string) =>
    onChange({ ...fields, [key]: value })

  // Usa as perguntas passadas ou os defaults habilitados
  const activeQuestions = (questions ?? DEFAULT_QUESTIONS).filter(q => q.enabled)

  // Numera as seções dinamicamente (seção 1 = identificação, a partir de 2)
  return (
    <div className="space-y-5">
      {/* Seção 1 — Identificação */}
      <div className="p-4 rounded-2xl border border-[#e2e8f0] bg-[#fafbfc] space-y-3">
        <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider flex items-center gap-1.5">
          <span>👤</span> 1. Identificação
        </p>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="text-[11px] font-medium text-[#64748b] block mb-1">
              Nome do colaborador/Cliente <span className="text-red-500">*</span>
            </label>
            <Input
              value={fields.respondentName}
              onChange={e => set('respondentName', e.target.value)}
              placeholder="Seu nome completo"
              disabled={disabled}
              className="h-9 text-[13px]"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-[#64748b] block mb-1">
              Cargo / Setor
            </label>
            <Input
              value={fields.respondentRole}
              onChange={e => set('respondentRole', e.target.value)}
              placeholder="Ex: Atendimento, Vendas, Gestão..."
              disabled={disabled}
              className="h-9 text-[13px]"
            />
          </div>
        </div>
      </div>

      {/* Seções dinâmicas */}
      {activeQuestions.map(({ key, emoji, title, question, placeholder }, idx) => (
        <div key={key} className="p-4 rounded-2xl border border-[#e2e8f0] space-y-2">
          <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider flex items-center gap-1.5">
            <span>{emoji}</span> {idx + 2}. {title}
          </p>
          <p className="text-[12px] text-[#0f172a]">{question}</p>
          <Textarea
            value={fields[key] as string}
            onChange={e => set(key, e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            rows={3}
            className="text-[13px] resize-none"
          />
        </div>
      ))}
    </div>
  )
}
