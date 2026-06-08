// ── ai-chat: streaming com limites por plano + visão + geração de imagens ──────

import { createClient } from 'npm:@supabase/supabase-js@2'
import OpenAI, { toFile } from 'npm:openai@4'

const OPENAI_API_KEY       = Deno.env.get('OPENAI_API_KEY') ?? ''
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const AI_LIMITS: Record<string, number> = { starter: 150, pro: 600, agency: 2000 }

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function getUser(req: Request) {
  const auth = req.headers.get('Authorization')
  if (!auth) return null
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data: { user } } = await sb.auth.getUser(auth.replace('Bearer ', ''))
  return user
}

async function checkUsage(userId: string, cost = 1): Promise<{ allowed: boolean; plan: string; limit: number; reason?: string }> {
  const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const month = new Date().toISOString().slice(0, 7)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sub } = await (sb as any).from('subscriptions').select('plan, status, trial_ends_at').eq('user_id', userId).maybeSingle()
  const plan   = sub?.plan ?? 'starter'
  const status = sub?.status ?? 'inactive'

  const isActive = status === 'active'
    || (status === 'trialing' && sub?.trial_ends_at && new Date(sub.trial_ends_at) > new Date())

  if (!isActive) return { allowed: false, plan, limit: 0, reason: 'subscription_inactive' }

  const limit = AI_LIMITS[plan] ?? 50

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: usage } = await (sb as any).from('ai_usage').select('requests').eq('user_id', userId).eq('month', month).maybeSingle()
  const current = usage?.requests ?? 0
  if (current + cost > limit) return { allowed: false, plan, limit, reason: 'limit_reached' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb as any).from('ai_usage').upsert(
    { user_id: userId, month, requests: current + cost, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,month' },
  )
  return { allowed: true, plan, limit }
}

// ── Multimodal: converte conteúdo com [[IMG:url]] para o formato da OpenAI ──
type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail: 'auto' } }

function hasImages(content: string): boolean {
  return content.includes('[[IMG:')
}

function buildContentParts(content: string): ContentPart[] {
  const parts: ContentPart[] = []
  const regex = /\[\[IMG:([\s\S]*?)\]\]/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index).trim()
    if (before) parts.push({ type: 'text', text: before })
    parts.push({ type: 'image_url', image_url: { url: match[1], detail: 'auto' } })
    lastIndex = match.index + match[0].length
  }

  const after = content.slice(lastIndex).trim()
  if (after) parts.push({ type: 'text', text: after })

  return parts.length > 0 ? parts : [{ type: 'text', text: content }]
}

// ── Constrói array de mensagens no formato OpenAI ──────────────────────────
function buildMessages(
  systemPrompt: string,
  messages: { role: string; content: string }[],
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const result: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ]

  for (const m of messages) {
    if (m.role === 'user' && hasImages(m.content)) {
      result.push({ role: 'user', content: buildContentParts(m.content) as OpenAI.Chat.ChatCompletionContentPart[] })
    } else if (m.role === 'user') {
      result.push({ role: 'user', content: m.content })
    } else if (m.role === 'assistant') {
      // Remove [[GENERATED_IMAGE:...]] markers from assistant history (só guarda o texto)
      const text = m.content.replace(/\[\[GENERATED_IMAGE:[\s\S]*?\]\]/g, '[imagem gerada]')
      result.push({ role: 'assistant', content: text })
    }
  }

  return result
}

// ── SSE helper ─────────────────────────────────────────────────────────────
function sseResponse(content: string) {
  return new Response(
    `data: ${JSON.stringify({ content })}\n\ndata: [DONE]\n\n`,
    { headers: { ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } },
  )
}

// ── Converte data URL (base64) em bytes + mime ─────────────────────────────
function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const [meta, b64] = dataUrl.split(',')
  const mime = meta.match(/data:(.*?);base64/)?.[1] ?? 'image/png'
  const bin = atob(b64 ?? '')
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return { bytes, mime }
}

