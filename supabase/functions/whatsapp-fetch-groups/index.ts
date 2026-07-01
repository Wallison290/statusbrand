// ── whatsapp-fetch-groups: resolve link de convite de grupo via Evolution API ──
// POST body: { invite_code: "AbcXyz123" }  (código ou URL completa do grupo)
// → { ok: true, group: { jid, name } }  ou  { ok: false, error: "..." }

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const EVOLUTION_BASE_URL = (Deno.env.get('EVOLUTION_BASE_URL') ?? '').replace(/\/$/, '')
const EVOLUTION_API_KEY  = Deno.env.get('EVOLUTION_API_KEY') ?? ''
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') ?? ''

// Sempre retorna 200 para que o body de erro chegue legível ao cliente.
function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

/** Extrai o código do convite de uma URL completa ou devolve o próprio código. */
function extractInviteCode(raw: string): string {
  raw = raw.trim()
  const match = raw.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/)
  if (match) return match[1]
  return raw
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  if (!EVOLUTION_BASE_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    return json({ ok: false, error: 'Evolution API não configurada (faltam secrets)' })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const raw  = (body as any).invite_code ?? ''

    if (!raw) {
      return json({ ok: false, error: 'invite_code é obrigatório' })
    }

    const code = extractInviteCode(raw)

    // Chama a Evolution API para resolver o convite
    const res = await fetch(
      `${EVOLUTION_BASE_URL}/group/inviteInfo/${EVOLUTION_INSTANCE}?inviteCode=${code}`,
      { headers: { apikey: EVOLUTION_API_KEY } },
    )

    const text = await res.text()
    let data: any = {}
    try { data = JSON.parse(text) } catch { /* não é JSON */ }

    if (!res.ok) {
      return json({ ok: false, error: `Evolution retornou ${res.status}: ${text.slice(0, 300)}` })
    }

    // Normaliza a resposta (v1: id+subject / v2: pode variar)
    const jid  = data?.id ?? data?.remoteJid ?? data?.groupJid ?? ''
    const name = data?.subject ?? data?.name ?? data?.groupName ?? ''

    if (!jid || !jid.endsWith('@g.us')) {
      return json({ ok: false, error: `Grupo não encontrado. Resposta da API: ${text.slice(0, 300)}` })
    }

    return json({ ok: true, group: { jid, name } })
  } catch (err) {
    return json({ ok: false, error: String(err) })
  }
})
