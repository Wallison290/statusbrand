// ── whatsapp-fetch-groups (UazAPI) ────────────────────────────────────────────
// POST body { list: true }         → lista grupos via POST /group/list
// POST body { invite_code: "..." } → entra no grupo via POST /group/join
//                                    (retorna JID + nome; bot precisa entrar de qq forma)

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

async function uazFetch(path: string, body: unknown) {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  if (!BASE_URL || !TOKEN) {
    return json({ ok: false, error: 'UazAPI não configurada (faltam secrets)' })
  }

  try {
    const body = await req.json().catch(() => ({}))

    // ── Modo lista ─────────────────────────────────────────────────────────
    if ((body as any).list) {
      const r = await uazFetch('/group/list', { limit: 1000, offset: 0, noParticipants: true })
      if (!r.ok) {
        return json({ ok: false, error: `group/list ${r.status}: ${r.text.slice(0, 300)}` })
      }
      // Resposta pode ser array direto ou { groups: [...] }
      const raw = Array.isArray(r.data) ? r.data : (r.data?.groups ?? r.data?.data ?? [])
      const groups = raw
        .map((g: any) => ({
          jid:  g.id ?? g.remoteJid ?? g.jid ?? '',
          name: g.subject ?? g.name ?? g.groupName ?? '',
        }))
        .filter((g: any) => g.jid.endsWith('@g.us'))
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
      return json({ ok: true, groups })
    }

    // ── Modo convite: entra no grupo e retorna JID + nome ──────────────────
    const invite = ((body as any).invite_code ?? '').trim()
    if (!invite) return json({ ok: false, error: 'invite_code é obrigatório' })

    const r = await uazFetch('/group/join', { invitecode: invite })
    if (!r.ok) {
      return json({ ok: false, error: `group/join ${r.status}: ${r.text.slice(0, 300)}` })
    }

    const jid  = r.data?.id ?? r.data?.remoteJid ?? r.data?.jid ?? r.data?.groupJid ?? ''
    const name = r.data?.subject ?? r.data?.name ?? r.data?.groupName ?? ''

    if (!jid.endsWith('@g.us')) {
      return json({ ok: false, error: `Grupo não encontrado. Resposta: ${r.text.slice(0, 300)}` })
    }

    return json({ ok: true, group: { jid, name } })
  } catch (err) {
    return json({ ok: false, error: String(err) })
  }
})
