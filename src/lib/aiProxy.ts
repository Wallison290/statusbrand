// ── Camada de acesso às Edge Functions de IA ──────────────────────────────────
// Centraliza chamadas ao ai-proxy (non-streaming) e ai-chat (streaming/SSE)

import { supabase } from '@/integrations/supabase/client'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// ── Chamadas não-streaming (greeting, generate-content, improve-text, etc.) ────

export async function callProxy<T extends { content?: string | null }>(
  type: string,
  payload: unknown,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: { type, payload },
  })

  if (error) throw error
  if (data?.error) {
    const err = new Error(data.error) as Error & { status?: number }
    if (data.usage) err.message += ` (${data.usage.current}/${data.usage.limit})`
    throw err
  }

  return data as T
}

// ── Streaming de chat via SSE ──────────────────────────────────────────────────

export type ImageSize = '1024x1024' | '1024x1536' | '1536x1024'

export async function streamChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  systemPrompt: string,
  useWebSearch: boolean,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  generateImage = false,
  imageSize: ImageSize = '1024x1024',
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Não autenticado')

  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ messages, systemPrompt, useWebSearch, generateImage, size: imageSize }),
    signal,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.error ?? `HTTP ${response.status}`)
  }

  const reader  = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer       = ''
  let fullContent  = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
      try {
        const { content } = JSON.parse(line.slice(6)) as { content?: string }
        if (content) {
          fullContent += content
          onChunk(content)
        }
      } catch {
        // ignora linhas malformadas
      }
    }
  }

  return fullContent
}
