import { useState, useRef, useEffect } from 'react'
import OpenAI from 'openai'
import { Sparkles, X, Copy, Save, Loader2, ChevronDown, Check } from 'lucide-react'
import { AI_SQUADS } from '@/data/aiSquads'
import { useClientContext } from '@/hooks/useAIContext'
import { useUpdatePlannerItem } from '@/hooks/usePlanner'
import { useToast } from '@/components/ui/toast'
import type { PlannerItem, ContentType } from '@/types'

// ── Cliente OpenAI (mesma instância do useAI.ts) ───────────────────────────────
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY ?? '',
  dangerouslyAllowBrowser: true,
})

// ── System prompt base (mesma do useAI.ts) ────────────────────────────────────
const SYSTEM_PROMPT = `Você é um assistente de IA especializado em Social Media e Marketing Digital, integrado ao sistema StatusBrand.
Responda sempre em português brasileiro. Seja direto, objetivo e orientado a resultados práticos.
Data atual: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`

// ── Squad usado: Fábrica de Conteúdo ─────────────────────────────────────────
const fabricaSquad = AI_SQUADS.find(s => s.id === 'fabrica-conteudo')

// ── Modos de geração por tipo de conteúdo ────────────────────────────────────
const MODES: Record<string, { label: string; prompt: string }[]> = {
  post: [
    { label: 'Legenda completa', prompt: 'Escreva uma legenda completa para Instagram com gancho, desenvolvimento do tema, CTA claro e 5 hashtags relevantes.' },
    { label: 'Copy de venda', prompt: 'Escreva uma copy persuasiva para este post com gatilho mental, proposta de valor e CTA forte.' },
    { label: 'Versão curta', prompt: 'Escreva uma versão curta e direta da legenda (máximo 3 linhas) com CTA.' },
  ],
  carrossel: [
    { label: 'Textos dos slides', prompt: 'Crie os textos para os slides deste carrossel: slide 1 (capa chamativa), slides 2-5 (conteúdo principal), slide 6 (CTA). Seja conciso em cada slide.' },
    { label: 'Roteiro visual', prompt: 'Crie um roteiro completo do carrossel com descrição visual + texto de cada slide, incluindo sugestão de cores e elementos visuais.' },
    { label: 'Legenda do post', prompt: 'Escreva a legenda que acompanha este carrossel no feed, com gancho para aumentar os slides visualizados e CTA.' },
  ],
  reels: [
    { label: 'Roteiro completo', prompt: 'Escreva um roteiro de Reels com: gancho nos 3 primeiros segundos (fala + ação visual), desenvolvimento em tópicos rápidos, e CTA final. Indique os cortes e transições.' },
    { label: 'Gancho + Roteiro', prompt: 'Crie 3 opções de gancho para os primeiros 3 segundos deste Reels e depois desenvolva o roteiro completo com o melhor gancho.' },
    { label: 'Legenda + hashtags', prompt: 'Escreva a legenda do Reels com frase de impacto, descrição breve e 10 hashtags estratégicas para alcance.' },
  ],
  story: [
    { label: 'Sequência de stories', prompt: 'Crie uma sequência de 5 stories: story 1 (abertura/gancho), stories 2-4 (desenvolvimento), story 5 (CTA com chamada para ação). Inclua sugestão de sticker/interação.' },
    { label: 'Story único', prompt: 'Escreva o texto de um story impactante sobre este tema com chamada para ação.' },
    { label: 'Enquete/Interativo', prompt: 'Crie uma sequência de stories interativos com enquete, caixinha de perguntas ou quiz relacionado a este tema.' },
  ],
  educativo: [
    { label: 'Post educativo', prompt: 'Escreva um post educativo com título chamativo, 5 tópicos principais (cada um com emoji), conclusão e CTA para salvar/compartilhar.' },
    { label: 'Formato "Sabia que?"', prompt: 'Escreva no formato "Você sabia que..." com 3 fatos surpreendentes sobre este tema e CTA.' },
    { label: 'Dicas práticas', prompt: 'Escreva "X dicas práticas sobre [tema]" com cada dica numerada e explicada de forma rápida.' },
  ],
  venda: [
    { label: 'Copy de oferta', prompt: 'Escreva uma copy de venda direta com: problema do cliente → solução → benefícios → oferta → CTA urgente.' },
    { label: 'Storytelling + venda', prompt: 'Escreva usando storytelling: história de transformação (antes/depois) levando ao produto/serviço com CTA.' },
    { label: 'Post de resultado', prompt: 'Escreva um post de prova social com resultado de cliente, depoimento fictício editável e CTA para contato.' },
  ],
  autoridade: [
    { label: 'Post de opinião', prompt: 'Escreva um post de posicionamento de autoridade com opinião forte sobre o nicho, argumentação e CTA para debate nos comentários.' },
    { label: 'Bastidores', prompt: 'Escreva um post de bastidores mostrando processo, rotina ou expertise de forma autêntica.' },
    { label: 'Conquista/Marco', prompt: 'Escreva um post comemorando uma conquista ou marco importante de forma autêntica com aprendizado compartilhado.' },
  ],
  engajamento: [
    { label: 'Pergunta engajadora', prompt: 'Escreva um post com pergunta poderosa que gere debate nos comentários, com contexto e CTA para responder.' },
    { label: 'Essa ou essa?', prompt: 'Escreva um post "A ou B?" com duas opções relacionadas ao nicho para gerar comentários.' },
    { label: 'Completar a frase', prompt: 'Crie uma dinâmica de "Complete a frase:" relacionada ao nicho do cliente para engajamento nos comentários.' },
  ],
}

