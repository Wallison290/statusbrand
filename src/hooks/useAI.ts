import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import OpenAI from 'openai'
import { supabase } from '@/integrations/supabase/client'

// ── Cliente OpenAI ─────────────────────────────────────────────────────────────
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY ?? '',
  dangerouslyAllowBrowser: true,
})

// ── System prompt ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Você é um assistente de IA especializado em Social Media e Marketing Digital, integrado ao sistema StatusBrand — uma plataforma de gestão para agências de social media.

Você ajuda profissionais de social media e gestores de agências com:
• Estratégias de conteúdo para Instagram, TikTok, LinkedIn e outras plataformas
• Análise de tendências, hashtags e oportunidades de nicho
• Copywriting, roteiros de Reels, scripts e legendas
• Planejamento editorial e calendário de conteúdo
• Análise de métricas e performance de perfis
• Propostas comerciais, precificação para agências e apresentações
• Técnicas de crescimento orgânico, engajamento e algoritmos
• Estratégias de tráfego pago (Meta Ads, Google Ads, TikTok Ads)
• Identidade de marca, tom de voz e posicionamento
• Scripts de vendas, follow-up e gestão de clientes

Quando solicitado, busque informações atualizadas sobre tendências para dar respostas mais precisas e relevantes.

Responda sempre em português brasileiro. Seja direto, objetivo e orientado a resultados práticos. Use linguagem profissional mas acessível, como um especialista sênior conversando com um colega.

Data atual: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`

// ── Tipos ──────────────────────────────────────────────────────────────────────
export interface AIMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  web_search?: boolean
  created_at: string
}

export interface AISession {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

// ── Hooks de sessão ────────────────────────────────────────────────────────────
export function useAISessions() {
  return useQuery({
    queryKey: ['ai_sessions'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('ai_sessions')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as AISession[]
    },
  })
}

export function useAIMessages(sessionId: string | null) {
  return useQuery({
    queryKey: ['ai_messages', sessionId],
    queryFn: async () => {
      if (!sessionId) return []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('ai_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as AIMessage[]
    },
    enabled: !!sessionId,
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (title: string = 'Nova conversa') => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('ai_sessions')
        .insert({ user_id: user.id, title })
        .select()
        .single()
      if (error) throw error
      return data as AISession
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai_sessions'] }),
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('ai_sessions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai_sessions'] }),
  })
}

// ── Hook principal de chat ─────────────────────────────────────────────────────
export function useAIChat(sessionId: string | null) {
  const qc = useQueryClient()
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming]   = useState(false)
  const [isLoading, setIsLoading]       = useState(false)
  const streamRef = useRef<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk> | null>(null)

  const sendMessage = useCallback(async (
    content: string,
    history: AIMessage[],
    useWebSearch = false,
    onSessionCreated?: (session: AISession) => void,
  ) => {
    if (!content.trim()) return
    if (isStreaming || isLoading) return

    let activeSessionId = sessionId

    // Cria sessão se não existe
    if (!activeSessionId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const title = content.slice(0, 60) + (content.length > 60 ? '…' : '')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: session, error } = await (supabase as any)
        .from('ai_sessions')
        .insert({ user_id: user.id, title })
        .select()
        .single()
      if (error || !session) return
      activeSessionId = (session as AISession).id
      qc.invalidateQueries({ queryKey: ['ai_sessions'] })
      onSessionCreated?.(session as AISession)
    }

    // Salva mensagem do usuário no Supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userMsg } = await (supabase as any)
      .from('ai_messages')
      .insert({ session_id: activeSessionId, role: 'user', content, web_search: useWebSearch })
      .select()
      .single()

    // Atualiza cache local imediatamente
    if (userMsg) {
      qc.setQueryData<AIMessage[]>(['ai_messages', activeSessionId], prev =>
        [...(prev ?? []), userMsg as AIMessage]
      )
    }

    // Prepara histórico para OpenAI
    const chatHistory = [
      ...history,
      ...(userMsg ? [userMsg as AIMessage] : []),
    ].map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    // Modelo: usa gpt-4o-search-preview quando busca web está ativa
    const model = useWebSearch ? 'gpt-4o-search-preview' : 'gpt-4o'

    setIsLoading(true)
    setStreamingContent('')

    let fullContent = ''

    try {
      const stream = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...chatHistory,
        ],
        stream: true,
        max_tokens: 2048,
      })

      streamRef.current = stream as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
      setIsLoading(false)
      setIsStreaming(true)

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        if (delta) {
          fullContent += delta
          setStreamingContent(prev => prev + delta)
        }
      }
    } catch (err) {
      setIsLoading(false)
      setIsStreaming(false)
      setStreamingContent('')
      fullContent = '❌ Erro ao processar a mensagem. Verifique a chave da API e tente novamente.'
    }

    // Salva resposta do assistente no Supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: aiMsg } = await (supabase as any)
      .from('ai_messages')
      .insert({
        session_id: activeSessionId,
        role: 'assistant',
        content: fullContent,
        web_search: useWebSearch,
      })
      .select()
      .single()

    // Atualiza cache com mensagem final
    if (aiMsg) {
      qc.setQueryData<AIMessage[]>(['ai_messages', activeSessionId], prev => [
        ...(prev ?? []).filter(m => m.id !== 'streaming'),
        aiMsg as AIMessage,
      ])
    }

    // Atualiza título da sessão com a primeira mensagem (se for genérico)
    const currentSessions = qc.getQueryData<AISession[]>(['ai_sessions']) ?? []
    const currentSession  = currentSessions.find(s => s.id === activeSessionId)
    if (currentSession?.title === 'Nova conversa') {
      const title = content.slice(0, 60) + (content.length > 60 ? '…' : '')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('ai_sessions').update({ title }).eq('id', activeSessionId!)
      qc.invalidateQueries({ queryKey: ['ai_sessions'] })
    }

    setIsStreaming(false)
    setStreamingContent('')
  }, [sessionId, isStreaming, isLoading, qc])

  const stopGeneration = useCallback(() => {
    setIsStreaming(false)
    setStreamingContent('')
  }, [])

  return { sendMessage, isStreaming, isLoading, streamingContent, stopGeneration }
}
