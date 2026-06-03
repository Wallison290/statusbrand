// Campos reutilizáveis do formulário semanal
// Usado tanto na aba interna quanto na página pública

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

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
}

const SECTIONS = [
  {
    key: 'qDoubts' as keyof FormFields,
    number: 2,
    emoji: '❓',
    title: 'Principais dúvidas recebidas na semana',
    question: 'Quais dúvidas os clientes mais fizeram nesta semana?',
    placeholder: 'Descreva as dúvidas mais frequentes que você recebeu...',
  },
  {
    key: 'qObjections' as keyof FormFields,
    number: 3,
    emoji: '🛑',
    title: 'Objeções encontradas',
    question: 'Houve alguma objeção recorrente durante atendimentos ou vendas?',
    placeholder: 'Ex: preço, prazo, confiança, comparação com concorrentes...',
  },
  {
    key: 'qHighlights' as keyof FormFields,
    number: 4,
    emoji: '🌟',
    title: 'Temas que merecem destaque',
    question: 'Existe algum serviço, produto ou solução que precisa receber mais visibilidade?',
    placeholder: 'Descreva o que precisa ser mais divulgado ou destacado...',
  },
  {
    key: 'qDemands' as keyof FormFields,
    number: 5,
    emoji: '📋',
    title: 'Demandas do setor',
    question: 'Seu setor identificou alguma necessidade de comunicação ou conteúdo?',
    placeholder: 'Ex: explicar um processo, divulgar um serviço, corrigir informações, educar clientes...',
  },
  {
    key: 'qCases' as keyof FormFields,
    number: 6,
    emoji: '💼',
    title: 'Casos e experiências da semana',
    question: 'Houve algum caso interessante, resultado ou situação que possa virar conteúdo?',
    placeholder: 'Conte um caso de atendimento, resultado alcançado ou situação relevante...',
  },
  {
    key: 'qTrends' as keyof FormFields,
    number: 7,
    emoji: '📈',
    title: 'Tendências percebidas',
    question: 'Você percebeu alguma tendência ou assunto muito comentado pelos clientes?',
    placeholder: 'Descreva comportamentos, temas em alta ou padrões que você percebeu...',
  },
  {
    key: 'qFaq' as keyof FormFields,
    number: 8,
    emoji: '🔁',
    title: 'Perguntas Frequentes (FAQ)',
    question: 'Quais perguntas foram feitas repetidamente nesta semana?',
    placeholder: 'Liste as perguntas que você mais ouviu dos clientes...',
  },
  {
    key: 'qSuggestions' as keyof FormFields,
    number: 9,
    emoji: '💡',
    title: 'Sugestões de conteúdo',
    question: 'Existe algum conteúdo que você acredita que deveríamos produzir?',
    placeholder: 'Sugira temas, formatos, ideias de posts, vídeos ou outros conteúdos...',
  },
  {
    key: 'qImportant' as keyof FormFields,
    number: 10,
    emoji: '🔒',
    title: 'Informações importantes',
    question: 'Existe alguma informação estratégica que a equipe de marketing precisa saber?',
    placeholder: 'Compartilhe qualquer informação relevante que impacte a comunicação...',
  },
]

export function WeeklyFormFields({ fields, onChange, disabled }: Props) {
  const set = (key: keyof FormFields, value: string) =>
    onChange({ ...fields, [key]: value })

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
              Nome do colaborador <span className="text-red-500">*</span>
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

      {/* Seções 2–10 */}
      {SECTIONS.map(({ key, number, emoji, title, question, placeholder }) => (
        <div key={key} className="p-4 rounded-2xl border border-[#e2e8f0] space-y-2">
          <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider flex items-center gap-1.5">
            <span>{emoji}</span> {number}. {title}
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
