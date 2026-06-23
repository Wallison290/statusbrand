import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Plus, Trash2, Globe, Loader2, Bot,
  MessageSquare, Square, Sparkles, TrendingUp, FileText,
  Lightbulb, Users, X, Building2, ChevronDown, Brain,
  Mic, MicOff, Paperclip, Download,
  ImageIcon, PanelLeftOpen, PanelLeftClose, Wand2,
} from 'lucide-react'
import { cn } from '@/utils/formatters'
import { supabase } from '@/integrations/supabase/client'
import { useClients } from '@/hooks/useClients'
import { useClientContext, useAIUserMemory, buildUserMemoryContext } from '@/hooks/useAIContext'
import { AIMemoryPanel } from '@/components/ai/AIMemoryPanel'
import { AIUserMemoryPanel } from '@/components/ai/AIUserMemoryPanel'
import { AI_SQUADS, detectSquad, getSquadPhases, getSquadSubAgents, type AISquad } from '@/data/aiSquads'
import { streamChat } from '@/lib/aiProxy'
import { DiagnosticoModal } from './DiagnosticoModal'
import {
  useAISessions,
  useAIMessages,
  useDeleteSession,
  useAIChat,
  type AISession,
  type AIMessage,
} from '@/hooks/useAI'

// ─── Redimensiona e converte imagem para base64 ───────────────────────────────
async function resizeAndEncode(file: File, maxPx = 1024): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    const blobUrl = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        if (width > height) { height = Math.round((height / width) * maxPx); width = maxPx }
        else { width = Math.round((width / height) * maxPx); height = maxPx }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(blobUrl)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.src = blobUrl
  })
}

// ─── Voice input hook ─────────────────────────────────────────────────────────
function useVoiceInput(onTranscript: (t: string) => void) {
  const [isRecording, setIsRecording] = useState(false)
  const [supported, setSupported]     = useState(true)
  const recRef = useRef<any>(null)

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) setSupported(false)
  }, [])

  const toggle = useCallback(() => {
    if (isRecording) {
      recRef.current?.stop()
      setIsRecording(false)
      return
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    recRef.current = r
    r.lang = 'pt-BR'
    r.continuous = false
    r.interimResults = false
    r.onresult = (e: any) => {
      const t = e.results[0]?.[0]?.transcript ?? ''
      if (t) onTranscript(t)
    }
    r.onend  = () => setIsRecording(false)
    r.onerror = () => setIsRecording(false)
    r.start()
    setIsRecording(true)
  }, [isRecording, onTranscript])

  return { isRecording, toggle, supported }
}

// ─── Markdown render ──────────────────────────────────────────────────────────
function parseInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="px-1 py-0.5 rounded text-[11px] font-mono bg-black/5 border border-black/8">{part.slice(1, -1)}</code>
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i} className="italic">{part.slice(1, -1)}</em>
    return part
  })
}

function formatMessage(text: string): JSX.Element[] {
  const lines = text.split('\n')
  const result: JSX.Element[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i++ }
      result.push(
        <div key={i} className="my-3 rounded-xl overflow-hidden border border-black/10">
          {lang && <div className="px-3 py-1 text-[10px] font-mono bg-black/5 text-[#555] border-b border-black/8">{lang}</div>}
          <pre className="p-4 text-[12px] font-mono bg-[#f8f8f8] overflow-x-auto text-[#0f0f0f] leading-relaxed">
            <code>{code.join('\n')}</code>
          </pre>
        </div>
      )
      i++; continue
    }
    if (line.startsWith('### ')) { result.push(<h3 key={i} className="font-semibold text-[14px] mt-4 mb-1">{parseInline(line.slice(4))}</h3>); i++; continue }
    if (line.startsWith('## '))  { result.push(<h2 key={i} className="font-bold text-[15px] mt-5 mb-1.5">{parseInline(line.slice(3))}</h2>); i++; continue }
    if (line.startsWith('# '))   { result.push(<h1 key={i} className="font-bold text-[17px] mt-5 mb-2">{parseInline(line.slice(2))}</h1>); i++; continue }
    if (/^[-•*] /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-•*] /.test(lines[i])) { items.push(lines[i].replace(/^[-•*] /, '')); i++ }
      result.push(
        <ul key={i} className="my-2 space-y-1.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2 text-[13.5px] leading-relaxed">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#888] flex-shrink-0" />
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }
    if (/^\d+\.\s/.test(line)) {
      const items: { num: number; text: string }[] = []
      while (i < lines.length) {
        const m = lines[i].match(/^(\d+)\.\s+(.*)$/)
        if (m) { items.push({ num: parseInt(m[1], 10), text: m[2] }); i++; continue }
        const blank = lines[i].trim() === ''
        // pula linha(s) em branco entre itens numerados (mantém a mesma lista)
        if (blank && /^\d+\.\s/.test(lines[i + 1] ?? '')) { i++; continue }
        if (blank) break
        // linha de continuação do item anterior (texto que quebrou em outra linha)
        if (items.length) { items[items.length - 1].text += ' ' + lines[i].trim(); i++; continue }
        break
      }
      result.push(
        <ol key={i} className="my-2 space-y-1.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2.5 text-[13.5px] leading-relaxed">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#f0f0f0] text-[#555] text-[11px] font-semibold flex items-center justify-center mt-0.5">{item.num}</span>
              <span>{parseInline(item.text)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    }
    if (line === '---') { result.push(<hr key={i} className="my-4 border-[#e0e0e0]" />); i++; continue }
    if (line.trim() === '') { if (result.length > 0) result.push(<div key={i} className="h-2" />); i++; continue }
    result.push(<p key={i} className="text-[13.5px] leading-relaxed">{parseInline(line)}</p>)
    i++
  }
  return result
}

