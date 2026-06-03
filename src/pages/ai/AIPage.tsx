import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Plus, Trash2, Globe, GlobeLock, Loader2, Bot,
  MessageSquare, Square, Sparkles, TrendingUp, FileText,
  Lightbulb, Users, X, Building2, ChevronDown, Brain,
  CalendarPlus, Check, Mic, MicOff, Paperclip, Download,
  ImageIcon, PanelLeftOpen, PanelLeftClose, Wand2,
} from 'lucide-react'
import { cn, contentTypeLabels } from '@/utils/formatters'
import { useClients } from '@/hooks/useClients'
import { useClientContext } from '@/hooks/useAIContext'
import { useCreatePlannerItem } from '@/hooks/usePlanner'
import { useAuth } from '@/hooks/useAuth'
import { AIMemoryPanel } from '@/components/ai/AIMemoryPanel'
import { AI_SQUADS, type AISquad } from '@/data/aiSquads'
import type { ContentType } from '@/types'
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
    if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, '')); i++ }
      result.push(
        <ol key={i} className="my-2 space-y-1.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2.5 text-[13.5px] leading-relaxed">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#f0f0f0] text-[#555] text-[11px] font-semibold flex items-center justify-center mt-0.5">{idx + 1}</span>
              <span>{parseInline(item)}</span>
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
  message, isStreaming = false, streamContent = '', onAddToPlanner,
}: {
  message?: AIMessage
  isStreaming?: boolean
  streamContent?: string
  onAddToPlanner?: (c: string) => void
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

        {!isStreaming && content && onAddToPlanner && (
          <button
            onClick={() => onAddToPlanner(content)}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium text-[#6366f1] border border-[#e0d9ff] bg-[#f5f3ff] hover:bg-[#ede9ff] hover:border-[#c4b5fd] transition-all opacity-0 group-hover:opacity-100"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Adicionar ao planejamento
          </button>
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

// ─── Componente principal ─────────────────────────────────────────────────────
export function AIPage() {
  const [activeSessionId, setActiveSessionId]   = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen]           = useState(true)
  const [input, setInput]                       = useState('')
  const [webSearch, setWebSearch]               = useState(false)
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null)
  const [activeClientId, setActiveClientId]     = useState<string | null>(null)
  const [clientPickerOpen, setClientPickerOpen] = useState(false)
  const [memoryPanelOpen, setMemoryPanelOpen]   = useState(false)
  const [memoryToast, setMemoryToast]           = useState<string[]>([])
  const [activeSquad, setActiveSquad]           = useState<AISquad | null>(null)
  const [squadPickerOpen, setSquadPickerOpen]   = useState(false)

  // Imagens anexadas
  const [attachedImages, setAttachedImages]     = useState<string[]>([])
  const fileInputRef                            = useRef<HTMLInputElement>(null)

  // Modal: adicionar ao planejamento
  const [plannerModal, setPlannerModal] = useState<{ content: string } | null>(null)
  const [plannerForm, setPlannerForm]   = useState({
    title: '', date: new Date().toISOString().split('T')[0], contentType: 'post' as ContentType,
  })
  const [plannerSaved, setPlannerSaved] = useState(false)

  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pickerRef      = useRef<HTMLDivElement>(null)
  const squadPickerRef = useRef<HTMLDivElement>(null)

  const { user }                                            = useAuth()
  const { data: sessions = [], isLoading: sessionsLoading } = useAISessions()
  const { data: messages = [], isLoading: messagesLoading } = useAIMessages(activeSessionId)
  const { data: clients  = [] }                             = useClients()
  const { data: clientCtx }                                 = useClientContext(activeClientId)
  const deleteSession  = useDeleteSession()
  const createPlanner  = useCreatePlannerItem()

  const effectiveSessionId = activeSessionId ?? pendingSessionId
  const { sendMessage, isStreaming, isLoading, streamingContent, stopGeneration, memoriesSaved, clearMemoriesSaved } =
    useAIChat(effectiveSessionId)

  // Voice input
  const { isRecording, toggle: toggleRecording, supported: voiceSupported } = useVoiceInput(
    useCallback((t: string) => setInput(prev => prev ? `${prev} ${t}` : t), [])
  )

  // Fecha pickers ao clicar fora
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setClientPickerOpen(false)
      if (squadPickerRef.current && !squadPickerRef.current.contains(e.target as Node)) setSquadPickerOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Toast de memória
  useEffect(() => {
    if (!memoriesSaved.length) return
    setMemoryToast(memoriesSaved)
    clearMemoriesSaved()
    const t = setTimeout(() => setMemoryToast([]), 4000)
    return () => clearTimeout(t)
  }, [memoriesSaved, clearMemoriesSaved])

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
    if ((!input.trim() && attachedImages.length === 0) || isStreaming || isLoading) return
    const text = input.trim()
    setInput('')
    const imgs = [...attachedImages]
    setAttachedImages([])

    await sendMessage(
      text, messages, webSearch,
      (session) => { setActiveSessionId(session.id); setPendingSessionId(null) },
      clientCtx?.contextString ?? null,
      activeClientId,
      activeSquad?.systemPrompt ?? null,
      imgs.length > 0 ? imgs : undefined,
    )
  }, [input, attachedImages, isStreaming, isLoading, sendMessage, messages, webSearch, clientCtx, activeSquad, activeClientId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleNewChat = () => {
    setActiveSessionId(null); setPendingSessionId(null)
    setInput(''); setWebSearch(false); setActiveSquad(null); setAttachedImages([])
  }

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const encoded = await Promise.all(files.map(f => resizeAndEncode(f)))
    setAttachedImages(prev => [...prev, ...encoded].slice(0, 4)) // máx 4 imagens
    e.target.value = ''
  }

  const handleOpenPlannerModal = (content: string) => {
    const firstLine = content.split('\n').find(l => l.trim()) ?? ''
    const title = firstLine.replace(/^[#*_>\-•\d.]+\s*/, '').slice(0, 80).trim()
    setPlannerForm(f => ({ ...f, title, date: new Date().toISOString().split('T')[0], contentType: 'post' }))
    setPlannerSaved(false)
    setPlannerModal({ content })
  }

  const handleSavePlanner = async () => {
    if (!user || !plannerModal) return
    await createPlanner.mutateAsync({
      user_id: user.id, title: plannerForm.title || 'Post gerado pela IA',
      content_type: plannerForm.contentType, status: 'ideia',
      notes: plannerModal.content, client_id: activeClientId,
      scheduled_date: plannerForm.date, scheduled_time: null,
      content_id: null, asset_id: null, approval_status: null,
      client_feedback: null, reviewed_at: null, reviewed_by: null,
    })
    setPlannerSaved(true)
    setTimeout(() => { setPlannerModal(null); setPlannerSaved(false) }, 1500)
  }

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteSession.mutate(id)
    if (activeSessionId === id) handleNewChat()
  }

  const isEmpty    = !activeSessionId && !pendingSessionId
  const hasContent = input.trim().length > 0 || attachedImages.length > 0
  const canSend    = hasContent && !isStreaming && !isLoading

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
          <span className="text-[13px] font-semibold text-white/90 truncate">IA Kairo Hub</span>
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
          <p className="text-[10px] text-white/25 leading-relaxed">Powered by GPT-4o · DALL-E 3 · Whisper</p>
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

            {/* Memórias */}
            {activeClientId && clientCtx && (
              <button
                onClick={() => setMemoryPanelOpen(o => !o)}
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

            {/* Seletor de squad */}
            <div className="relative" ref={squadPickerRef}>
              <button
                onClick={() => setSquadPickerOpen(o => !o)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition-all',
                  activeSquad
                    ? 'border-[#c4b5fd] text-[#5b21b6]'
                    : 'bg-[#f5f5f5] border-[#e8e8e8] text-[#555] hover:border-[#d0d0d0]',
                )}
                style={activeSquad ? { backgroundColor: activeSquad.color.bg } : {}}
              >
                {activeSquad ? (
                  <>
                    <span>{activeSquad.emoji}</span>
                    <span className="max-w-[90px] truncate">{activeSquad.name}</span>
                    <button onClick={e => { e.stopPropagation(); setActiveSquad(null) }} className="hover:text-red-500 ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>Squad</span>
                  </>
                )}
              </button>

              {squadPickerOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-[#e2e8f0] rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-[#f0f0f0]">
                    <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wide">Times especializados</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
                    {AI_SQUADS.map(squad => (
                      <button
                        key={squad.id}
                        onClick={() => { setActiveSquad(squad); setSquadPickerOpen(false) }}
                        className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all', activeSquad?.id === squad.id ? 'ring-1' : 'hover:bg-[#f5f5f5]')}
                        style={activeSquad?.id === squad.id ? { backgroundColor: squad.color.bg } : {}}
                      >
                        <span className="text-[15px]">{squad.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-[#0f0f0f]">{squad.name}</p>
                          <p className="text-[10px] text-[#777] truncate">{squad.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {activeSquad && (
                    <div className="border-t border-[#f0f0f0] px-3 py-2">
                      <button onClick={() => { setActiveSquad(null); setSquadPickerOpen(false) }} className="text-[11px] text-red-500 flex items-center gap-1">
                        <X className="w-3 h-3" /> Remover squad
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Badge modelo */}
            <div className={cn(
              'hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border',
              webSearch ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-[#f5f5f5] border-[#e8e8e8] text-[#666]',
            )}>
              {webSearch ? <Globe className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
              {webSearch ? 'gpt-4o-search' : 'gpt-4o'}
            </div>

          </div>
        </div>

        {/* Banner cliente ativo */}
        {activeClientId && clientCtx && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex-shrink-0">
            <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-2.5 h-2.5 text-white" />
            </div>
            <p className="text-[11.5px] text-emerald-800 flex-1">
              <span className="font-semibold">{clientCtx.client.company_name}</span>
              {' '}· nicho: {clientCtx.client.niche}
              {clientCtx.client.instagram && ` · @${clientCtx.client.instagram.replace('@', '')}`}
            </p>
            <button onClick={() => setActiveClientId(null)} className="text-emerald-600 hover:text-emerald-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Banner squad ativo */}
        {activeSquad && (
          <div className="flex items-center gap-2 px-4 py-2 border-b flex-shrink-0"
            style={{ backgroundColor: activeSquad.color.bg, borderColor: activeSquad.color.border }}>
            <span className="text-[14px]">{activeSquad.emoji}</span>
            <p className="text-[11.5px] flex-1" style={{ color: activeSquad.color.text }}>
              <span className="font-semibold">{activeSquad.name}</span> · {activeSquad.agents}
            </p>
            <button onClick={() => setActiveSquad(null)} style={{ color: activeSquad.color.text, opacity: 0.5 }} className="hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Área de mensagens ── */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            /* Tela de boas-vindas */
            <div className="flex flex-col items-center justify-start min-h-full px-6 pt-12 pb-4 overflow-y-auto">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center mb-5 shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-[22px] font-bold text-[#0f0f0f] mb-2 text-center">Como posso ajudar?</h1>
              <p className="text-[13px] text-[#666] text-center max-w-md mb-8">
                Especialista em Social Media e Marketing Digital. Ative um squad ou pergunte diretamente.
              </p>

              {/* Sugestões em grade */}
              <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-8">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(s.text); if (s.web) setWebSearch(true); setTimeout(() => textareaRef.current?.focus(), 50) }}
                    className="flex items-center gap-3 p-3.5 bg-white border border-[#e8e8e8] rounded-2xl text-left hover:border-[#6366f1]/40 hover:bg-[#f9f8ff] transition-all group shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#f5f3ff] flex items-center justify-center flex-shrink-0 group-hover:bg-[#ede9ff]">
                      <s.icon className="w-4 h-4 text-[#6366f1]" />
                    </div>
                    <p className="text-[12px] text-[#374151] leading-snug">{s.text}</p>
                  </button>
                ))}
              </div>

              {/* Grid de squads */}
              <div className="w-full max-w-2xl">
                <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wider mb-3">Times especializados</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {AI_SQUADS.map(squad => (
                    <button
                      key={squad.id}
                      onClick={() => setActiveSquad(s => s?.id === squad.id ? null : squad)}
                      className={cn(
                        'flex flex-col items-start gap-1.5 p-3 rounded-xl text-left border transition-all text-sm',
                        activeSquad?.id === squad.id ? 'shadow ring-1' : 'bg-white border-[#e8e8e8] hover:border-[#c4b5fd] hover:shadow-sm',
                      )}
                      style={activeSquad?.id === squad.id ? { backgroundColor: squad.color.bg, borderColor: squad.color.border } : {}}
                    >
                      <span className="text-[16px]">{squad.emoji}</span>
                      <div>
                        <p className="text-[11px] font-semibold text-[#0f0f0f] leading-tight">{squad.name}</p>
                        <p className="text-[10px] text-[#999] mt-0.5 line-clamp-2">{squad.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
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
                      onAddToPlanner={msg.role === 'assistant' && activeClientId ? handleOpenPlannerModal : undefined}
                    />
                  ))}
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

                  {/* Toggle web search */}
                  <button
                    onClick={() => setWebSearch(w => !w)}
                    disabled={isLoading || isStreaming}
                    title={webSearch ? 'Desativar busca web' : 'Ativar busca web'}
                    className={cn(
                      'flex items-center gap-1.5 h-8 px-2.5 rounded-xl text-[11px] font-medium transition-all disabled:opacity-40',
                      webSearch
                        ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                        : 'text-[#888] hover:bg-[#f0f0f0] hover:text-[#333]',
                    )}
                  >
                    {webSearch ? <Globe className="w-3.5 h-3.5" /> : <GlobeLock className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{webSearch ? 'Web ativa' : 'Web'}</span>
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
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-[#0f0f0f] text-white hover:bg-[#333] disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-[10px] text-[#bbb] text-center mt-2">
              Enter para enviar · Shift+Enter para nova linha · 📎 imagem · 🎤 voz · 🌐 web · 🎨 DALL-E 3
            </p>
          </div>
        </div>
      </div>

      {/* ── Painel de memórias ── */}
      {memoryPanelOpen && activeClientId && clientCtx && (
        <AIMemoryPanel client={clientCtx.client} onClose={() => setMemoryPanelOpen(false)} />
      )}

      {/* ── Modal: adicionar ao planejamento ── */}
      {plannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPlannerModal(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
                  <CalendarPlus className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0f0f0f]">Adicionar ao planejamento</p>
                  {activeClientId && clientCtx && <p className="text-[10px] text-[#999]">{clientCtx.client.company_name}</p>}
                </div>
              </div>
              <button onClick={() => setPlannerModal(null)} className="text-[#999] hover:text-[#333]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-[#666] uppercase tracking-wide mb-1.5">Título do post</label>
                <input
                  type="text"
                  value={plannerForm.title}
                  onChange={e => setPlannerForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Post sobre tendências..."
                  className="w-full h-9 px-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-[13px] text-[#0f0f0f] placeholder:text-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1]/50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#666] uppercase tracking-wide mb-1.5">Data</label>
                <input
                  type="date"
                  value={plannerForm.date}
                  onChange={e => setPlannerForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full h-9 px-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1]/50 [color-scheme:light]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#666] uppercase tracking-wide mb-1.5">Tipo</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['post', 'carrossel', 'reels', 'story'] as ContentType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setPlannerForm(f => ({ ...f, contentType: type }))}
                      className={cn(
                        'py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-all',
                        plannerForm.contentType === type
                          ? 'bg-[#6366f1] border-[#6366f1] text-white'
                          : 'bg-[#f8fafc] border-[#e2e8f0] text-[#333] hover:border-[#6366f1]/30',
                      )}
                    >
                      {contentTypeLabels[type] ?? type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl max-h-20 overflow-y-auto">
                <p className="text-[10px] text-[#999] mb-1">Prévia do conteúdo</p>
                <p className="text-[11px] text-[#555] leading-relaxed line-clamp-3">{plannerModal.content.replace(/\[\[.*?\]\]/g, '').slice(0, 200)}…</p>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[#f0f0f0] flex gap-2">
              <button onClick={() => setPlannerModal(null)} className="flex-1 py-2.5 rounded-xl border border-[#e2e8f0] text-[13px] text-[#555] hover:bg-[#f5f5f5] transition-all">
                Cancelar
              </button>
              <button
                onClick={handleSavePlanner}
                disabled={createPlanner.isPending || plannerSaved || !plannerForm.title.trim()}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium transition-all',
                  plannerSaved ? 'bg-emerald-500 text-white' : 'bg-[#6366f1] hover:bg-[#5558e3] text-white disabled:opacity-50',
                )}
              >
                {createPlanner.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : plannerSaved ? <><Check className="w-3.5 h-3.5" /> Salvo!</>
                  : <><CalendarPlus className="w-3.5 h-3.5" /> Salvar no planner</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast memória salva ── */}
      {memoryToast.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex items-start gap-3 bg-[#1e1b4b] rounded-2xl px-4 py-3 shadow-xl max-w-xs">
            <div className="w-7 h-7 rounded-xl bg-[#6d28d9] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Brain className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white mb-1">Memória salva!</p>
              <p className="text-[11px] text-white/70">
                {memoryToast.length === 1
                  ? `Aprendi: "${memoryToast[0].replace(/_/g, ' ')}"`
                  : `${memoryToast.length} novos aprendizados sobre este cliente`}
              </p>
            </div>
            <button onClick={() => setMemoryToast([])} className="text-white/40 hover:text-white/80 flex-shrink-0 mt-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
