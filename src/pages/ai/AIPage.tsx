import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Plus, Trash2, Globe, GlobeLock, Loader2, Bot,
  MessageSquare, ChevronLeft, ChevronRight, Square,
  Sparkles, TrendingUp, FileText, Lightbulb,
  Users, X, Building2, ChevronDown, Brain, ChevronUp,
} from 'lucide-react'
import { cn } from '@/utils/formatters'
import { useClients } from '@/hooks/useClients'
import { useClientContext } from '@/hooks/useAIContext'
import { AIMemoryPanel } from '@/components/ai/AIMemoryPanel'
import { AI_SQUADS, type AISquad } from '@/data/aiSquads'
import {
  useAISessions,
  useAIMessages,
  useDeleteSession,
  useAIChat,
  type AISession,
  type AIMessage,
} from '@/hooks/useAI'

// ── Formata markdown simples ────────────────────────────────────────────────────
function formatMessage(text: string) {
  const lines = text.split('\n')
  const result: JSX.Element[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Bloco de código
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      result.push(
        <div key={i} className="my-2 rounded-lg overflow-hidden border border-[#e2e8f0]">
          {lang && (
            <div className="px-3 py-1 text-[10px] font-mono bg-[#f1f5f9] text-[#64748b] border-b border-[#e2e8f0]">
              {lang}
            </div>
          )}
          <pre className="p-3 text-[12px] font-mono bg-[#f8fafc] overflow-x-auto text-[#0f172a] leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      )
      i++
      continue
    }

    // Cabeçalhos
    if (line.startsWith('### ')) {
      result.push(<h3 key={i} className="font-semibold text-[14px] mt-3 mb-1 text-[#0f0f0f]">{parseInline(line.slice(4))}</h3>)
      i++; continue
    }
    if (line.startsWith('## ')) {
      result.push(<h2 key={i} className="font-bold text-[15px] mt-4 mb-1.5 text-[#0f0f0f]">{parseInline(line.slice(3))}</h2>)
      i++; continue
    }
    if (line.startsWith('# ')) {
      result.push(<h1 key={i} className="font-bold text-[16px] mt-4 mb-2 text-[#0f0f0f]">{parseInline(line.slice(2))}</h1>)
      i++; continue
    }

    // Lista com marcador
    if (/^[-•*] /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-•*] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-•*] /, ''))
        i++
      }
      result.push(
        <ul key={i} className="my-2 space-y-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2 text-[13px] leading-relaxed text-[#374151]">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#94a3b8] flex-shrink-0" />
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Lista numerada
    if (/^\d+\. /.test(line)) {
      const items: string[] = []
      let num = 1
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''))
        i++; num++
      }
      result.push(
        <ol key={i} className="my-2 space-y-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2.5 text-[13px] leading-relaxed text-[#374151]">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#f1f5f9] text-[#64748b] text-[11px] font-semibold flex items-center justify-center mt-0.5">
                {idx + 1}
              </span>
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Separador
    if (line === '---' || line === '***') {
      result.push(<hr key={i} className="my-3 border-[#e2e8f0]" />)
      i++; continue
    }

    // Linha em branco
    if (line.trim() === '') {
      if (result.length > 0) {
        result.push(<div key={i} className="h-2" />)
      }
      i++; continue
    }

    // Parágrafo normal
    result.push(
      <p key={i} className="text-[13px] leading-relaxed text-[#374151]">
        {parseInline(line)}
      </p>
    )
    i++
  }

  return result
}

function parseInline(text: string): React.ReactNode {
  // Negrito
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-[#0f0f0f]">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="px-1 py-0.5 rounded text-[11px] font-mono bg-[#f1f5f9] text-[#e11d48] border border-[#e2e8f0]">{part.slice(1, -1)}</code>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>
    }
    return part
  })
}

