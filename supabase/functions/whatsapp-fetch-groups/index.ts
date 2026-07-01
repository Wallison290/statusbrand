// ── whatsapp-fetch-groups (UazAPI) ────────────────────────────────────────────
// POST body { invite_code: "..." }
//   1. Tenta POST /group/join  → bot entra e retorna info do grupo
//   2. Se join falha (já membro) → tenta POST /group/inviteInfo → obtém info sem entrar
//   Nunca lista todos os grupos (privacidade multi-tenant)

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BASE_URL = (Deno.env.get('EVOLUTION_BASE_URL') ?? '').replace(/\/$/, '')
const TOKEN    = Deno.env.get('EVOLUTION_API_KEY') ?? ''

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function uazPost(path: string, body: unknown) {
  const res  = await fetch(`${BASE_URL}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', token: TOKEN },
    body:    JSON.stringify(body),
  })
  const text = await res.text()
  let data: any = {}
  try { data = JSON.parse(text) } catch { /* não é JSON */ }
  return { ok: res.ok, status: res.status, data, text }
}

function extractGroup(data: any): { jid: string; name: string } | null {
  const jid  = data?.JID ?? data?.id ?? data?.remoteJid ?? data?.jid ?? data?.groupJid ?? data?.GroupJID ?? ''
  const name = data?.Name ?? data?.Subject ?? data?.name ?? data?.subject ?? data?.groupName ?? data?.GroupName ?? ''
  if (typeof jid === 'string' && jid.endsWith('@g.us')) return { jid, name: name || jid }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  if (!BASE_URL || !TOKEN) {
    return json({ ok: false, error: 'UazAPI não configurada (faltam secrets)' })
  }

  try {
    const body   = await req.json().catch(() => ({}))
    const invite = ((body as any).invite_code ?? '').trim()
    if (!invite) return json({ ok: false, error: 'invite_code é obrigatório' })

    // ── 1. Tenta entrar no grupo ───────────────────────────────────────────
    const joinRes = await uazPost('/group/join', { invitecode: invite })
    console.log('join status:', joinRes.status, joinRes.text.slice(0, 200))
    if (joinRes.ok) {
      const group = extractGroup(joinRes.data)
      if (group) return json({ ok: true, group })
    }

    // ── 2. Número já é membro → obtém info do grupo pelo link sem entrar ──
    const infoRes = await uazPost('/group/inviteInfo', { invitecode: invite })
    console.log('inviteInfo status:', infoRes.status, infoRes.text.slice(0, 200))
    if (infoRes.ok) {
      const group = extractGroup(infoRes.data)
      if (group) return json({ ok: true, group })
    }

    // ── 3. Ambos falharam ─────────────────────────────────────────────────
    const detail = joinRes.ok
      ? `join ok mas sem JID. Resposta: ${joinRes.text.slice(0, 200)}`
      : `join ${joinRes.status}: ${joinRes.text.slice(0, 200)} | inviteInfo ${infoRes.status}: ${infoRes.text.slice(0, 100)}`
    return json({ ok: false, error: detail })

  } catch (err) {
    return json({ ok: false, error: String(err) })
  }
})
