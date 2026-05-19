// ── ai-proxy: chamadas OpenAI não-streaming com limites por plano ─────────────

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function getUser(req: Request) {
  const auth = req.headers.get('Authorization')
  if (!auth) return null
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data: { user } } = await sb.auth.getUser(auth.replace('Bearer ', ''))
  return user
}

async function checkUsage(userId: string): Promise<{ allowed: boolean; current: number; limit: number; plan: string }> {
  const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const month = new Date().toISOString().slice(0, 7)

  // Busca plano atual
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sub } = await (sb as any)
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .maybeSingle()

  const plan  = sub?.plan ?? 'free'
  const limit = AI_LIMITS[plan] ?? 50

  // Busca uso atual
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: usage } = await (sb as any)
    .from('ai_usage')
    .select('requests')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle()

  const current = usage?.requests ?? 0
  if (current >= limit) return { allowed: false, current, limit, plan }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb as any).from('ai_usage').upsert(
    { user_id: userId, month, requests: current + 1, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,month' },
  )
  return { allowed: true, current: current + 1, limit, plan }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST')   return json({ error: 'Method not allowed' }, 405)

  const user = await getUser(req)
  if (!user) return json({ error: 'Não autenticado' }, 401)

  const { allowed, current, limit, plan } = await checkUsage(user.id)
  if (!allowed) {
    return json({
      error: `Limite do plano ${plan} atingido (${limit} requests/mês). Faça upgrade para continuar.`,
      usage: { current, limit, plan },
    }, 429)
  }

  const { type, payload } = await req.json()

  try {
    let content: string | null = null

    switch (type) {
      case 'greeting': {
        const { stats, hour, dayName } = payload
        const res = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Você é um assistente de dashboard para uma agência de social media. Responda APENAS com JSON válido, sem markdown, sem code block.' },
            { role: 'user', content: `Situação atual da agência (${dayName}, ${hour}h):\n- Clientes ativos: ${stats.active_clients} de ${stats.total_clients}\n- Conteúdos aguardando aprovação: ${stats.period_pending_approval}\n- Aprovados no período: ${stats.period_approved}\n- Tarefas pendentes: ${stats.pending_tasks}\n- Tarefas atrasadas: ${stats.overdue_tasks}\n\nRetorne APENAS este JSON:\n{\n  "message": "frase curta e inteligente (máx. 12 palavras)",\n  "pills": [{ "icon": "emoji", "label": "texto curto", "variant": "success|warning|default" }]\n}\n\nRegras:\n- 2 a 4 pills\n- "warning" APENAS se há atrasos\n- "success" para conquistas\n- Tom profissional e direto` },
          ],
          max_tokens: 220,
        })
        content = res.choices[0].message.content
        break
      }

      case 'generate-content': {
        const res = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: payload.prompt }],
          temperature: 0.85,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        })
        content = res.choices[0].message.content
        break
      }

      case 'improve-text': {
        const res = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: payload.prompt }],
          temperature: 0.7,
          max_tokens: 1000,
        })
        content = res.choices[0].message.content?.trim() ?? null
        break
      }

      case 'memory-extract': {
        const { systemPrompt, userMessage, assistantResponse } = payload
        const res = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Usuário: "${userMessage.slice(0, 300)}"\n\nAssistente: "${assistantResponse.slice(0, 600)}"` },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 400,
        })
        content = res.choices[0].message.content
        break
      }

      default:
        return json({ error: `Tipo desconhecido: ${type}` }, 400)
    }

    return json({ content, usage: { current, limit, plan } })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