// ── Bubble de mensagem ──────────────────────────────────────────────────────────
function MessageBubble({
  message,
  isStreaming = false,
  streamContent = '',
}: {
  message?: AIMessage
  isStreaming?: boolean
  streamContent?: string
}) {
  const isUser = message?.role === 'user'
  const content = isStreaming ? streamContent : (message?.content ?? '')

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%]">
          <div className="bg-[#0f0f0f] text-white rounded-2xl rounded-tr-sm px-4 py-3 text-[13px] leading-relaxed shadow-sm">
            {content}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 mb-4">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shadow-sm mt-0.5">
        <Bot className="w-3.5 h-3.5" style={{ color: '#ffffff' }} />
      </div>
      <div className="flex-1 min-w-0">
        {message?.web_search && (
          <div className="flex items-center gap-1.5 mb-1.5 text-[11px] text-[#64748b]">
            <Globe className="w-3 h-3" />
            <span>Busca web ativa</span>
          </div>
        )}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          {isStreaming && !content ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[12px] text-[#94a3b8]">Pensando…</span>
            </div>
          ) : (
            <div className="space-y-0.5">
              {formatMessage(content)}
              {isStreaming && <span className="inline-block w-0.5 h-4 bg-[#6366f1] animate-pulse ml-0.5 align-middle" />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sugestões iniciais ──────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: TrendingUp, text: 'Quais são as tendências do Instagram para este mês?', web: true },
  { icon: FileText, text: 'Crie um calendário editorial para uma clínica de estética', web: false },
  { icon: Lightbulb, text: 'Como precificar meus serviços de social media em 2025?', web: false },
  { icon: Sparkles, text: 'Escreva 5 hooks virais para Reels de um pet shop', web: false },
]

// ── Componente principal ────────────────────────────────────────────────────────
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

  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pickerRef      = useRef<HTMLDivElement>(null)
  const squadPickerRef = useRef<HTMLDivElement>(null)

  const { data: sessions = [], isLoading: sessionsLoading } = useAISessions()
  const { data: messages = [], isLoading: messagesLoading } = useAIMessages(activeSessionId)
  const { data: clients  = [] }                             = useClients()
  const { data: clientCtx }                                 = useClientContext(activeClientId)
  const deleteSession = useDeleteSession()

  const effectiveSessionId = activeSessionId ?? pendingSessionId

  const { sendMessage, isStreaming, isLoading, streamingContent, stopGeneration, memoriesSaved, clearMemoriesSaved } = useAIChat(effectiveSessionId)

  // Fecha os pickers ao clicar fora
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setClientPickerOpen(false)
      }
      if (squadPickerRef.current && !squadPickerRef.current.contains(e.target as Node)) {
        setSquadPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Toast quando memórias são salvas
  useEffect(() => {
    if (memoriesSaved.length === 0) return
    setMemoryToast(memoriesSaved)
    clearMemoriesSaved()
    const t = setTimeout(() => setMemoryToast([]), 4000)
    return () => clearTimeout(t)
  }, [memoriesSaved, clearMemoriesSaved])

  // Scroll para o final quando mensagens mudam
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamingContent])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [input])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming || isLoading) return
    const text = input.trim()
    setInput('')

    await sendMessage(text, messages, webSearch, (session) => {
      setActiveSessionId(session.id)
      setPendingSessionId(null)
    }, clientCtx?.contextString ?? null, activeClientId, activeSquad?.systemPrompt ?? null)
  }, [input, isStreaming, isLoading, sendMessage, messages, webSearch, clientCtx, activeSquad])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewChat = () => {
    setActiveSessionId(null)
    setPendingSessionId(null)
    setInput('')
    setWebSearch(false)
    setActiveSquad(null)
  }

  const handleSuggestion = async (text: string, web: boolean) => {
    setWebSearch(web)
    setInput(text)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteSession.mutate(id)
    if (activeSessionId === id) handleNewChat()
  }

  const isEmpty = !activeSessionId && !pendingSessionId
  const hasMessages = messages.length > 0

  return (
    <div className="flex h-screen bg-[#f5f7fb] overflow-hidden">

      {/* ── Sidebar de sessões ──────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex flex-col bg-white border-r border-[#e2e8f0] flex-shrink-0 transition-all duration-200 overflow-hidden',
          sidebarOpen ? 'w-64' : 'w-0'
        )}
      >
        {/* Header sidebar */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-[#e2e8f0] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
              <Sparkles className="w-3 h-3" style={{ color: '#ffffff' }} />
            </div>
            <span className="text-[13px] font-semibold text-[#0f0f0f]">IA StatusBrand</span>
          </div>
        </div>

        {/* Nova conversa */}
        <div className="px-3 py-3 border-b border-[#f0f0f0]">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0f0f0f] text-[13px] font-medium transition-all hover:bg-[#1a1a1a]"
            style={{ color: '#ffffff' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Nova conversa
          </button>
        </div>

        {/* Lista de sessões */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-[#94a3b8]" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <MessageSquare className="w-8 h-8 text-[#cbd5e1] mx-auto mb-2" />
              <p className="text-[11px] text-[#94a3b8]">Nenhuma conversa ainda</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-[12px] transition-all group',
                    activeSessionId === session.id
                      ? 'bg-[#f0f0f0] text-[#0f0f0f]'
                      : 'text-[#374151] hover:bg-[#f5f5f5]'
                  )}
                >
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-[#94a3b8]" />
                  <span className="flex-1 truncate">{session.title}</span>
                  <button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 hover:text-red-500 transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-4 py-3 border-t border-[#f0f0f0]">
          <p className="text-[10px] text-[#94a3b8] leading-relaxed">
            Powered by GPT-4o · Respostas com IA podem conter imprecisões
          </p>
        </div>
      </div>

      {/* ── Área principal ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <div className="h-14 flex items-center gap-3 px-4 bg-white border-b border-[#e2e8f0] flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f5f5] transition-colors flex-shrink-0 text-[#374151]"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
              <Bot className="w-3 h-3" style={{ color: '#ffffff' }} />
            </div>
            <p className="text-[13px] font-semibold text-[#0f0f0f] leading-none">
              {activeSessionId
                ? (sessions.find(s => s.id === activeSessionId)?.title ?? 'Conversa')
                : 'Nova conversa'}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">

            {/* ── Seletor de contexto de cliente ────────────────────── */}
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setClientPickerOpen(o => !o)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all',
                  activeClientId && clientCtx
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-[#f5f5f5] border-[#e8e8e8] text-[#64748b] hover:border-[#d0d0d0]'
                )}
              >
                {activeClientId && clientCtx ? (
                  <>
                    <Building2 className="w-3 h-3" />
                    <span className="max-w-[140px] truncate">{clientCtx.client.company_name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveClientId(null) }}
                      className="ml-0.5 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <Users className="w-3 h-3" />
                    <span>Contexto do cliente</span>
                    <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>

              {/* Dropdown de clientes */}
              {clientPickerOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-[#e2e8f0] rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-[#f0f0f0]">
                    <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide">
                      Selecionar cliente
                    </p>
                    <p className="text-[10px] text-[#94a3b8] mt-0.5">
                      A IA vai usar os dados do cliente selecionado
                    </p>
                  </div>
                  <div className="max-h-56 overflow-y-auto py-1">
                    {clients.length === 0 ? (
                      <p className="px-3 py-3 text-[12px] text-[#94a3b8]">Nenhum cliente cadastrado</p>
                    ) : (
                      clients.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setActiveClientId(c.id); setClientPickerOpen(false) }}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#f5f5f5] transition-colors',
                            activeClientId === c.id && 'bg-emerald-50'
                          )}
                        >
                          <div className="w-7 h-7 rounded-lg bg-[#f0f0f0] flex items-center justify-center flex-shrink-0">
                            <span className="text-[11px] font-semibold text-[#374151]">
                              {c.company_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-[#0f0f0f] truncate">{c.company_name}</p>
                            <p className="text-[10px] text-[#94a3b8] truncate">{c.niche}</p>
                          </div>
                          {activeClientId === c.id && (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                  {activeClientId && (
                    <div className="border-t border-[#f0f0f0] px-3 py-2">
                      <button
                        onClick={() => { setActiveClientId(null); setClientPickerOpen(false) }}
                        className="text-[11px] text-red-500 hover:text-red-600 flex items-center gap-1.5"
                      >
                        <X className="w-3 h-3" />
                        Remover contexto
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botão de memórias (só quando cliente ativo) */}
            {activeClientId && clientCtx && (
              <button
                onClick={() => setMemoryPanelOpen(o => !o)}
                title="Ver memórias do cliente"
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[12px] font-medium border transition-all',
                  memoryPanelOpen
                    ? 'bg-[#6d28d9] border-[#5b21b6] text-white'
                    : 'bg-[#faf5ff] border-[#ddd6fe] text-[#7c3aed] hover:bg-[#ede9fe]'
                )}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Memórias</span>
              </button>
            )}

            {/* Seletor de squad */}
            <div className="relative" ref={squadPickerRef}>
              <button
                onClick={() => setSquadPickerOpen(o => !o)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all',
                  activeSquad
                    ? 'border-[#c4b5fd] text-[#5b21b6]'
                    : 'bg-[#f5f5f5] border-[#e8e8e8] text-[#64748b] hover:border-[#d0d0d0]'
                )}
                style={activeSquad ? { backgroundColor: activeSquad.color.bg } : {}}
              >
                {activeSquad ? (
                  <>
                    <span>{activeSquad.emoji}</span>
                    <span className="max-w-[120px] truncate">{activeSquad.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveSquad(null) }}
                      className="ml-0.5 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>Squad</span>
                    {squadPickerOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </>
                )}
              </button>

              {/* Dropdown de squads */}
              {squadPickerOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-[#e2e8f0] rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-[#f0f0f0]">
                    <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide">Times especializados</p>
                    <p className="text-[10px] text-[#94a3b8] mt-0.5">Ativa um squad para respostas especializadas</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
                    {AI_SQUADS.map(squad => (
                      <button
                        key={squad.id}
                        onClick={() => { setActiveSquad(squad); setSquadPickerOpen(false) }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                          activeSquad?.id === squad.id
                            ? 'ring-1'
                            : 'hover:bg-[#f5f5f5]'
                        )}
                        style={activeSquad?.id === squad.id ? {
                          backgroundColor: squad.color.bg,
                          ringColor: squad.color.border,
                        } : {}}
                      >
                        <span className="text-[16px] flex-shrink-0">{squad.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-[#0f0f0f] leading-none mb-0.5">{squad.name}</p>
                          <p className="text-[10px] text-[#64748b] truncate">{squad.description}</p>
                        </div>
                        {activeSquad?.id === squad.id && (
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: squad.color.dot }} />
                        )}
                      </button>
                    ))}
                  </div>
                  {activeSquad && (
                    <div className="border-t border-[#f0f0f0] px-3 py-2">
                      <button
                        onClick={() => { setActiveSquad(null); setSquadPickerOpen(false) }}
                        className="text-[11px] text-red-500 hover:text-red-600 flex items-center gap-1.5"
                      >
                        <X className="w-3 h-3" />
                        Remover squad
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Badge de modelo */}
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
              webSearch
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-[#f5f5f5] border-[#e8e8e8] text-[#64748b]'
            )}>
              {webSearch ? <Globe className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
              {webSearch ? 'gpt-4o-search' : 'gpt-4o'}
            </div>
          </div>
        </div>

        {/* Banner de contexto ativo */}
        {activeClientId && clientCtx && (
          <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex-shrink-0">
            <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-2.5 h-2.5" style={{ color: '#ffffff' }} />
            </div>
            <p className="text-[12px] text-emerald-800 flex-1">
              <span className="font-semibold">{clientCtx.client.company_name}</span>
              {' '}— contexto ativo · nicho: {clientCtx.client.niche}
              {clientCtx.client.instagram && ` · @${clientCtx.client.instagram.replace('@', '')}`}
            </p>
            <button
              onClick={() => setActiveClientId(null)}
              className="text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Banner de squad ativo */}
        {activeSquad && (
          <div
            className="flex items-center gap-2.5 px-4 py-2 border-b flex-shrink-0"
            style={{ backgroundColor: activeSquad.color.bg, borderColor: activeSquad.color.border }}
          >
            <span className="text-[14px]">{activeSquad.emoji}</span>
            <p className="text-[12px] flex-1" style={{ color: activeSquad.color.text }}>
              <span className="font-semibold">{activeSquad.name}</span>
              {' '}· {activeSquad.agents}
            </p>
            <button
              onClick={() => setActiveSquad(null)}
              style={{ color: activeSquad.color.text, opacity: 0.6 }}
              className="hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Área de mensagens ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty && !hasMessages ? (
            /* Tela de boas-vindas */
            <div className="flex flex-col items-center min-h-full px-6 py-10 overflow-y-auto">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center mb-4 shadow-lg">
                <Sparkles className="w-7 h-7" style={{ color: '#ffffff' }} />
              </div>
              <h1 className="text-[20px] font-bold text-[#0f0f0f] mb-1 text-center">
                Como posso ajudar?
              </h1>
              <p className="text-[13px] text-[#64748b] text-center max-w-md mb-8">
                Sou especialista em Social Media e Marketing Digital. Ative um squad especializado ou escreva diretamente.
              </p>

              {/* Grid de squads */}
              <div className="w-full max-w-3xl mb-8">
                <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">
                  Times especializados — clique para ativar
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {AI_SQUADS.map(squad => (
                    <button
                      key={squad.id}
                      onClick={() => setActiveSquad(s => s?.id === squad.id ? null : squad)}
                      className={cn(
                        'flex flex-col items-start gap-1.5 p-3.5 rounded-xl text-left border transition-all',
                        activeSquad?.id === squad.id
                          ? 'shadow-sm ring-1'
                          : 'bg-white border-[#e2e8f0] hover:border-[#c4b5fd] hover:shadow-sm'
                      )}
                      style={activeSquad?.id === squad.id ? {
                        backgroundColor: squad.color.bg,
                        borderColor: squad.color.border,
                      } : {}}
                    >
                      <span className="text-[18px]">{squad.emoji}</span>
                      <div>
                        <p className="text-[11px] font-semibold text-[#0f0f0f] leading-tight">{squad.name}</p>
                        <p className="text-[10px] text-[#94a3b8] leading-tight mt-0.5 line-clamp-2">{squad.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Banner do squad selecionado */}
              {activeSquad && (
                <div
                  className="w-full max-w-3xl rounded-xl p-4 mb-6 border"
                  style={{ backgroundColor: activeSquad.color.bg, borderColor: activeSquad.color.border }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-semibold mb-0.5" style={{ color: activeSquad.color.text }}>
                        {activeSquad.emoji} {activeSquad.name} ativado
                      </p>
                      <p className="text-[11px]" style={{ color: activeSquad.color.text, opacity: 0.8 }}>
                        {activeSquad.agents}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveSquad(null)}
                      style={{ color: activeSquad.color.text, opacity: 0.5 }}
                      className="hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sugestões rápidas */}
              <div className="w-full max-w-3xl">
                <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">
                  Sugestões rápidas
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestion(s.text, s.web)}
                      className="flex items-start gap-3 p-4 bg-white border border-[#e2e8f0] rounded-xl text-left hover:border-[#6366f1]/40 hover:bg-[#f5f3ff] transition-all group shadow-sm"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#f5f3ff] border border-[#e0d9ff] flex items-center justify-center flex-shrink-0 group-hover:bg-[#ede9ff]">
                        <s.icon className="w-3.5 h-3.5 text-[#6366f1]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-[#374151] leading-relaxed">{s.text}</p>
                        {s.web && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <Globe className="w-2.5 h-2.5 text-blue-500" />
                            <span className="text-[10px] text-blue-500 font-medium">Busca web</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Mensagens */
            <div className="max-w-3xl mx-auto px-4 py-6">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-[#94a3b8]" />
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}

                  {/* Mensagem em streaming */}
                  {(isLoading || isStreaming) && (
                    <MessageBubble
                      isStreaming
                      streamContent={streamingContent}
                    />
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Input ──────────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-white border-t border-[#e2e8f0] px-4 py-3">
          <div className="max-w-3xl mx-auto">

            {/* Aviso de busca web */}
            {webSearch && (
              <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
                <Globe className="w-3 h-3 text-blue-500 flex-shrink-0" />
                <p className="text-[11px] text-blue-700">
                  Busca web ativa — o agente vai pesquisar informações atualizadas antes de responder.
                </p>
              </div>
            )}

            <div className="flex items-end gap-2 bg-[#f5f7fb] border border-[#e2e8f0] rounded-2xl px-3 py-2 focus-within:border-[#6366f1]/50 focus-within:ring-2 focus-within:ring-[#6366f1]/10 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre estratégias, tendências, conteúdo…"
                rows={1}
                disabled={isLoading || isStreaming}
                className="flex-1 bg-transparent text-[13px] text-[#0f0f0f] placeholder:text-[#94a3b8] resize-none outline-none py-1.5 min-h-[38px] max-h-[160px] leading-relaxed disabled:opacity-50"
                style={{ scrollbarWidth: 'none' }}
              />

              {/* Controles */}
              <div className="flex items-center gap-1 flex-shrink-0 pb-1">
                {/* Toggle busca web */}
                <button
                  onClick={() => setWebSearch(w => !w)}
                  title={webSearch ? 'Desativar busca web' : 'Ativar busca web (tendências atuais)'}
                  disabled={isLoading || isStreaming}
                  className={cn(
                    'w-8 h-8 flex items-center justify-center rounded-xl transition-all disabled:opacity-40',
                    webSearch
                      ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                      : 'text-[#94a3b8] hover:bg-[#e8e8e8] hover:text-[#374151]'
                  )}
                >
                  {webSearch ? <Globe className="w-4 h-4" /> : <GlobeLock className="w-4 h-4" />}
                </button>

                {/* Parar / Enviar */}
                {(isStreaming || isLoading) ? (
                  <button
                    onClick={stopGeneration}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                    title="Parar geração"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#0f0f0f] text-white hover:bg-[#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-[10px] text-[#94a3b8] text-center mt-2">
              Enter para enviar · Shift+Enter para nova linha · 🌐 ativa busca web em tempo real
            </p>
          </div>
        </div>
      </div>

      {/* ── Painel de memórias ──────────────────────────────────────────────── */}
      {memoryPanelOpen && activeClientId && clientCtx && (
        <AIMemoryPanel
          client={clientCtx.client}
          onClose={() => setMemoryPanelOpen(false)}
        />
      )}

      {/* ── Toast de memória salva ──────────────────────────────────────────── */}
      {memoryToast.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex items-start gap-3 bg-[#1e1b4b] rounded-2xl px-4 py-3 shadow-xl max-w-xs">
            <div className="w-7 h-7 rounded-xl bg-[#6d28d9] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Brain className="w-3.5 h-3.5" style={{ color: '#ffffff' }} />
            </div>
            <div>
              <p className="text-[12px] font-semibold leading-none mb-1" style={{ color: '#ffffff' }}>
                Memória salva!
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {memoryToast.length === 1
                  ? `Aprendi: "${memoryToast[0].replace(/_/g, ' ')}"`
                  : `${memoryToast.length} novos aprendizados sobre este cliente`}
              </p>
            </div>
            <button onClick={() => setMemoryToast([])} style={{ color: 'rgba(255,255,255,0.5)' }} className="flex-shrink-0 mt-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
