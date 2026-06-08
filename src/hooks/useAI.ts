import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { callProxy, streamChat } from '@/lib/aiProxy'

// ── System prompt ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Você é um assistente de IA especializado em Social Media e Marketing Digital, integrado ao sistema StatusMedia — uma plataforma de gestão para agências de social media.

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

## Regra fundamental — você trabalha DENTRO da plataforma
Você NÃO acessa links, sites, perfis do Instagram, anúncios ou qualquer conteúdo externo por conta própria. Você trabalha exclusivamente com o que existe dentro do sistema:
• O contexto do cliente cadastrado (DNA da marca, nicho, tom de voz, persona, memórias)
• As informações que o usuário escrever ou colar na conversa
• As imagens e prints que o usuário enviar (você analisa imagens enviadas)
• O áudio que o usuário gravar (transcrito para texto)

Se um agente precisar analisar um perfil, site, concorrente ou anúncio, NUNCA finja ter acessado um link. Em vez disso, peça ao usuário para: colar o texto/bio/legendas, enviar prints da tela, ou descrever os dados. Quando não houver dados, use seu conhecimento de mercado e deixe claro que é uma estimativa baseada no nicho — sem inventar números específicos de um perfil que você não viu.

A ÚNICA exceção é quando a "Busca Web" estiver ativada pelo usuário: aí sim você pode trazer informações atualizadas da internet. Sem ela, trabalhe apenas com os dados internos acima.

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

// ── Extração de memória (background, via Edge Function) ───────────────────────
const MEMORY_EXTRACTION_PROMPT = `Você é um extrator de memórias para um sistema de gestão de social media.

Analise o par de mensagens abaixo e extraia APENAS decisões importantes, preferências confirmadas ou aprendizados específicos sobre o cliente que devam ser lembrados em conversas futuras.

Retorne JSON: { "memories": [{ "key": string, "value": string }] }
Retorne array vazio se não houver nada relevante.

Exemplos de memórias VÁLIDAS (específicas e acionáveis):
- { "key": "frequencia_posts", "value": "3 posts por semana no Instagram" }
- { "key": "melhor_horario", "value": "publicações às 18h-20h performam melhor" }
- { "key": "formato_preferido", "value": "cliente prefere carrosséis a posts simples" }
- { "key": "tom_ajustado", "value": "tom mais descontraído aprovado pelo cliente" }
- { "key": "restricao_conteudo", "value": "não mencionar concorrente X" }
- { "key": "campanha_ativa", "value": "promoção de julho para consultas particulares" }

NÃO extraia informações genéricas ou já presentes no cadastro do cliente.
Seja específico e conciso. Máximo 5 memórias por resposta.`

async function extractMemoriesBackground(
  userMessage: string,
  assistantResponse: string,
  clientId: string,
  userId: string,
  onMemoriesSaved: (keys: string[]) => void,
): Promise<void> {
  try {
    const { content } = await callProxy<{ content: string }>('memory-extract', {
      systemPrompt: MEMORY_EXTRACTION_PROMPT,
      userMessage,
      assistantResponse,
    })

    const parsed = JSON.parse(content ?? '{}') as { memories?: { key: string; value: string }[] }
    const memories = parsed.memories ?? []
    if (memories.length === 0) return

    const savedKeys: string[] = []
    for (const mem of memories) {
      if (!mem.key || !mem.value) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('ai_client_memory')
        .upsert(
          {
            client_id: clientId,
            user_id: userId,
            key: mem.key,
            value: mem.value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'client_id,user_id,key' }
        )
      if (!error) savedKeys.push(mem.key)
    }

    if (savedKeys.length > 0) onMemoriesSaved(savedKeys)
  } catch {
    // extração em background — falha silenciosa
  }
}

