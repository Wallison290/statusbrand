import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ClipboardList, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WeeklyFormFields, type FormFields } from './WeeklyFormFields'
import { fetchConfigByToken, submitWeeklyFormResponse } from '@/hooks/useWeeklyForm'

type ConfigWithClient = {
  id: string
  client_id: string
  clients: { name: string }
}

type PageState = 'loading' | 'not_found' | 'form' | 'success' | 'error'

export function WeeklyFormPage() {
  const { token } = useParams<{ token: string }>()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [config, setConfig]       = useState<ConfigWithClient | null>(null)
  const [saving, setSaving]       = useState(false)
  const [fields, setFields]       = useState<FormFields>({
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
  })

  useEffect(() => {
    if (!token) { setPageState('not_found'); return }
    fetchConfigByToken(token)
      .then(data => {
        if (!data) { setPageState('not_found'); return }
        setConfig(data as ConfigWithClient)
        setPageState('form')
      })
      .catch(() => setPageState('not_found'))
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
        configId:      config.id,
        clientId:      config.client_id,
        respondentName: fields.respondentName,
        respondentRole: fields.respondentRole,
        qDoubts:       fields.qDoubts,
        qObjections:   fields.qObjections,
        qHighlights:   fields.qHighlights,
        qDemands:      fields.qDemands,
        qCases:        fields.qCases,
        qTrends:       fields.qTrends,
        qFaq:          fields.qFaq,
        qSuggestions:  fields.qSuggestions,
        qImportant:    fields.qImportant,
        isInternal:    false,
      })
      setPageState('success')
    } catch {
      setPageState('error')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  // ── Link inválido ────────────────────────────────────────────────────────────
  if (pageState === 'not_found') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-[18px] font-bold text-[#0f172a] mb-2">Link inválido ou inativo</h1>
          <p className="text-[13px] text-[#64748b]">
            Este formulário não existe ou foi desativado. Entre em contato com a agência.
          </p>
        </div>
      </div>
    )
  }

  // ── Sucesso ──────────────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-[20px] font-bold text-[#0f172a] mb-2">Formulário enviado!</h1>
          <p className="text-[13px] text-[#64748b]">
            Obrigado, <strong>{fields.respondentName}</strong>! Suas respostas foram registradas com sucesso.
            A equipe de marketing já pode visualizá-las.
          </p>
          <Button
            className="mt-6 bg-gradient-to-r from-violet-600 to-purple-600 text-white"
            onClick={() => {
              setPageState('form')
              setFields({
                respondentName: '',
                respondentRole: '',
                qDoubts: '', qObjections: '', qHighlights: '',
                qDemands: '', qCases: '', qTrends: '',
                qFaq: '', qSuggestions: '', qImportant: '',
              })
            }}
          >
            Enviar outro formulário
          </Button>
        </motion.div>
      </div>
    )
  }

  // ── Erro ─────────────────────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-[18px] font-bold text-[#0f172a] mb-2">Erro ao enviar</h1>
          <p className="text-[13px] text-[#64748b] mb-4">
            Ocorreu um erro ao salvar suas respostas. Tente novamente.
          </p>
          <Button onClick={() => setPageState('form')} variant="outline">
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  // ── Formulário ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 mb-4">
            <ClipboardList className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-[22px] font-bold text-[#0f172a]">
            Formulário Semanal de Conteúdo
          </h1>
          {config && (
            <p className="text-[13px] text-[#64748b] mt-1">
              {config.clients.name}
            </p>
          )}
          <p className="text-[12px] text-[#94a3b8] mt-2 max-w-md mx-auto">
            Suas respostas ajudam a criar conteúdos mais alinhados com a realidade do negócio. Preencha com calma — não há resposta errada.
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-sm border border-[#e2e8f0] p-6 space-y-2"
        >
          <WeeklyFormFields fields={fields} onChange={setFields} disabled={saving} />

          <div className="pt-4">
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full h-11 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold text-[14px] rounded-xl"
            >
              {saving ? 'Enviando...' : 'Enviar formulário ✓'}
            </Button>
            <p className="text-center text-[11px] text-[#94a3b8] mt-2">
              Apenas o nome é obrigatório. Os demais campos são opcionais.
            </p>
          </div>
        </motion.div>

        <p className="text-center text-[11px] text-[#c8d4e4] mt-6">
          Powered by KairoHub
        </p>
      </div>
    </div>
  )
}
