// ── Edge Function: notify-whatsapp ────────────────────────────────────────────
// Fan-out de uma notificação para o WhatsApp da AGÊNCIA via Evolution API.
//
// Dois modos de invocação:
//   1) Webhook (tempo real): chamado pelo trigger AFTER INSERT on notifications,
//      com body { type: 'INSERT', record: <notification> }.
//   2) Sweep (rede de segurança): chamado pelo cron sem record; varre as
//      notificações recentes sem entrega 'sent'/'skipped' e reprocessa.
//
// Regra de ouro da Fase 1: só envia se o destinatário for role = 'agency',
// estiver com opt_in + verified e com a categoria habilitada nas preferências.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const EVOLUTION_BASE_URL = (Deno.env.get('EVOLUTION_BASE_URL') ?? '').replace(/\/$/, '')
const EVOLUTION_API_KEY  = Deno.env.get('EVOLUTION_API_KEY') ?? ''
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') ?? ''

// Domínio público do app, para montar o link clicável na mensagem.
const APP_URL = (Deno.env.get('APP_PUBLIC_URL') ?? 'https://statusmedia.com.br').replace(/\/$/, '')

// Quantas notificações o sweep reprocessa por execução.
const SWEEP_LIMIT = 25

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface NotificationRow {
  id: string
  user_id: string
  client_id: string | null
  type: string
  title: string
  message: string
  link: string | null
  created_at: string
}

// ─── Mapa tipo → categoria (espelha notification_category no SQL) ─────────────

const CATEGORY_OF: Record<string, string> = {
  APPROVED: 'aprovacoes', REJECTED: 'aprovacoes', COMMENT: 'aprovacoes',
  APPROVAL_REQUEST: 'aprovacoes', ADJUSTMENT_DONE: 'aprovacoes',
  NEW_CONTENT: 'conteudo',
  POST_PUBLISHED: 'instagram', POST_FAILED: 'instagram',
  TASK_DONE: 'tarefas', TASK_STATUS_UPDATE: 'tarefas',
  FORM_SUBMITTED: 'solicitacoes', NOTE_REQUEST: 'solicitacoes',
}

// Link de destino por tipo (mesma lógica do Header.tsx onView).
function buildLink(n: NotificationRow): string | null {
  if (n.type === 'NOTE_REQUEST') return `${APP_URL}${n.link || '/notes'}`
  if (n.link) return `${APP_URL}/planner?item=${n.link}`
  return null
}

// Monta o texto final da mensagem. Título e mensagem já vêm prontos e
// localizados do banco — só damos uma moldura e o link.
function buildMessage(n: NotificationRow): string {
  const link = buildLink(n)
  const head = `*${n.title}*`
  const body = n.message ? `\n${n.message}` : ''
  const tail = link ? `\n\n👉 ${link}` : ''
  return `${head}${body}${tail}`
}

// ─── Evolution API ────────────────────────────────────────────────────────────

// Normaliza o número para o formato esperado pelo Evolution (só dígitos, com DDI).
// Assume Brasil (55) quando vier sem DDI.
function normalizeNumber(raw: string): string {
  let n = (raw || '').replace(/\D/g, '')
  if (!n) return n
  if (!n.startsWith('55') && n.length <= 11) n = '55' + n
  return n
}

async function sendText(to: string, text: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!EVOLUTION_BASE_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    return { ok: false, error: 'Evolution não configurado (faltam secrets)' }
  }
  try {
    const res = await fetch(`${EVOLUTION_BASE_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
      body: JSON.stringify({ number: normalizeNumber(to), text }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${JSON.stringify(data)}` }
    // Evolution retorna o id em key.id
    const id = data?.key?.id ?? data?.id ?? null
    return { ok: true, id }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ─── Processa uma notificação ─────────────────────────────────────────────────

type Supa = ReturnType<typeof createClient>

async function processNotification(supabase: Supa, n: NotificationRow): Promise<string> {
  // Reserva a entrega (idempotência): se já existe, ninguém mais envia.
  const { data: existing } = await supabase
    .from('notification_deliveries')
    .select('id, status')
    .eq('notification_id', n.id)
    .eq('channel', 'whatsapp')
    .maybeSingle()

  if (existing && (existing as any).status !== 'failed' && (existing as any).status !== 'pending') {
    return (existing as any).status // 'sent' ou 'skipped' — nada a fazer
  }

  // Cria/garante a linha de entrega como 'pending'.
  if (!existing) {
    const { error: insErr } = await supabase
      .from('notification_deliveries')
      .insert({ notification_id: n.id, channel: 'whatsapp', provider: 'evolution', status: 'pending' })
    // Corrida: outra invocação já criou — deixa o dono original seguir.
    if (insErr) return 'pending'
  }

  const finish = async (
    status: 'sent' | 'failed' | 'skipped',
    extra: Record<string, unknown> = {},
  ) => {
    await supabase
      .from('notification_deliveries')
      .update({ status, updated_at: new Date().toISOString(), ...extra })
      .eq('notification_id', n.id)
      .eq('channel', 'whatsapp')
    return status
  }

  // Busca o perfil do destinatário e aplica os gates.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, whatsapp, whatsapp_opt_in, whatsapp_verified, whatsapp_prefs')
    .eq('id', n.user_id)
    .maybeSingle()

  const p = profile as any
  if (!p)                       return finish('skipped', { error: 'perfil não encontrado' })
  if (p.role !== 'agency')      return finish('skipped', { error: 'destinatário não é agência' })
  if (!p.whatsapp)              return finish('skipped', { error: 'sem número de WhatsApp' })
  if (!p.whatsapp_opt_in)       return finish('skipped', { error: 'opt-in desligado' })
  if (!p.whatsapp_verified)     return finish('skipped', { error: 'número não verificado' })

  const category = CATEGORY_OF[n.type]
  if (!category)                return finish('skipped', { error: `tipo sem categoria: ${n.type}` })
  const prefs = p.whatsapp_prefs ?? {}
  if (prefs[category] === false) return finish('skipped', { error: `categoria '${category}' desligada` })

  // Envia.
  const text = buildMessage(n)
  const sent = await sendText(p.whatsapp, text)

  // Incrementa tentativas sempre.
  await supabase.rpc('increment_delivery_attempts', { p_notification_id: n.id }).catch(() => {})

  if (sent.ok) {
    return finish('sent', { provider_msg_id: sent.id ?? null, to_number: normalizeNumber(p.whatsapp), error: null })
  }
  // Falha fica como 'failed' → o sweep tenta de novo na próxima passada.
  return finish('failed', { error: sent.error ?? 'erro desconhecido' })
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

  try {
    const body = await req.json().catch(() => ({}))

    // Modo 1: webhook com um record específico.
    if (body?.record?.id) {
      const status = await processNotification(supabase, body.record as NotificationRow)
      return new Response(JSON.stringify({ ok: true, status }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Modo 2: sweep — reprocessa pendentes/falhas das últimas 24h.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: pending } = await supabase
      .from('notification_deliveries')
      .select('notification_id')
      .in('status', ['pending', 'failed'])
      .lt('attempts', 3)
      .gte('created_at', since)
      .limit(SWEEP_LIMIT)

    const ids = (pending ?? []).map((d: any) => d.notification_id)
    let processed = 0
    if (ids.length) {
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .in('id', ids)
      for (const n of (notifs ?? []) as NotificationRow[]) {
        await processNotification(supabase, n)
        processed++
      }
    }

    return new Response(JSON.stringify({ ok: true, swept: processed }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-whatsapp error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