// ─── Detecta e renderiza conteúdo especial: imagens anexadas + geradas ────────
function MessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  const ATTACHED = /\[\[IMG:([\s\S]*?)\]\]/g
  const GENERATED = /\[\[GENERATED_IMAGE:([\s\S]*?)\]\]/g

  // Extrai imagens do usuário
  const userImages: string[] = []
  let cleanContent = content.replace(ATTACHED, (_, url) => { userImages.push(url); return '' }).trim()

  // Extrai imagens geradas pela IA
  const genImages: string[] = []
  cleanContent = cleanContent.replace(GENERATED, (_, url) => { genImages.push(url); return '' }).trim()

  return (
    <div>
      {/* Imagens enviadas pelo usuário */}
      {userImages.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {userImages.map((src, i) => (
            <img
              key={i}
              src={src}
              alt="Imagem enviada"
              className="max-h-48 max-w-[280px] rounded-xl object-cover border border-white/20"
            />
          ))}
        </div>
      )}

      {/* Texto */}
      {cleanContent && (
        isUser
          ? <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{cleanContent}</p>
          : <div className="space-y-0.5">{formatMessage(cleanContent)}</div>
      )}

      {/* Imagens geradas pela IA */}
      {genImages.map((url, i) => (
        <div key={i} className="mt-3">
          <img
            src={url}
            alt="Imagem gerada"
            className="max-w-full rounded-2xl border border-[#e0e0e0] shadow-md"
            style={{ maxHeight: 480 }}
          />
          <a
            href={url}
            download="imagem-gerada.jpg"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#6366f1] hover:text-[#4f52cc] transition-colors"
          >
            <Download className="w-3 h-3" /> Baixar imagem
          </a>
        </div>
      ))}
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({
  message, isStreaming = false, streamContent = '',
}: {
  message?: AIMessage
  isStreaming?: boolean
  streamContent?: string
}) {
  const isUser  = message?.role === 'user'
  const content = isStreaming ? streamContent : (message?.content ?? '')

  if (isUser) {
    return (
      <div className="flex justify-end mb-6 group">
        <div className="max-w-[82%]">
          <div className="bg-[#f4f4f4] text-[#0f0f0f] rounded-3xl rounded-tr-lg px-4 py-3 shadow-sm">
            <MessageContent content={content} isUser />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 mb-6 group">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shadow-sm mt-0.5">
        <Sparkles className="w-4 h-4 text-white" />
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        {message?.web_search && (
          <div className="flex items-center gap-1.5 mb-2 text-[11px] text-[#64748b]">
            <Globe className="w-3 h-3" />
            <span>Busca web ativa</span>
          </div>
        )}

        {isStreaming && !content ? (
          <div className="flex items-center gap-2 py-2">
            <span className="w-2 h-2 rounded-full bg-[#6366f1] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-[#6366f1] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-[#6366f1] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <div className="text-[#0f0f0f] min-h-[20px]">
            <MessageContent content={content} isUser={false} />
            {isStreaming && <span className="inline-block w-0.5 h-4 bg-[#6366f1] animate-pulse ml-0.5 align-middle" />}
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Sugestões de boas-vindas ─────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: TrendingUp, text: 'Quais são as tendências do Instagram para este mês?', web: true },
  { icon: FileText,   text: 'Crie um calendário editorial para uma clínica de estética', web: false },
  { icon: Lightbulb, text: 'Como precificar meus serviços de social media em 2025?', web: false },
  { icon: Sparkles,   text: 'Escreva 5 hooks virais para Reels de um pet shop', web: false },
  { icon: ImageIcon,  text: 'Crie uma imagem de um post estiloso para Instagram de moda', web: false },
  { icon: Wand2,      text: 'Gere uma imagem de um logotipo moderno para uma agência digital', web: false },
]

// Evita busca web desnecessária em saudações e mensagens curtas
const GREETING_RE = /^(oi|olá|ola|ei|hey|hello|hi|bom dia|boa tarde|boa noite|tudo bem|como vai|ok|certo|entendi|obrigad[ao]|valeu|brigad[ao]|sim|não|nao|continua|continue|pode|vai|show|perfeito|exato|excelente|ótimo|otimo|bacana|legal)\b/i
function shouldUseWebSearch(text: string): boolean {
  if (!text || text.trim().length < 25) return false
  return !GREETING_RE.test(text.trim())
}

// ─── Injeção de fase no squad prompt (Gap 1) ─────────────────────────────────
function buildPhaseMarker(phase: number, totalPhases: number): string {
  if (totalPhases <= 1) return ''

  if (phase === 0) return `🚦 PIPELINE — FASE 0/${totalPhases - 1}: INTAKE OBRIGATÓRIO
Você acabou de ser ativado. Esta é a PRIMEIRA interação deste pipeline.
REGRA ABSOLUTA: Execute APENAS a coleta de briefing.
1. Apresente seu time em no máximo 2 linhas
2. Faça TODAS as perguntas do briefing de uma vez (lista numerada)
3. NÃO comece a trabalhar, NÃO entregue análises, NÃO crie nada ainda
4. Termine com uma frase curta convidando o usuário a responder
Aguarde a resposta antes de qualquer execução.

`

  if (phase >= totalPhases - 1) return `🚦 PIPELINE — FASE FINAL: ENTREGA E REVISÃO
Esta é a fase de conclusão do pipeline.
Consolide tudo, entregue o output completo e profissional.
Ao final, pergunte se há ajustes antes de encerrar.

`

  return `🚦 PIPELINE — FASE ${phase}/${totalPhases - 1}: EXECUÇÃO
O briefing foi coletado. Execute agora as etapas de trabalho do seu pipeline.
Ao concluir esta fase, PARE e pergunte se o usuário quer ajustes antes de continuar.

`
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function AIPage() {
  const [activeSessionId, setActiveSessionId]   = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen]           = useState(true)
  const [input, setInput]                       = useState('')
  const [imageMode, setImageMode]               = useState(false)
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null)
  const [activeClientId, setActiveClientId]     = useState<string | null>(null)
  const [clientPickerOpen, setClientPickerOpen] = useState(false)
  const [memoryPanelOpen, setMemoryPanelOpen]         = useState(false)
  const [userMemoryPanelOpen, setUserMemoryPanelOpen] = useState(false)
  const [activeSquad, setActiveSquad]           = useState<AISquad | null>(null)
  const [squadToast, setSquadToast]             = useState<AISquad | null>(null)

  // ── Pipeline de fases (Gap 1 + 3) ───────────────────────────────────────────
  // currentPhaseDisplay: fase atual para UI (0=intake, 1=trabalho, 2+=entrega)
  const [currentPhaseDisplay, setCurrentPhaseDisplay] = useState(0)
  // Armazena fase por sessão em memória (ref = sem re-render durante streaming)
  const sessionPhaseRef = useRef<{ squadId: string; phase: number } | null>(null)
  // Captura o ID da sessão criada durante sendMessage (para salvar fase depois)
  const justCreatedSessionRef = useRef<string | null>(null)

  // ── Sub-agentes paralelos (Gap 2) ────────────────────────────────────────────
  const [activeSubAgents, setActiveSubAgents] = useState<
    { id: string; name: string; emoji: string; status: 'running' | 'done' }[]
  >([])
  const [isSubAgentRunning, setIsSubAgentRunning] = useState(false)

  // Imagens anexadas
  const [attachedImages, setAttachedImages]     = useState<string[]>([])
  const fileInputRef                            = useRef<HTMLInputElement>(null)

  // Modal: Diagnóstico de Perfil
  const [diagnosticoOpen, setDiagnosticoOpen]   = useState(false)

  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pickerRef      = useRef<HTMLDivElement>(null)

  const { data: sessions = [], isLoading: sessionsLoading } = useAISessions()
  const { data: messages = [], isLoading: messagesLoading } = useAIMessages(activeSessionId)
  const { data: clients  = [] }                             = useClients()
  const { data: clientCtx }                                 = useClientContext(activeClientId)
  const { data: userMemories = [] }                         = useAIUserMemory()
  const deleteSession  = useDeleteSession()

  const effectiveSessionId = activeSessionId ?? pendingSessionId
  const { sendMessage, isStreaming, isLoading, streamingContent, stopGeneration } =
    useAIChat(effectiveSessionId)

  const userMemoryContext = buildUserMemoryContext(userMemories)

  // Voice input
  const { isRecording, toggle: toggleRecording, supported: voiceSupported } = useVoiceInput(
    useCallback((t: string) => setInput(prev => prev ? `${prev} ${t}` : t), [])
  )

  // Fecha pickers ao clicar fora
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setClientPickerOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])


  // Gap 3: Restaura fase do pipeline ao trocar de sessão (localStorage)
  useEffect(() => {
    if (!activeSessionId) {
      sessionPhaseRef.current = null
      setCurrentPhaseDisplay(0)
      setActiveSubAgents([])
      return
    }
    try {
      const saved = localStorage.getItem(`sf_phase_${activeSessionId}`)
      if (saved) {
        const data = JSON.parse(saved) as { squadId: string; phase: number }
        sessionPhaseRef.current = data
        setCurrentPhaseDisplay(data.phase)
        const squad = AI_SQUADS.find(s => s.id === data.squadId) ?? null
        if (squad) setActiveSquad(squad)
      } else {
        sessionPhaseRef.current = null
        setCurrentPhaseDisplay(0)
      }
    } catch {
      sessionPhaseRef.current = null
      setCurrentPhaseDisplay(0)
    }
  }, [activeSessionId])

  // Scroll para o final
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamingContent])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 180) + 'px'
  }, [input])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachedImages.length === 0) || isStreaming || isLoading || isSubAgentRunning) return
    const text = input.trim()
    setInput('')
    const imgs = [...attachedImages]
    setAttachedImages([])

    // Detecção automática de squad (qualquer mensagem enquanto não há squad ativo)
    let currentSquad = activeSquad
    if (!currentSquad && text) {
      // Fase 1: keyword match rápido (instantâneo)
      const detected = detectSquad(text)
      if (detected) {
        currentSquad = detected
        setActiveSquad(detected)
        setSquadToast(detected)
        setTimeout(() => setSquadToast(null), 4000)
      } else {
        // Fase 2: classificação por IA sequencial (aguarda antes de enviar)
        // Garante que o squad esteja ativo já na primeira resposta
        try {
          const { data } = await supabase.functions.invoke('ai-chat', {
            body: { classify: true, message: text },
          })
          const squadId = (data as { squadId?: string })?.squadId
          if (squadId && squadId !== 'none') {
            const found = AI_SQUADS.find(s => s.id === squadId) ?? null
            if (found) {
              currentSquad = found
              setActiveSquad(found)
              setSquadToast(found)
              setTimeout(() => setSquadToast(null), 4000)
            }
          }
        } catch { /* silencioso */ }
      }
    }

    const fullContext = [userMemoryContext, clientCtx?.contextString].filter(Boolean).join('\n\n') || null
    const historyHasImages = messages.some(m => m.content.includes('[[IMG:'))

    // ── Gap 1: Determina fase atual do pipeline ─────────────────────────────
    const savedPhase = sessionPhaseRef.current
    const currentPhase = (savedPhase?.squadId === currentSquad?.id) ? savedPhase.phase : 0
    const totalPhases  = currentSquad ? getSquadPhases(currentSquad.id) : 0

    // Injeta marcador de fase no início do squadPrompt
    let phasedSquadPrompt = currentSquad?.systemPrompt ?? null
    if (phasedSquadPrompt && currentSquad) {
      const phaseMarker = buildPhaseMarker(currentPhase, totalPhases)
      phasedSquadPrompt = phaseMarker + phasedSquadPrompt
    }

    // Callback captura ID da sessão criada (para salvar fase depois)
    justCreatedSessionRef.current = null
    const onSessionCreated = (session: AISession) => {
      setActiveSessionId(session.id)
      setPendingSessionId(null)
      justCreatedSessionRef.current = session.id
    }

    // ── Gap 2: Sub-agentes paralelos (apenas Mineração, fase 1) ────────────
    const subAgents = currentSquad ? getSquadSubAgents(currentSquad.id) : []
    const useParallelAgents = subAgents.length > 0 && currentPhase === 1

    if (useParallelAgents && currentSquad) {
      // Sub-agentes que rodam em paralelo (todos exceto o consolidador final)
      const parallelAgents = subAgents.filter(a => a.id !== subAgents[subAgents.length - 1].id)
      const consolidator   = subAgents[subAgents.length - 1]

      setIsSubAgentRunning(true)
      setActiveSubAgents(parallelAgents.map(a => ({ ...a, status: 'running' as const })))

      // Histórico completo incluindo a mensagem atual (briefing do usuário)
      const briefingHistory = [
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: text },
      ]

      try {
        // Executa sub-agentes em paralelo (sem stream para a UI)
        const parallelResults = await Promise.all(
          parallelAgents.map(agent =>
            streamChat(briefingHistory, agent.systemPrompt, true, () => {}).then(result => {
              setActiveSubAgents(prev =>
                prev.map(a => a.id === agent.id ? { ...a, status: 'done' as const } : a)
              )
              return { id: agent.id, name: agent.name, emoji: agent.emoji, result }
            })
          )
        )

        // Injeta resultados dos sub-agentes no prompt do consolidador
        const subAgentContext = parallelResults
          .map(r => `## Resultados de ${r.emoji} ${r.name}:\n${r.result}`)
          .join('\n\n')

        phasedSquadPrompt = `${consolidator.systemPrompt}

${subAgentContext}`

        setActiveSubAgents(prev => [...prev, { id: consolidator.id, name: consolidator.name, emoji: consolidator.emoji, status: 'running' as const }])

        await sendMessage(
          text, messages, false,
          onSessionCreated,
          fullContext,
          activeClientId,
          phasedSquadPrompt,
          imgs.length > 0 ? imgs : undefined,
          imageMode,
        )

        setActiveSubAgents(prev => prev.map(a => a.id === consolidator.id ? { ...a, status: 'done' as const } : a))
        setTimeout(() => setActiveSubAgents([]), 2500)
      } catch {
        setActiveSubAgents([])
      } finally {
        setIsSubAgentRunning(false)
      }
    } else {
      // Fluxo normal (sem sub-agentes paralelos)
      await sendMessage(
        text, messages, shouldUseWebSearch(text) && imgs.length === 0 && !historyHasImages,
        onSessionCreated,
        fullContext,
        activeClientId,
        phasedSquadPrompt,
        imgs.length > 0 ? imgs : undefined,
        imageMode,
      )
    }

    // ── Avança fase após resposta da IA ────────────────────────────────────
    if (currentSquad) {
      const nextPhase = Math.min(currentPhase + 1, totalPhases - 1)
      const phaseData = { squadId: currentSquad.id, phase: nextPhase }
      sessionPhaseRef.current = phaseData
      setCurrentPhaseDisplay(nextPhase)

      // Gap 3: Persiste no localStorage (usa ID real — seja pré-existente ou recém-criado)
      const sid = justCreatedSessionRef.current ?? activeSessionId
      if (sid) {
        try { localStorage.setItem(`sf_phase_${sid}`, JSON.stringify(phaseData)) } catch { /* storage cheio */ }
      }
    }
  }, [input, attachedImages, isStreaming, isLoading, isSubAgentRunning, sendMessage, messages, imageMode, clientCtx, activeSquad, activeClientId, userMemoryContext, activeSessionId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleNewChat = () => {
    setActiveSessionId(null); setPendingSessionId(null)
    setInput(''); setImageMode(false); setActiveSquad(null); setAttachedImages([])
    sessionPhaseRef.current = null
    setCurrentPhaseDisplay(0)
    setActiveSubAgents([])
    setIsSubAgentRunning(false)
  }

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const encoded = await Promise.all(files.map(f => resizeAndEncode(f)))
    setAttachedImages(prev => [...prev, ...encoded].slice(0, 4)) // máx 4 imagens
    e.target.value = ''
  }

  const handleDiagnosticoStart = async (prompt: string, images: string[]) => {
    setDiagnosticoOpen(false)
    // Ativa o squad "Diagnóstico de Perfil"
    const diagSquad = AI_SQUADS.find(s => s.id === 'diagnostico-perfil') ?? null
    setActiveSquad(diagSquad)

    const fullContext = [userMemoryContext, clientCtx?.contextString].filter(Boolean).join('\n\n') || null

    await sendMessage(
      prompt, messages, false,
      (session) => { setActiveSessionId(session.id); setPendingSessionId(null) },
      fullContext,
      activeClientId,
      diagSquad?.systemPrompt ?? null,
      images.length > 0 ? images : undefined,
    )
  }

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteSession.mutate(id)
    if (activeSessionId === id) handleNewChat()
  }

  const isEmpty    = !activeSessionId && !pendingSessionId
  const hasContent = input.trim().length > 0 || attachedImages.length > 0
  const canSend    = hasContent && !isStreaming && !isLoading && !isSubAgentRunning

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── SIDEBAR ESCURA ── */}
      <div className={cn(
        'flex flex-col flex-shrink-0 transition-all duration-200 overflow-hidden',
        sidebarOpen ? 'w-64' : 'w-0',
      )} style={{ background: '#171717' }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 h-14 px-4 border-b border-white/8 flex-shrink-0">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[13px] font-semibold text-white/90 truncate">IA StatusMedia</span>
        </div>

        {/* Nova conversa */}
        <div className="px-3 py-3 flex-shrink-0">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/10 text-[13px] font-medium text-white/90 hover:bg-white/15 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova conversa
          </button>
        </div>

        {/* Lista de sessões */}
        <div className="flex-1 overflow-y-auto px-2 pb-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,.1) transparent' }}>
          {sessionsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-white/30" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-7 h-7 text-white/20 mx-auto mb-2" />
              <p className="text-[11px] text-white/30">Nenhuma conversa ainda</p>
            </div>
          ) : (
            <div className="space-y-0.5 mt-1">
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider px-2 mb-2">Conversas recentes</p>
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-[12px] transition-all group',
                    activeSessionId === session.id
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 hover:bg-white/8 hover:text-white/90',
                  )}
                >
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                  <span className="flex-1 truncate">{session.title}</span>
                  <button
                    onClick={e => handleDeleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-400 transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/8 flex-shrink-0">
          <p className="text-[10px] text-white/25 leading-relaxed">Powered by GPT-4o · gpt-image-1.5 · Voz pt-BR</p>
        </div>
      </div>

      {/* ── ÁREA PRINCIPAL ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">

        {/* Topbar */}
        <div className="h-14 flex items-center gap-2 px-3 bg-white border-b border-[#efefef] flex-shrink-0">
          {/* Toggle sidebar */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f5f5] text-[#737373] transition-colors flex-shrink-0"
          >
            {sidebarOpen
              ? <PanelLeftClose className="w-4 h-4" />
              : <PanelLeftOpen  className="w-4 h-4" />}
          </button>

          <p className="text-[13px] font-medium text-[#0f0f0f] truncate flex-1">
            {activeSessionId
              ? (sessions.find(s => s.id === activeSessionId)?.title ?? 'Conversa')
              : 'Nova conversa'}
          </p>

          <div className="flex items-center gap-2 flex-shrink-0">

            {/* Seletor de cliente */}
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setClientPickerOpen(o => !o)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition-all',
                  activeClientId && clientCtx
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-[#f5f5f5] border-[#e8e8e8] text-[#555] hover:border-[#d0d0d0]',
                )}
              >
                {activeClientId && clientCtx ? (
                  <>
                    <Building2 className="w-3 h-3" />
                    <span className="max-w-[100px] truncate">{clientCtx.client.company_name}</span>
                    <button onClick={e => { e.stopPropagation(); setActiveClientId(null) }} className="hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <Users className="w-3 h-3" />
                    <span>Cliente</span>
                    <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>

              {clientPickerOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-[#e2e8f0] rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-[#f0f0f0]">
                    <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wide">Contexto do cliente</p>
                    <p className="text-[10px] text-[#999] mt-0.5">A IA usará os dados do cliente selecionado</p>
                  </div>
                  <div className="max-h-52 overflow-y-auto py-1">
                    {clients.length === 0
                      ? <p className="px-3 py-3 text-[12px] text-[#999]">Nenhum cliente cadastrado</p>
                      : clients.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setActiveClientId(c.id); setClientPickerOpen(false) }}
                          className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#f5f5f5] transition-colors', activeClientId === c.id && 'bg-emerald-50')}
                        >
                          <div className="w-6 h-6 rounded-lg bg-[#f0f0f0] flex items-center justify-center flex-shrink-0">
                            <span className="text-[11px] font-semibold text-[#555]">{c.company_name.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-[#0f0f0f] truncate">{c.company_name}</p>
                            <p className="text-[10px] text-[#999] truncate">{c.niche}</p>
                          </div>
                        </button>
                      ))}
                  </div>
                  {activeClientId && (
                    <div className="border-t border-[#f0f0f0] px-3 py-2">
                      <button onClick={() => { setActiveClientId(null); setClientPickerOpen(false) }} className="text-[11px] text-red-500 flex items-center gap-1">
                        <X className="w-3 h-3" /> Remover contexto
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Memórias da agência — sempre visível */}
            <button
              onClick={() => { setUserMemoryPanelOpen(o => !o); setMemoryPanelOpen(false) }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition-all',
                userMemoryPanelOpen
                  ? 'bg-[#0369a1] border-[#0284c7] text-white'
                  : 'bg-[#f0f9ff] border-[#bae6fd] text-[#0369a1] hover:bg-[#e0f2fe]',
              )}
              title="Memórias da agência — fatos que a IA aprendeu sobre seu negócio"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Agência</span>
              {userMemories.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#0ea5e9] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                  {userMemories.length}
                </span>
              )}
            </button>

            {/* Memórias do cliente */}
            {activeClientId && clientCtx && (
              <button
                onClick={() => { setMemoryPanelOpen(o => !o); setUserMemoryPanelOpen(false) }}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition-all',
                  memoryPanelOpen
                    ? 'bg-[#6d28d9] border-[#5b21b6] text-white'
                    : 'bg-[#faf5ff] border-[#ddd6fe] text-[#7c3aed] hover:bg-[#ede9fe]',
                )}
              >
                <Brain className="w-3.5 h-3.5" /> Memórias
              </button>
            )}

            {/* Squad ativo + indicador de fase */}
            {activeSquad && (
              <div className="flex items-center gap-1.5">
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border"
                  style={{ backgroundColor: activeSquad.color.bg, borderColor: activeSquad.color.border, color: activeSquad.color.text }}
                >
                  <span>{activeSquad.emoji}</span>
                  <span className="max-w-[90px] truncate">{activeSquad.name}</span>
                  <button
                    onClick={() => {
                      setActiveSquad(null)
                      sessionPhaseRef.current = null
                      setCurrentPhaseDisplay(0)
                      setActiveSubAgents([])
                    }}
                    className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                    title="Remover squad"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {/* Indicador de fase (Gap 1 UI) */}
                {getSquadPhases(activeSquad.id) > 1 && (
                  <div className="hidden sm:flex items-center gap-1" title={`Fase ${currentPhaseDisplay + 1} de ${getSquadPhases(activeSquad.id)}`}>
                    {Array.from({ length: getSquadPhases(activeSquad.id) }).map((_, i) => (
                      <span
                        key={i}
                        className="block rounded-full transition-all"
                        style={{
                          width: i === currentPhaseDisplay ? '16px' : '6px',
                          height: '6px',
                          backgroundColor: i <= currentPhaseDisplay ? activeSquad.color.dot : activeSquad.color.border,
                          opacity: i <= currentPhaseDisplay ? 1 : 0.4,
                        }}
                      />
                    ))}
                    <span className="text-[9px] font-medium ml-0.5" style={{ color: activeSquad.color.text, opacity: 0.7 }}>
                      {currentPhaseDisplay === 0 ? 'Intake' : currentPhaseDisplay >= getSquadPhases(activeSquad.id) - 1 ? 'Final' : `Fase ${currentPhaseDisplay + 1}`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Badge modelo */}
            <div className={cn(
              'hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border',
              imageMode ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-blue-50 border-blue-200 text-blue-700',
            )}>
              {imageMode ? <Wand2 className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              {imageMode ? 'gpt-image-1.5' : 'gpt-4o-search'}
            </div>

          </div>
        </div>

        {/* Cliente e squad ativos aparecem de forma sutil nos seletores do topbar —
            sem barras ocupando espaço vertical. */}

        {/* ── Área de mensagens ── */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            /* Tela de boas-vindas — minimalista */
            <div className="flex flex-col items-center justify-center min-h-full px-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center mb-5 shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-[22px] font-bold text-[#0f0f0f] mb-2 text-center">Como posso ajudar?</h1>
              <p className="text-[13px] text-[#666] text-center max-w-md">
                Especialista em Social Media e Marketing Digital. Ative um squad ou pergunte diretamente.
              </p>

              {/* Informação sutil de contexto ativo (sem barra) */}
              {(activeSquad || (activeClientId && clientCtx)) && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
                  {activeSquad && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border"
                      style={{ backgroundColor: activeSquad.color.bg, borderColor: activeSquad.color.border, color: activeSquad.color.text }}>
                      <span>{activeSquad.emoji}</span> {activeSquad.name}
                    </span>
                  )}
                  {activeClientId && clientCtx && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 border border-emerald-200 text-emerald-700">
                      <Building2 className="w-3 h-3" /> {clientCtx.client.company_name}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Mensagens */
            <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
              {messagesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-[#999]" />
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                    />
                  ))}

                  {/* Gap 2: Sub-agentes rodando em paralelo */}
                  {activeSubAgents.length > 0 && (
                    <div className="flex gap-3 mb-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shadow-sm mt-0.5">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 pt-1.5">
                        <div className="flex flex-wrap gap-2">
                          {activeSubAgents.map(agent => (
                            <div
                              key={agent.id}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium border transition-all',
                                agent.status === 'running'
                                  ? 'bg-[#f5f3ff] border-[#c4b5fd] text-[#6d28d9]'
                                  : 'bg-[#f0fdf4] border-[#86efac] text-[#166534]',
                              )}
                            >
                              <span>{agent.emoji}</span>
                              <span>{agent.name}</span>
                              {agent.status === 'running' ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <span className="text-[10px]">✓</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-[#999] mt-1.5">
                          {activeSubAgents.every(a => a.status === 'done')
                            ? 'Sub-agentes concluídos — consolidando...'
                            : `${activeSubAgents.filter(a => a.status === 'running').length} sub-agente(s) trabalhando em paralelo...`}
                        </p>
                      </div>
                    </div>
                  )}

                  {(isLoading || isStreaming) && (
                    <MessageBubble isStreaming streamContent={streamingContent} />
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Barra de input estilo ChatGPT ── */}
        <div className="flex-shrink-0 px-4 pb-4 pt-2 bg-white">
          <div className="max-w-3xl mx-auto">

            {/* Preview de imagens anexadas */}
            {attachedImages.length > 0 && (
              <div className="flex gap-2 mb-2 flex-wrap">
                {attachedImages.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt="" className="w-16 h-16 rounded-xl object-cover border border-[#e0e0e0]" />
                    <button
                      onClick={() => setAttachedImages(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#0f0f0f] text-white flex items-center justify-center shadow"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Caixa de input */}
            <div className={cn(
              'flex flex-col bg-white border rounded-3xl shadow-sm transition-all',
              isRecording ? 'border-red-300 ring-2 ring-red-100' : 'border-[#e0e0e0] focus-within:border-[#b0b0b0] focus-within:shadow-md',
            )}>
              {/* Textarea */}
              <div className="flex items-end gap-2 px-4 pt-3">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isRecording ? '🔴 Ouvindo... fale agora' :
                    imageMode ? '🎨 Descreva a imagem que quer gerar...' :
                    attachedImages.length > 0 ? 'Pergunte algo sobre essa imagem...' :
                    'Pergunte sobre estratégias, tendências, conteúdo...'
                  }
                  rows={1}
                  disabled={isLoading || isStreaming}
                  className="flex-1 bg-transparent text-[13.5px] text-[#0f0f0f] placeholder:text-[#aaa] resize-none outline-none py-1 min-h-[36px] max-h-[180px] leading-relaxed disabled:opacity-50"
                  style={{ scrollbarWidth: 'none' }}
                />
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
                <div className="flex items-center gap-1">
                  {/* Anexar imagem */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isStreaming}
                    title="Anexar imagem"
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-[#888] hover:bg-[#f0f0f0] hover:text-[#333] transition-all disabled:opacity-40"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileAttach}
                  />

                  {/* Microfone (Web Speech API) */}
                  {voiceSupported && (
                    <button
                      onClick={toggleRecording}
                      disabled={isLoading || isStreaming}
                      title={isRecording ? 'Parar gravação' : 'Gravar voz (pt-BR)'}
                      className={cn(
                        'w-8 h-8 flex items-center justify-center rounded-xl transition-all disabled:opacity-40',
                        isRecording
                          ? 'bg-red-100 text-red-500 hover:bg-red-200 animate-pulse'
                          : 'text-[#888] hover:bg-[#f0f0f0] hover:text-[#333]',
                      )}
                    >
                      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}

                  {/* Toggle gerar imagem (gpt-image-1.5) */}
                  <button
                    onClick={() => setImageMode(m => !m)}
                    disabled={isLoading || isStreaming}
                    title={imageMode ? 'Desativar modo imagem' : 'Gerar imagem com IA (gpt-image-1.5)'}
                    className={cn(
                      'flex items-center gap-1.5 h-8 px-2.5 rounded-xl text-[11px] font-medium transition-all disabled:opacity-40',
                      imageMode
                        ? 'bg-violet-100 text-violet-600 hover:bg-violet-200'
                        : 'text-[#888] hover:bg-[#f0f0f0] hover:text-[#333]',
                    )}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{imageMode ? 'Imagem ativa' : 'Imagem'}</span>
                  </button>
                </div>

                {/* Parar / Enviar */}
                {(isStreaming || isLoading) ? (
                  <button
                    onClick={stopGeneration}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-[#0f0f0f] text-white hover:bg-[#333] transition-all"
                    title="Parar geração"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!canSend}
                    className="w-9 h-9 flex items-center justify-center rounded-full transition-all"
                    style={{
                      background: canSend ? '#0f0f0f' : '#cbd5e1',
                      color:      canSend ? '#ffffff' : '#94a3b8',
                      cursor:     canSend ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-[10px] text-[#bbb] text-center mt-2">
              Enter para enviar · Shift+Enter para nova linha · 📎 imagem · 🎤 voz · 🌐 web · 🎨 gpt-image-1.5
            </p>
          </div>
        </div>
      </div>

      {/* ── Painel de memórias da agência ── */}
      {userMemoryPanelOpen && (
        <AIUserMemoryPanel onClose={() => setUserMemoryPanelOpen(false)} />
      )}

      {/* ── Painel de memórias do cliente ── */}
      {memoryPanelOpen && activeClientId && clientCtx && (
        <AIMemoryPanel client={clientCtx.client} onClose={() => setMemoryPanelOpen(false)} />
      )}

      {/* ── Modal Diagnóstico de Perfil ── */}
      {diagnosticoOpen && (
        <DiagnosticoModal
          onClose={() => setDiagnosticoOpen(false)}
          onStart={handleDiagnosticoStart}
        />
      )}

      {/* ── Toast squad auto-detectado ── */}
      {squadToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl border"
            style={{ backgroundColor: squadToast.color.bg, borderColor: squadToast.color.border }}
          >
            <span className="text-[18px]">{squadToast.emoji}</span>
            <div>
              <p className="text-[12px] font-semibold" style={{ color: squadToast.color.text }}>
                {squadToast.name} ativado
              </p>
              <p className="text-[11px] opacity-70" style={{ color: squadToast.color.text }}>
                Squad detectado automaticamente
              </p>
            </div>
            <button onClick={() => setSquadToast(null)} className="opacity-40 hover:opacity-80 ml-1" style={{ color: squadToast.color.text }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
