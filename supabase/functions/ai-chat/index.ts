// ── ai-chat: streaming com limites por plano ──────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2'
import OpenAI from 'npm:openai@4'

const OPENAI_API_KEY       = Deno.env.get('OPENAI_API_KEY') ?? ''
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const AI_LIMITS: Record<string, number> = { starter: 100, pro: 400, agency: 1500 }

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

async function checkUsage(userId: string): Promise<{ allowed: boolean; plan: string; limit: number; reason?: string }> {
  const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const month = new Date().toISOString().slice(0, 7)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sub } = await (sb as any).from('subscriptions').select('plan, status, trial_ends_at').eq('user_id', userId).maybeSingle()
  const plan   = sub?.plan ?? 'starter'
  const status = sub?.status ?? 'inactive'

  // Verifica assinatura ativa (active ou trialing dentro do prazo)
  const isActive = status === 'active'
    || (status === 'trialing' && sub?.trial_ends_at && new Date(sub.trial_ends_at) > new Date())

  if (!isActive) return { allowed: false, plan, limit: 0, reason: 'subscription_inactive' }

  const limit = AI_LIMITS[plan] ?? 50

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: usage } = await (sb as any).from('ai_usage').select('requests').eq('user_id', userId).eq('month', month).maybeSingle()
  const current = usage?.requests ?? 0
  if (current >= limit) return { allowed: false, plan, limit, reason: 'limit_reached' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb as any).from('ai_usage').upsert(
    { user_id: userId, month, requests: current + 1, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,month' },
  )
  return { allowed: true, plan, limit }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const user = await getUser(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Não autenticado' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const { allowed, plan, limit, reason } = await checkUsage(user.id)
  if (!allowed) {
    const msg = reason === 'subscription_inactive'
      ? 'Assinatura inativa. Assine um plano para usar a IA.'
      : `Limite do plano ${plan} atingido (${limit} requests/mês). Faça upgrade para continuar.`
    return new Response(JSON.stringify({ error: msg }), {
      status: 429, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const { messages, systemPrompt, useWebSearch } = await req.json()
  const allMessages = [{ role: 'system' as const, content: systemPrompt }, ...messages]
  const encoder     = new TextEncoder()

  if (useWebSearch) {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-search-preview',
      messages: allMessages,
      stream: false,
      max_tokens: 2048,
    })
    const content = res.choices[0]?.message?.content ?? ''
    return new Response(`data: ${JSON.stringify({ content })}\n\ndata: [DONE]\n\n`, {
      headers: { ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }

  const stream   = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: allMessages, stream: true, max_tokens: 2048 })
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
