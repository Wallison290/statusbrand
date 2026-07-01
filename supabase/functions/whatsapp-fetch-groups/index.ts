// ── whatsapp-fetch-groups ─────────────────────────────────────────────────────
// Dois modos:
//   POST body { invite_code }  → tenta resolver link de convite via API
//   POST body { list: true }   → retorna todos os grupos do bot (fallback)

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const EVOLUTION_BASE_URL = (Deno.env.get('EVOLUTION_BASE_URL') ?? '').replace(/\/$/, '')
const EVOLUTION_API_KEY  = Deno.env.get('EVOLUTION_API_KEY') ?? ''
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') ?? ''

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function extractInviteCode(raw: string): string {
  raw = raw.trim()
  const m = raw.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/)
  return m ? m[1] : raw
}

async function evFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${EVOLUTION_BASE_URL}${path}`, {
    ...opts,
    headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
  })
  const text = await res.text()
  let data: any = {}
  try { data = JSON.parse(text) } catch { /* empty */ }
  return { ok: res.ok, status: res.status, data, text }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  if (!EVOLUTION_BASE_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    return json({ ok: false, error: 'Evolution API não configurada' })
  }

  try {
    const body = await req.json().catch(() => ({}))

    // ── Modo lista: retorna todos os grupos do bot ──────────────────────────
    if ((body as any).list) {
      const r = await evFetch(`/group/fetchAllGroups/${EVOLUTION_INSTANCE}?getParticipants=false`)
      if (!r.ok) {
        return json({ ok: false, error: `fetchAllGroups ${r.status}: ${r.text.slice(0, 300)}` })
      }
      const groups = (Array.isArray(r.data) ? r.data : [])
        .map((g: any) => ({ jid: g.id ?? g.remoteJid ?? '', name: g.subject ?? g.name ?? '' }))
        .filter((g: any) => g.jid.endsWith('@g.us'))
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
      return json({ ok: true, groups })
    }

    // ── Modo invite: resolve link de convite ────────────────────────────────
    const raw = (body as any).invite_code ?? ''
    if (!raw) return json({ ok: false, error: 'invite_code é obrigatório' })
    const code = extractInviteCode(raw)

    // Tenta POST (Evolution v2)
    let r = await evFetch(`/group/inviteInfo/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      body: JSON.stringify({ inviteCode: code }),
    })

    // Se 404/405 tenta GET (Evolution v1)
    if (!r.ok && (r.status === 404 || r.status === 405)) {
      r = await evFetch(`/group/inviteInfo/${EVOLUTION_INSTANCE}?inviteCode=${code}`)
    }

    if (!r.ok) {
      return json({ ok: false, error: `inviteInfo ${r.status}: ${r.text.slice(0, 300)}` })
    }

    const jid  = r.data?.id ?? r.data?.remoteJid ?? r.data?.groupJid ?? ''
    const name = r.data?.subject ?? r.data?.name ?? r.data?.groupName ?? ''

    if (!jid.endsWith('@g.us')) {
      return json({ ok: false, error: `Grupo não encontrado. Resposta: ${r.text.slice(0, 300)}` })
    }

    return json({ ok: true, group: { jid, name } })
  } catch (err) {
    return json({ ok: false, error: String(err) })
  }
})