// Fallback para tipos sem mapeamento específico
const DEFAULT_MODES = [
  { label: 'Legenda completa', prompt: 'Escreva uma legenda completa para Instagram com gancho, desenvolvimento do tema, CTA claro e 5 hashtags relevantes.' },
  { label: 'Copy curta', prompt: 'Escreva uma versão curta e direta (máximo 3 linhas) com CTA.' },
  { label: 'Variação criativa', prompt: 'Escreva uma abordagem criativa e diferente para este conteúdo que se destaque no feed.' },
]

function getModesForType(contentType: string) {
  return MODES[contentType] ?? DEFAULT_MODES
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface PlannerAIDrawerProps {
  item: PlannerItem
  onClose: () => void
}

// ── Componente ────────────────────────────────────────────────────────────────
export function PlannerAIDrawer({ item, onClose }: PlannerAIDrawerProps) {
  const { data: clientCtx } = useClientContext(item.client_id ?? null)
  const updateItem = useUpdatePlannerItem()
  const { toast } = useToast()

  const modes = getModesForType(item.content_type as ContentType)
  const [selectedMode, setSelectedMode] = useState(0)
  const [result, setResult] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [modeOpen, setModeOpen] = useState(false)
  const abortRef = useRef(false)

  // Gera automaticamente ao abrir
  useEffect(() => {
    handleGenerate(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGenerate = async (modeIndex: number) => {
    setSelectedMode(modeIndex)
    setResult('')
    setIsGenerating(true)
    setSaved(false)
    abortRef.current = false

    // Monta system prompt: base + Fábrica de Conteúdo + contexto do cliente
    const systemParts = [SYSTEM_PROMPT]
    if (fabricaSquad) systemParts.push(fabricaSquad.systemPrompt)
    if (clientCtx?.contextString) systemParts.push(clientCtx.contextString)
    const systemContent = systemParts.join('\n\n')

    // Monta user prompt com dados do item
    const contentTypeLabel = item.content_type ?? 'post'
    const dateLabel = item.scheduled_date
      ? new Date(item.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
      : ''
    const clientLabel = clientCtx?.client?.company_name ?? item.client?.company_name ?? ''
    const modePrompt = modes[modeIndex].prompt

    const userMessage = [
      `Post: "${item.title}"`,
      `Formato: ${contentTypeLabel}`,
      dateLabel ? `Data: ${dateLabel}` : '',
      clientLabel ? `Cliente: ${clientLabel}` : '',
      item.notes ? `Briefing/notas existentes: ${item.notes}` : '',
      '',
      modePrompt,
    ].filter(Boolean).join('\n')

    try {
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userMessage },
        ],
        stream: true,
        max_tokens: 1500,
      })

      let full = ''
      for await (const chunk of stream) {
        if (abortRef.current) break
        const delta = chunk.choices[0]?.delta?.content ?? ''
        if (delta) {
          full += delta
          setResult(full)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setResult(`❌ Erro: ${msg}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    if (!result) return
    try {
      await updateItem.mutateAsync({ id: item.id, notes: result })
      setSaved(true)
      toast('Conteúdo salvo no post!', 'success')
      setTimeout(() => setSaved(false), 2000)
    } catch {
      toast('Erro ao salvar. Tente novamente.', 'error')
    }
  }

  const handleStop = () => {
    abortRef.current = true
    setIsGenerating(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end pointer-events-none">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 pointer-events-auto"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-[480px] bg-[#0f0f0f] flex flex-col pointer-events-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-[12px] font-semibold text-white/80 uppercase tracking-wide">IA Copilot</span>
              {fabricaSquad && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-medium">
                  {fabricaSquad.emoji} {fabricaSquad.name}
                </span>
              )}
            </div>
            <p className="text-[14px] font-semibold text-white truncate">{item.title}</p>
            <p className="text-[11px] text-white/40 mt-0.5">
              {item.content_type}
              {clientCtx?.client && ` · ${clientCtx.client.company_name}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors flex-shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Seletor de modo */}
        <div className="px-5 py-3 border-b border-white/8 flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setModeOpen(o => !o)}
              disabled={isGenerating}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[12px] text-white/80 hover:bg-white/8 transition-colors disabled:opacity-40"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#8b5cf6]" />
                <span className="font-medium">{modes[selectedMode].label}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform ${modeOpen ? 'rotate-180' : ''}`} />
            </button>

            {modeOpen && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-[#1a1a1a] border border-white/15 rounded-xl overflow-hidden z-10 shadow-xl">
                {modes.map((mode, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setModeOpen(false); handleGenerate(idx) }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-[12px] transition-colors hover:bg-white/5 ${
                      selectedMode === idx ? 'text-[#8b5cf6] bg-[#8b5cf6]/10' : 'text-white/70'
                    }`}
                  >
                    {selectedMode === idx && <div className="w-1 h-1 rounded-full bg-[#8b5cf6]" />}
                    {selectedMode !== idx && <div className="w-1 h-1 rounded-full bg-transparent" />}
                    {mode.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conteúdo gerado */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isGenerating && !result && (
            <div className="flex items-center gap-3 py-8 justify-center">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[13px] text-white/50">Gerando conteúdo…</span>
            </div>
          )}

          {result && (
            <div className="relative">
              <pre className="text-[13px] text-white/85 leading-relaxed whitespace-pre-wrap font-sans">
                {result}
                {isGenerating && (
                  <span className="inline-block w-0.5 h-4 bg-[#8b5cf6] animate-pulse ml-0.5 align-middle" />
                )}
              </pre>
            </div>
          )}
        </div>

        {/* Rodapé com ações */}
        <div className="border-t border-white/10 px-5 py-4 flex-shrink-0 space-y-3">

          {/* Gerar novamente */}
          <button
            onClick={() => handleGenerate(selectedMode)}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/15 text-[13px] text-white/70 hover:bg-white/5 hover:text-white transition-all disabled:opacity-40"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Gerando…</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleStop() }}
                  className="ml-2 text-red-400 hover:text-red-300 text-[11px]"
                >
                  parar
                </button>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gerar novamente</span>
              </>
            )}
          </button>

          {/* Copiar + Salvar no post */}
          {result && !isGenerating && (
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/15 text-[13px] text-white/70 hover:bg-white/5 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>

              <button
                onClick={handleSave}
                disabled={updateItem.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#6366f1] hover:bg-[#5558e3] text-white text-[13px] font-medium transition-all disabled:opacity-50"
              >
                {updateItem.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : saved
                    ? <Check className="w-3.5 h-3.5" />
                    : <Save className="w-3.5 h-3.5" />}
                <span>{saved ? 'Salvo!' : 'Salvar no post'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
