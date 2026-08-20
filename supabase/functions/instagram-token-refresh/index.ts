// ── Edge Function: instagram-token-refresh ────────────────────────────────────
// Renova os long-lived tokens do Instagram antes que expirem.
// Chamar via cron 1x por dia (ver migration 068).
//
// Contexto: o token que o OAuth grava vale 60 dias. A Meta permite estendê-lo
// por mais 60 dias via ig_refresh_token, MAS só enquanto ele ainda está vivo —
// token vencido não tem renovação, só reconexão manual pelo usuário.
// Sem esta função o sistema quebrava a cada 60 dias (erro OAuthException 190,
// "Session has expired").
//
// DEPLOY — precisa de --no-verify-jwt:
//   supabase functions deploy instagram-token-refresh --no-verify-jwt
// O gatilho é o pg_cron, que não tem JWT de usuário para apresentar. O gateway
// fica aberto, mas a autorização acontece aqui embaixo via TOKEN_REFRESH_SECRET
// — sem o header correto a função responde 401.
//
// O valor de TOKEN_REFRESH_SECRET vive em dois lugares, que precisam bater:
//   - secret da Edge Function (Dashboard → Edge Functions → Secrets)
//   - Vault, em 'instagram_cron_secret', de onde o pg_cron lê para montar o
//     header (ver migration 068)
// Ele é separado do CRON_SECRET de propósito: a Management API só devolve
// digest SHA-256 dos secrets, então o CRON_SECRET existente não é recuperável
// para gravar no Vault.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET      = Deno.env.get('CRON_SECRET') ?? ''
// Segredo próprio desta função, usado pelo cron no Postgres. Existe separado do
// CRON_SECRET porque este precisa estar legível no Vault para o pg_cron montar
// o header, e o CRON_SECRET é compartilhado com o gatilho de publicação.
const REFRESH_SECRET   = Deno.env.get('TOKEN_REFRESH_SECRET') ?? ''

// Renova quando faltar isto ou menos para vencer. A folga é proposital: se o
// cron falhar alguns dias seguidos (deploy, instabilidade da Meta), ainda
// sobram tentativas antes do token virar problema.
const REFRESH_WINDOW_DAYS = 10

// A Meta recusa refresh de token com menos de 24h de vida. Na prática nunca
// acontece (só renovamos perto do vencimento), mas protege reconexões recentes
// que ainda não têm token_expires_at gravado.
const MIN_TOKEN_AGE_MS = 24 * 60 * 60 * 1000

// Evita repetir o aviso "reconecte a conta" todo dia para a mesma conta.
const NOTIFY_COOLDOWN_MS = 24 * 60 * 60 * 1000

const DAY_MS = 24 * 60 * 60 * 1000

interface Account {
  id:               string
  user_id:          string
  client_id:        string | null
  username:         string
  access_token:     string
  token_expires_at: string | null
  updated_at:       string | null
}

// ── Renovação ─────────────────────────────────────────────────────────────────

