// ── Edge Function: send-whatsapp ───────────────────────────────────────────────
// Envia qualquer mensagem para qualquer número via uazapi.
// Usado pelo botão WhatsApp da página Equipe.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const UAZAPI_URL      = (Deno.env.get('UAZAPI_URL') ?? '').replace(/\/$/, '')
const UAZAPI_TOKEN    = Deno.env.get('UAZAPI_TOKEN') ?? ''
const UAZAPI_INSTANCE = Deno.env.get('UAZAPI_INSTANCE') ?? ''

function normalizeNumber(raw: string): string {
  let n = (raw || '').replace(/\D/g, '')
  if (!n) return ''
  if (!n.startsWith('55') && n.length <= 11) n = '55' + n
  return n
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { number, text } = await req.json().catch(() => ({})) as { number?: string; text?: string }

    if (!number || !text) throw new Error('number e text são obrigatórios.')

    // Verifica autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Não autenticado.')

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authErr } = await anonClient.auth.getUser()
    if (authErr || !user) throw new Error('Token inválido.')

    if (!UAZAPI_URL || !UAZAPI_TOKEN || !UAZAPI_INSTANCE) {
      throw new Error('uazapi não configurado.')
    }

    const normalizedNumber = normalizeNumber(number)
    if (!normalizedNumber) throw new Error('Número de telefone inválido.')

    const res = await fetch(`${UAZAPI_URL}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': UAZAPI_TOKEN,
      },
      body: JSON.stringify({ instanceName: UAZAPI_INSTANCE, number: normalizedNumber, text }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message ?? String(err) }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
