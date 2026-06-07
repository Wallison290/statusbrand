// Campos reutilizáveis do formulário semanal
// Usado tanto na aba interna (dark) quanto na página pública (clara)

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
  /** Tema claro (página pública). Padrão = dark (aba interna). */
  light?: boolean
}

// ── Campos claros locais (usados quando light = true) ─────────────────────────
function LightInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full h-9 px-3 rounded-xl border border-[#e2e8f0] bg-white text-[13px] text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#29457a]/20 focus:border-[#29457a]/50 transition-colors disabled:opacity-60"
    />
  )
}
function LightTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] bg-white text-[13px] text-[#0f172a] placeholder:text-[#94a3b8] resize-none focus:outline-none focus:ring-2 focus:ring-[#29457a]/20 focus:border-[#29457a]/50 transition-colors disabled:opacity-60"
    />
  )
}

export function WeeklyFormFields({ fields, onChange, disabled, questions, light }: Props) {
  const set = (key: keyof FormFields, value: string) =>
    onChange({ ...fields, [key]: value })

  // Usa as perguntas passadas ou os defaults habilitados
  const activeQuestions = (questions ?? DEFAULT_QUESTIONS).filter(q => q.enabled)

  // Estilos condicionais por tema
  const sectionCls = light
    ? 'p-4 rounded-2xl border border-[#e2e8f0] bg-[#fafbfc] space-y-3'
    : 'p-4 rounded-2xl border border-[#1e293b] bg-[#182233] space-y-3'
  const sectionPlainCls = light
    ? 'p-4 rounded-2xl border border-[#e2e8f0] space-y-2'
    : 'p-4 rounded-2xl border border-[#1e293b] bg-[#182233] space-y-2'
  const headingCls = light
    ? 'text-[12px] font-bold text-[#64748b] uppercase tracking-wider flex items-center gap-1.5'
    : 'text-[12px] font-bold text-[#94a3b8] uppercase tracking-wider flex items-center gap-1.5'
  const labelCls = light
    ? 'text-[11px] font-medium text-[#64748b] block mb-1'
    : 'text-[11px] font-medium text-[#94a3b8] block mb-1'
  const questionCls = light ? 'text-[12px] text-[#0f172a]' : 'text-[12px] text-[#CBD5E1]'

  return (
    <div className="space-y-5">
      {/* Seção 1 — Identificação */}
      <div className={sectionCls}>
        <p className={headingCls}>
          <span>👤</span> 1. Identificação
        </p>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className={labelCls}>
              Nome do colaborador/Cliente <span className="text-red-500">*</span>
            </label>
            {light ? (
              <LightInput
                value={fields.respondentName}
                onChange={e => set('respondentName', e.target.value)}
                placeholder="Seu nome completo"
                disabled={disabled}
              />
            ) : (
              <Input
                value={fields.respondentName}
                onChange={e => set('respondentName', e.target.value)}
                placeholder="Seu nome completo"
                disabled={disabled}
                className="h-9 text-[13px]"
              />
            )}
          </div>
          <div>
            <label className={labelCls}>Cargo / Setor</label>
            {light ? (
              <LightInput
                value={fields.respondentRole}
                onChange={e => set('respondentRole', e.target.value)}
                placeholder="Ex: Atendimento, Vendas, Gestão..."
                disabled={disabled}
              />
            ) : (
              <Input
                value={fields.respondentRole}
                onChange={e => set('respondentRole', e.target.value)}
                placeholder="Ex: Atendimento, Vendas, Gestão..."
                disabled={disabled}
                className="h-9 text-[13px]"
              />
            )}
          </div>
        </div>
      </div>

      {/* Seções dinâmicas */}
      {activeQuestions.map(({ key, emoji, title, question, placeholder }, idx) => (
        <div key={key} className={sectionPlainCls}>
          <p className={headingCls}>
            <span>{emoji}</span> {idx + 2}. {title}
          </p>
          <p className={questionCls}>{question}</p>
          {light ? (
            <LightTextarea
              value={fields[key] as string}
              onChange={e => set(key, e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              rows={3}
            />
          ) : (
            <Textarea
              value={fields[key] as string}
              onChange={e => set(key, e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              rows={3}
              className="text-[13px] resize-none"
            />
          )}
        </div>
      ))}
    </div>
  )
}