// ── Serve ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const user = await getUser(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Não autenticado' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const { messages, systemPrompt, useWebSearch, generateImage } = await req.json()

  // ── Geração de imagem (DALL-E 3) — conta como 5 requests ────────────────
  if (generateImage) {
    const { allowed, plan, limit, reason } = await checkUsage(user.id, 5)
    if (!allowed) {
      const msg = reason === 'subscription_inactive'
        ? 'Assinatura inativa. Assine um plano para usar a IA.'
        : `Limite do plano ${plan} atingido (${limit} requests/mês). Faça upgrade para continuar.`
      return new Response(JSON.stringify({ error: msg }), {
        status: 429, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const userPrompt = messages[messages.length - 1]?.content ?? ''
    // Imagens de referência anexadas (para edição/geração guiada)
    const refImages = [...userPrompt.matchAll(/\[\[IMG:([\s\S]*?)\]\]/g)].map(m => m[1]).slice(0, 4)
    // Remove os marcadores [[IMG:...]] da prompt
    const cleanPrompt = userPrompt.replace(/\[\[IMG:[\s\S]*?\]\]/g, '').trim() || 'imagem'

    // ── Monta um prompt de imagem otimizado a partir da conversa ────────────
    // Sem isso, cada geração usa só a última mensagem e os follow-ups
    // ("sem essas cores", "tira o fundo branco") perdem o contexto.
    let builtPrompt = cleanPrompt
    try {
      const stripMarkers = (t: string) => t
        .replace(/\[\[IMG:[\s\S]*?\]\]/g, '[imagem de referência enviada pelo usuário]')
        .replace(/\[\[GENERATED_IMAGE:[\s\S]*?\]\]/g, '[imagem que você gerou antes]')
      const history = (messages as { role: string; content: string }[])
        .slice(-8)
        .map(m => ({
          role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
          content: stripMarkers(m.content),
        }))
      const PROMPT_SYS = `Você é um engenheiro de prompts para um modelo de geração de imagens.
Com base na conversa, escreva UM ÚNICO prompt detalhado e visual descrevendo exatamente a imagem a gerar AGORA.
Regras:
- Considere o histórico: se o usuário pediu ajustes numa imagem anterior ("sem essas cores", "tira o fundo branco", "deixa mais escuro"), aplique-os ao novo prompt.
- Especifique estilo, paleta de cores (use os códigos hex quando o usuário informar), composição/layout, fundo e, se houver logo de referência, como incorporá-la fielmente.
- Liste qualquer texto que deva aparecer na imagem EXATAMENTE como deve ser escrito, entre aspas.
- Escreva o prompt em inglês (gera melhor), mas mantenha textos que aparecem na imagem no idioma original.
- Responda SOMENTE com o prompt final, sem comentários.`
      // Contexto da marca/cliente e do squad ativo (se houver) — para que cores,
      // tom e estilo entrem automaticamente na imagem.
      const brandCtx = (systemPrompt ?? '').toString().slice(0, 4000)
      const pr = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: PROMPT_SYS },
          ...(brandCtx
            ? [{ role: 'system' as const, content: `Contexto da marca/cliente e do time ativo (aplique cores, tom e estilo quando fizer sentido):\n${brandCtx}` }]
            : []),
          ...history,
        ] as OpenAI.Chat.ChatCompletionMessageParam[],
        max_tokens: 600,
      })
      const out = pr.choices[0]?.message?.content?.trim()
      if (out) builtPrompt = out
    } catch {
      builtPrompt = cleanPrompt
    }

    // Família gpt-image (dall-e-3 foi descontinuado). Tenta na ordem de qualidade
    // e cai para o próximo se um modelo falhar (ex: exigir verificação da org).
    // Esses modelos retornam a imagem em base64 (b64_json), não em URL.
    const IMAGE_MODELS = ['gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini']
    let imgUrl = ''
    let lastErr = 'modelo de imagem indisponível'
    for (const model of IMAGE_MODELS) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let imgRes: any
        if (refImages.length > 0) {
          // Edição/geração guiada usando as imagens enviadas como referência
          const files = await Promise.all(refImages.map(async (durl, idx) => {
            const { bytes, mime } = dataUrlToBytes(durl)
            const ext = (mime.split('/')[1] ?? 'png').replace('jpeg', 'jpg')
            return await toFile(bytes, `ref-${idx}.${ext}`, { type: mime })
          }))
          imgRes = await openai.images.edit({
            model,
            image: files.length === 1 ? files[0] : files,
            prompt: builtPrompt,
            n: 1,
            size: '1024x1024',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
        } else {
          imgRes = await openai.images.generate({ model, prompt: builtPrompt, n: 1, size: '1024x1024' })
        }
        const d = imgRes.data?.[0]
        imgUrl = d?.b64_json ? `data:image/png;base64,${d.b64_json}` : (d?.url ?? '')
        if (imgUrl) break
        lastErr = 'resposta vazia do modelo de imagem'
      } catch (err: unknown) {
        lastErr = err instanceof Error ? err.message : String(err)
        // tenta o próximo modelo da família
      }
    }
    if (imgUrl) {
      return sseResponse(`🎨 Imagem gerada com sucesso!\n\n[[GENERATED_IMAGE:${imgUrl}]]`)
    }
    return sseResponse(`❌ Erro ao gerar imagem: ${lastErr}`)
  }

  // ── Chat normal / visão ──────────────────────────────────────────────────
  const { allowed, plan, limit, reason } = await checkUsage(user.id, 1)
  if (!allowed) {
    const msg = reason === 'subscription_inactive'
      ? 'Assinatura inativa. Assine um plano para usar a IA.'
      : `Limite do plano ${plan} atingido (${limit} requests/mês). Faça upgrade para continuar.`
    return new Response(JSON.stringify({ error: msg }), {
      status: 429, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const allMessages = buildMessages(systemPrompt, messages)
  const encoder     = new TextEncoder()

  // Detecta se há imagens nas mensagens (visão)
  const hasVision = messages.some((m: { role: string; content: string }) => m.role === 'user' && hasImages(m.content))

  if (useWebSearch) {
    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-search-preview',
        messages: allMessages,
        stream: false,
        max_tokens: 2048,
      } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming)
      const content = res.choices[0]?.message?.content ?? ''
      return sseResponse(content)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return sseResponse(`❌ Erro: ${msg}`)
    }
  }

  // Usa gpt-4o para visão, gpt-4o-mini para texto
  const model = hasVision ? 'gpt-4o' : 'gpt-4o-mini'

  // Cria o stream com try/catch para que erros da OpenAI voltem COM headers CORS
  // (sem isso, uma exceção aqui gera um 500 sem CORS e o browser mostra "Failed to fetch")
  let stream
  try {
    stream = await openai.chat.completions.create({
      model,
      messages: allMessages,
      stream: true,
      max_tokens: 2048,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return sseResponse(`❌ Erro: ${msg}`)
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? ''
          if (delta) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`))
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } finally { controller.close() }
    },
  })

  return new Response(readable, {
    headers: { ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
})
