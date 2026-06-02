// ── get-storage-usage: retorna uso total de armazenamento do usuário ──────────
// Consulta storage.objects via REST API com service role para somar bytes
// de todos os arquivos do usuário em todos os níveis de pasta.

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

const BUCKETS = [
  'client-logos',
  'planner-attachments',
  'content-assets',
  'client-materials',
  'report-attachments',
  'task-files',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    // Autenticar o usuário a partir do token JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autorizado' }, 401)

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: { user }, error: authErr } = await sb.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !user) return json({ error: 'Não autorizado' }, 401)

    const userId = user.id

    // Consulta storage.objects via REST com schema=storage
    // O service role pode acessar a tabela objects do schema storage
    const bucketsFilter = BUCKETS.map(b => `"${b}"`).join(',')
    const url = `${SUPABASE_URL}/rest/v1/objects?select=metadata&owner=eq.${userId}&bucket_id=in.(${encodeURIComponent(BUCKETS.join(','))})`

    const resp = await fetch(url, {
      headers: {
        'apikey':        SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type':  'application/json',
        'Accept-Profile': 'storage',
      },
    })

    if (!resp.ok) {
      const errText = await resp.text()
      console.error('REST error:', errText)
      // Fallback seguro: retorna 0 sem bloquear o usuário
      return json({ usedBytes: 0, usedGB: 0, warning: 'could not fetch storage data' })
    }

    const objects: Array<{ metadata: Record<string, unknown> | null }> = await resp.json()

    const totalBytes = objects.reduce((acc, obj) => {
      const size = obj?.metadata?.size
      return acc + (typeof size === 'number' ? size : 0)
    }, 0)

    return json({ usedBytes: totalBytes, usedGB: totalBytes / (1024 * 1024 * 1024) })

  } catch (err: any) {
    console.error('get-storage-usage error:', err.message)
    return json({ error: err.message }, 400)
  }
})
