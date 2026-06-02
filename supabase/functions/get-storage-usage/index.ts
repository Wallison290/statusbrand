// ── get-storage-usage: retorna uso total de armazenamento do usuário ──────────
// Soma os bytes de todos os objetos nos 6 buckets pertencentes ao user_id

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

    // Para cada bucket, listar objetos cujo prefixo começa com o userId
    // e somar os bytes via metadata.size
    let totalBytes = 0

    await Promise.all(
      BUCKETS.map(async (bucket) => {
        // Listar com prefixo userId/
        const { data: objects, error } = await sb.storage
          .from(bucket)
          .list(userId, { limit: 10000, offset: 0 })

        if (error || !objects) return

        for (const obj of objects) {
          const size = (obj.metadata as any)?.size ?? 0
          totalBytes += typeof size === 'number' ? size : 0
        }
      })
    )

    // Converter para GB
    const usedGB = totalBytes / (1024 * 1024 * 1024)

    return json({ usedBytes: totalBytes, usedGB })
  } catch (err: any) {
    return json({ error: err.message }, 400)
  }
})
