// ── whatsapp-fetch-groups: resolve link de convite de grupo via Evolution API ──
// POST body: { invite_code: "AbcXyz123" }  (código ou URL completa do grupo)
// → { group: { jid, name } }

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const EVOLUTION_BASE_URL = (Deno.env.get('EVOLUTION_BASE_URL') ?? '').replace(/\/$/, '')
const EVOLUTION_API_KEY  = Deno.env.get('EVOLUTION_API_KEY') ?? ''
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') ?? ''

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

/** Extrai o código do convite de uma URL completa ou devolve o próprio código. */
function extractInviteCode(raw: string): string {
  raw = raw.trim()
  // https://chat.whatsapp.com/AbcXyz  ou  https://wa.me/...
  const match = raw.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/)
  if (match) return match[1]
  // Já é um código puro
  return raw
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  if (!EVOLUTION_BASE_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    return json({ error: 'Evolution API não configurada' }, 503)
  }

  try {
    const body = await req.json().catch(() => ({}))
    const raw  = (body as any).invite_code ?? ''

    if (!raw) {
      return json({ error: 'invite_code é obrigatório' }, 400)
    }

    const code = extractInviteCode(raw)

    // Busca informações do grupo pelo código do convite
    const res = await fetch(
      `${EVOLUTION_BASE_URL}/group/inviteInfo/${EVOLUTION_INSTANCE}?inviteCode=${code}`,
      { headers: { apikey: EVOLUTION_API_KEY } },
    )

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      return json({ error: `API retornou ${res.status}: ${JSON.stringify(data)}` }, 502)
    }

    // Normaliza a resposta (Evolution API v1 usa "id"+"subject", v2 pode variar)
    const jid  = data?.id ?? data?.remoteJid ?? data?.groupJid ?? ''
    const name = data?.subject ?? data?.name ?? data?.groupName ?? ''

    if (!jid || !jid.endsWith('@g.us')) {
      return json({ error: 'Link inválido ou grupo não encontrado' }, 422)
    }

    return json({ group: { jid, name } })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
