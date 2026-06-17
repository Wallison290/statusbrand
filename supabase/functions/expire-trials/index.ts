// ── expire-trials: expira trials vencidos (chamado via cron-job.org diariamente) ─
// Não requer autenticação — protegido por CRON_SECRET no header

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const CRON_SECRET       = Deno.env.get('CRON_SECRET') ?? ''

Deno.serve(async (req) => {
  // Valida o secret enviado pelo cron-job.org no header Authorization
  const authHeader = req.headers.get('Authorization') ?? ''
  const provided   = authHeader.replace('Bearer ', '').trim()

  if (!CRON_SECRET || provided !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data, error } = await sb.rpc('expire_trials')

  if (error) {
    console.error('[expire-trials] Erro:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const expired = data as number ?? 0
  console.log(`[expire-trials] ${expired} trial(s) expirado(s)`)

  return new Response(JSON.stringify({ expired }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
