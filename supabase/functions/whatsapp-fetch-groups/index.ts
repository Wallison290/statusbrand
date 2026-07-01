// ── whatsapp-fetch-groups: lista grupos disponíveis na Evolution API ──────────

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const EVOLUTION_BASE_URL = (Deno.env.get('EVOLUTION_BASE_URL') ?? '').replace(/\/$/, '')
const EVOLUTION_API_KEY  = Deno.env.get('EVOLUTION_API_KEY') ?? ''
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') ?? ''

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  if (!EVOLUTION_BASE_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    return json({ error: 'Evolution API não configurada' }, 503)
  }

  try {
    const res = await fetch(
      `${EVOLUTION_BASE_URL}/group/fetchAllGroups/${EVOLUTION_INSTANCE}?getParticipants=false`,
      { headers: { apikey: EVOLUTION_API_KEY } },
    )

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return json({ error: `Evolution retornou ${res.status}: ${text}` }, 502)
    }

    const data = await res.json()

    // Evolution retorna um array de grupos
    const groups = (Array.isArray(data) ? data : [])
      .map((g: any) => ({
        jid:  g.id   ?? g.remoteJid ?? '',
        name: g.subject ?? g.name   ?? g.id ?? '',
      }))
      .filter((g: any) => g.jid.endsWith('@g.us'))
      .sort((a: any, b: any) => a.name.localeCompare(b.name))

    return json({ groups })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