// ── Hook principal de chat ─────────────────────────────────────────────────────
export function useAIChat(sessionId: string | null) {
  const qc = useQueryClient()
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming]             = useState(false)
  const [isLoading, setIsLoading]                 = useState(false)
  const [memoriesSaved, setMemoriesSaved]         = useState<string[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  const clearMemoriesSaved = useCallback(() => setMemoriesSaved([]), [])

  // ── Detecção de intent de geração de imagem ────────────────────────────────
  // verbo de criação + (artigo/qualquer coisa curta) + substantivo visual
  const IMAGE_GEN_RE = /\b(crie|cria|criar|gere|gera|gerar|fa[çc]a|faz|fazer|desenh[ae]|ilustr[ae]|monte|monta|produza|produz|make|generate|create|draw)\b[\sa-zà-ú]{0,24}?\b(imagem|imagens|arte|ilustra[çc][ãa]o|desenho|logo|logotipo|banner|criativo|capa|thumbnail|figura|image)\b/i
  const IMAGE_GEN_DIRECT = ['dall-e', 'dall e', 'gerar imagem', 'gerar uma imagem']
  function isImageGenRequest(text: string): boolean {
    const lower = text.toLowerCase()
    return IMAGE_GEN_RE.test(lower) || IMAGE_GEN_DIRECT.some(kw => lower.includes(kw))
  }

  const sendMessage = useCallback(async (
    content: string,
    history: AIMessage[],
    useWebSearch = false,
    onSessionCreated?: (session: AISession) => void,
    clientContext?: string | null,
    clientId?: string | null,
    squadPrompt?: string | null,
    attachedImages?: string[],  // base64 data URLs
    forceImage = false,         // botão "Imagem" liga geração explicitamente
  ) => {
    if (!content.trim() && (!attachedImages || attachedImages.length === 0)) return
    if (isStreaming || isLoading) return

    // Monta conteúdo com imagens (marcadores [[IMG:...]])
    let fullContent = content.trim()
    if (attachedImages && attachedImages.length > 0) {
      const imgMarkers = attachedImages.map(url => `\n[[IMG:${url}]]`).join('')
      fullContent = fullContent ? `${fullContent}${imgMarkers}` : imgMarkers.trim()
    }

    // Gera imagem se: o botão Imagem estiver ligado (usa imagens anexadas como referência),
    // OU o texto pedir geração e NÃO houver imagem anexada (sem botão, imagem anexada = análise/visão).
    const generateImage = forceImage || (isImageGenRequest(fullContent) && !attachedImages?.length)

    let activeSessionId = sessionId

    // Cria sessão se não existe
    if (!activeSessionId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const title = (content || 'Imagem').slice(0, 60) + ((content || 'Imagem').length > 60 ? '…' : '')
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

    // Salva mensagem do usuário no Supabase (com conteúdo completo incluindo marcadores de imagem)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userMsg } = await (supabase as any)
      .from('ai_messages')
      .insert({ session_id: activeSessionId, role: 'user', content: fullContent, web_search: useWebSearch })
      .select()
      .single()

    if (userMsg) {
      qc.setQueryData<AIMessage[]>(['ai_messages', activeSessionId], prev =>
        [...(prev ?? []), userMsg as AIMessage]
      )
    }

    // Prepara histórico de chat (inclui mensagem atual com marcadores de imagem)
    const chatHistory = [
      ...history,
      ...(userMsg ? [userMsg as AIMessage] : [{ id: 'pending', session_id: activeSessionId!, role: 'user' as const, content: fullContent, created_at: new Date().toISOString() }]),
    ].map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    // Monta system prompt composto
    const systemParts = [SYSTEM_PROMPT]
    if (clientContext) systemParts.push(clientContext)
    if (squadPrompt) {
      systemParts.push(
        `⚠️ MODO SQUAD ATIVO — PRIORIDADE MÁXIMA
O usuário ativou um time especializado. A partir de agora você DEVE atuar estritamente como o squad descrito abaixo: apresente-se como esse time, siga o pipeline dele e conduza o usuário pelo fluxo do squad — mesmo que a pergunta seja genérica (ex: "o que você faz?"). Quando a pergunta for vaga, responda explicando o que ESTE squad entrega e faça a primeira pergunta do briefing dele. Não responda como um assistente genérico de social media.

${squadPrompt}`
      )
    }
    const systemContent = systemParts.join('\n\n')

    setIsLoading(true)
    setStreamingContent('')

    let aiResponse = ''

    // Cria AbortController para poder cancelar
    const abort = new AbortController()
    abortControllerRef.current = abort

    setIsLoading(false)
    setIsStreaming(true)

    try {
      aiResponse = await streamChat(
        chatHistory,
        systemContent,
        useWebSearch,
        (chunk) => setStreamingContent(prev => prev + chunk),
        abort.signal,
        generateImage,
      )
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Cancelado pelo usuário — mantém o que foi gerado até aqui
        aiResponse = streamingContent
      } else {
        const errMsg = err instanceof Error ? err.message : String(err)
        // eslint-disable-next-line no-console
        console.error('[useAI] chat error:', errMsg, err)
        aiResponse = `❌ Erro: ${errMsg}`
      }
    }

    // Salva resposta do assistente no Supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: aiMsg } = await (supabase as any)
      .from('ai_messages')
      .insert({
        session_id: activeSessionId,
        role: 'assistant',
        content: aiResponse,
        web_search: useWebSearch,
      })
      .select()
      .single()

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
      const displayContent = content || (attachedImages?.length ? 'Análise de imagem' : 'Nova conversa')
      const title = displayContent.slice(0, 60) + (displayContent.length > 60 ? '…' : '')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('ai_sessions').update({ title }).eq('id', activeSessionId!)
      qc.invalidateQueries({ queryKey: ['ai_sessions'] })
    }

    // Extração de memória em background (só se houver cliente e resposta válida)
    if (clientId && aiResponse && !aiResponse.startsWith('❌')) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        extractMemoriesBackground(content || 'análise de imagem', aiResponse, clientId, user.id, (keys) => {
          setMemoriesSaved(keys)
          qc.invalidateQueries({ queryKey: ['ai_client_memory', clientId] })
          qc.invalidateQueries({ queryKey: ['ai_client_context', clientId] })
        })
      }
    }

    setIsStreaming(false)
    setStreamingContent('')
  }, [sessionId, isStreaming, isLoading, qc, streamingContent])

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
    setStreamingContent('')
  }, [])

  return { sendMessage, isStreaming, isLoading, streamingContent, stopGeneration, memoriesSaved, clearMemoriesSaved }
}