async function refreshToken(token: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token` +
    `?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`
  )
  const data = await res.json()
  if (!data.access_token) {
    throw new Error(`Refresh falhou: ${JSON.stringify(data)}`)
  }
  return { access_token: data.access_token, expires_in: data.expires_in ?? 60 * 24 * 60 * 60 }
}

// ── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  // Aceita service role key OU um dos segredos de cron, via header dedicado ou
  // Bearer. Segredos vazios são descartados de propósito: sem esse filtro, uma
  // variável de ambiente ausente faria '' === '' e liberaria acesso a qualquer
  // requisição sem header.
  const auth   = req.headers.get('Authorization') ?? ''
  const secret = req.headers.get('X-Cron-Secret')  ?? ''
  const token  = auth.startsWith('Bearer ') ? auth.slice(7) : ''

  const validSecrets = [CRON_SECRET, REFRESH_SECRET].filter(s => s.length > 0)
  const authorized =
    (SUPABASE_SERVICE.length > 0 && token === SUPABASE_SERVICE) ||
    validSecrets.some(s => s === secret || s === token)

  if (!authorized) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)
  const now      = Date.now()

  const { data: accounts, error } = await supabase
    .from('instagram_accounts')
    .select('id, user_id, client_id, username, access_token, token_expires_at, updated_at')
    .eq('is_active', true)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const results: any[] = []
  let refreshed = 0

  for (const acc of (accounts ?? []) as Account[]) {
    const expiresAt = acc.token_expires_at ? new Date(acc.token_expires_at).getTime() : null

    // Sem data conhecida tentamos renovar assim mesmo — se der certo passamos a
    // ter a validade correta gravada; se der erro, avisamos para reconectar.
    const msLeft = expiresAt === null ? 0 : expiresAt - now

    if (expiresAt !== null && msLeft > REFRESH_WINDOW_DAYS * DAY_MS) {
      results.push({ username: acc.username, status: 'skipped', days_left: Math.floor(msLeft / DAY_MS) })
      continue
    }

    // Token já vencido: ig_refresh_token não funciona mais. Só reconexão.
    if (expiresAt !== null && msLeft <= 0) {
      await notifyReconnect(supabase, acc, 'expired')
      results.push({ username: acc.username, status: 'expired_needs_reconnect' })
      continue
    }

    const updatedAt = acc.updated_at ? new Date(acc.updated_at).getTime() : 0
    if (now - updatedAt < MIN_TOKEN_AGE_MS) {
      results.push({ username: acc.username, status: 'too_young' })
      continue
    }

    try {
      const fresh = await refreshToken(acc.access_token)
      const newExpiry = new Date(now + fresh.expires_in * 1000)

      const { error: updateError } = await supabase
        .from('instagram_accounts')
        .update({
          access_token:     fresh.access_token,
          token_expires_at: newExpiry.toISOString(),
          updated_at:       new Date().toISOString(),
        })
        .eq('id', acc.id)

      if (updateError) throw new Error(`Falha ao gravar token: ${updateError.message}`)

      refreshed++
      console.log(`Token renovado: @${acc.username} → ${newExpiry.toISOString()}`)
      results.push({ username: acc.username, status: 'refreshed', expires_at: newExpiry.toISOString() })

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`Falha ao renovar @${acc.username}: ${msg}`)
      await notifyReconnect(supabase, acc, 'refresh_failed')
      results.push({ username: acc.username, status: 'failed', error: msg })
    }
  }

  return new Response(JSON.stringify({ refreshed, total: accounts?.length ?? 0, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

// ── Aviso de reconexão ────────────────────────────────────────────────────────
// Só a reconexão manual resolve nesses casos (token vencido, senha trocada,
// app removido pelo usuário nas configurações do Instagram).

async function notifyReconnect(
  supabase: any,
  acc: Account,
  reason: 'expired' | 'refresh_failed'
): Promise<void> {
  const since = new Date(Date.now() - NOTIFY_COOLDOWN_MS).toISOString()

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', acc.user_id)
    .eq('type', 'IG_TOKEN_EXPIRING')
    .gte('created_at', since)

  if ((count ?? 0) > 0) return

  const link = acc.client_id ? `/clients/${acc.client_id}` : '/instagram'
  const message = reason === 'expired'
    ? `A conexão de @${acc.username} com o Instagram expirou. Reconecte a conta para voltar a publicar os agendamentos.`
    : `Não foi possível renovar a conexão de @${acc.username} com o Instagram. Reconecte a conta para evitar falhas nas publicações.`

  await supabase.from('notifications').insert({
    user_id:   acc.user_id,
    client_id: acc.client_id ?? null,
    type:      'IG_TOKEN_EXPIRING',
    title:     'Reconecte o Instagram ⚠️',
    message,
    link,
    is_read:   false,
  })
}
