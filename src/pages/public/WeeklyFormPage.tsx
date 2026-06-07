import { useState, useEffect, Component } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ClipboardList, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WeeklyFormFields, type FormFields } from './WeeklyFormFields'
import { fetchConfigByToken, submitWeeklyFormResponse, resolveQuestions } from '@/hooks/useWeeklyForm'
import type { WeeklyFormConfig } from '@/hooks/useWeeklyForm'

// ── Error Boundary — captura qualquer crash de renderização ───────────────────

interface EBState { error: string | null }

class ErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { error: null }

  static getDerivedStateFromError(e: Error): EBState {
    return { error: e.message || String(e) }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-[18px] font-bold text-[#0f172a] mb-2">Erro ao carregar</h1>
            <p className="text-[11px] text-red-400 font-mono bg-red-50 rounded-lg px-3 py-2 text-left break-all">
              {this.state.error}
            </p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ConfigWithClient = WeeklyFormConfig & {
  clients: { company_name: string } | null
}

type PageState = 'loading' | 'not_found' | 'form' | 'success' | 'error'

const EMPTY_FIELDS: FormFields = {
  respondentName: '',
  respondentRole: '',
  qDoubts:        '',
  qObjections:    '',
  qHighlights:    '',
  qDemands:       '',
  qCases:         '',
  qTrends:        '',
  qFaq:           '',
  qSuggestions:   '',
  qImportant:     '',
}

// ── Página interna ─────────────────────────────────────────────────────────────

function WeeklyFormInner() {
  const { token } = useParams<{ token: string }>()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [config, setConfig]       = useState<ConfigWithClient | null>(null)
  const [errorMsg, setErrorMsg]   = useState<string>('')
  const [saving, setSaving]       = useState(false)
  const [fields, setFields]       = useState<FormFields>(EMPTY_FIELDS)

  useEffect(() => {
    if (!token) {
      setPageState('not_found')
      return
    }
    fetchConfigByToken(token)
      .then(data => {
        if (!data) {
          setPageState('not_found')
          return
        }
        setConfig(data as ConfigWithClient)
        setPageState('form')
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e)
        console.error('[WeeklyForm] fetchConfigByToken:', msg)
        setErrorMsg(msg)
        setPageState('not_found')
      })
  }, [token])

  const handleSubmit = async () => {
    if (!fields.respondentName.trim()) {
      alert('Por favor, informe seu nome.')
      return
    }
    if (!config) return
    setSaving(true)
    try {
      await submitWeeklyFormResponse({
        configId:       config.id,
        clientId:       config.client_id,
        respondentName: fields.respondentName,
        respondentRole: fields.respondentRole,
        qDoubts:        fields.qDoubts,
        qObjections:    fields.qObjections,
        qHighlights:    fields.qHighlights,
        qDemands:       fields.qDemands,
        qCases:         fields.qCases,
        qTrends:        fields.qTrends,
        qFaq:           fields.qFaq,
        qSuggestions:   fields.qSuggestions,
        qImportant:     fields.qImportant,
        isInternal:     false,
      })
      setPageState('success')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setErrorMsg(msg)
      setPageState('error')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#0f0f0f] flex items-center justify-center animate-pulse">
          <ClipboardList className="w-6 h-6 text-white" />
        </div>
        <p className="text-[13px] text-[#94a3b8]">Carregando formulário...</p>
      </div>
    )
  }

  // ── Link inválido / não encontrado ─────────────────────────────────────────
  if (pageState === 'not_found') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
        <div className="text-center max-w-sm w-full">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-[18px] font-bold text-[#0f172a] mb-2">
            Link inválido ou inativo
          </h1>
          <p className="text-[13px] text-[#64748b]">
            Este formulário não existe ou foi desativado. Entre em contato com a agência.
          </p>
          {errorMsg && (
            <p className="mt-4 text-[11px] text-red-400 font-mono bg-red-50 rounded-lg px-3 py-2 text-left break-all">
              Detalhe: {errorMsg}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Sucesso ────────────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm w-full"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-[20px] font-bold text-[#0f172a] mb-2">
            Formulário enviado!
          </h1>
          <p className="text-[13px] text-[#64748b]">
            Obrigado, <strong>{fields.respondentName}</strong>! Suas respostas foram
            registradas com sucesso. A equipe de marketing já pode visualizá-las.
          </p>
          <Button
            className="mt-6 w-full bg-[#0f0f0f] text-white hover:bg-[#1a1a1a]"
            onClick={() => {
              setFields(EMPTY_FIELDS)
              setPageState('form')
            }}
          >
            Enviar outro formulário
          </Button>
        </motion.div>
      </div>
    )
  }

  // ── Erro ao enviar ─────────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
        <div className="text-center max-w-sm w-full">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-[18px] font-bold text-[#0f172a] mb-2">
            Erro ao enviar
          </h1>
          <p className="text-[13px] text-[#64748b] mb-4">
            Ocorreu um erro ao salvar suas respostas. Tente novamente.
          </p>
          {errorMsg && (
            <p className="mb-4 text-[11px] text-red-400 font-mono bg-red-50 rounded-lg px-3 py-2 text-left break-all">
              {errorMsg}
            </p>
          )}
          <Button onClick={() => setPageState('form')} variant="outline" className="w-full">
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  // ── Formulário ─────────────────────────────────────────────────────────────
  const clientName = config?.clients?.company_name || ''

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="w-full max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0f0f0f] mb-4">
            <ClipboardList className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-[20px] font-bold text-[#0f172a]">
            Formulário Semanal de Conteúdo
          </h1>
          {clientName && (
            <p className="text-[13px] text-[#64748b] mt-1">{clientName}</p>
          )}
          <p className="text-[12px] text-[#94a3b8] mt-2">
            Suas respostas ajudam a criar conteúdos mais alinhados com a realidade do negócio.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-4 sm:p-6">
          <WeeklyFormFields
            fields={fields}
            onChange={setFields}
            disabled={saving}
            questions={resolveQuestions(config)}
            light
          />

          <div className="pt-5">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full h-12 rounded-xl bg-[#0f0f0f] text-white font-semibold text-[15px] disabled:opacity-60 transition-opacity active:scale-95"
            >
              {saving ? 'Enviando...' : 'Enviar formulário ✓'}
            </button>
            <p className="text-center text-[11px] text-[#94a3b8] mt-2">
              Apenas o nome é obrigatório. Os demais campos são opcionais.
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#c8d4e4] mt-6 pb-4">
          Powered by KairoHub
        </p>
      </div>
    </div>
  )
}

// ── Export com Error Boundary ──────────────────────────────────────────────────

export function WeeklyFormPage() {
  return (
    <ErrorBoundary>
      <WeeklyFormInner />
    </ErrorBoundary>
  )
}
