// ── Edge Function: instagram-deauthorize ──────────────────────────────────────
// Atende os dois callbacks obrigatórios do app na Meta. A mesma função responde
// aos dois porque o corpo recebido é idêntico (um signed_request assinado com o
// app secret) — só o efeito muda:
//
//   Deauthorize Callback URL
//     https://<projeto>.supabase.co/functions/v1/instagram-deauthorize
//     Disparado quando o usuário remove o StatusMedia em Instagram →
//     Configurações → Aplicativos e sites. Desativa a conexão e descarta o
//     token: ele já não vale mais nada e guardá-lo só aumenta a superfície.
//
//   Data Deletion Request Callback URL
//     https://<projeto>.supabase.co/functions/v1/instagram-deauthorize?type=delete
//     Disparado quando o usuário pede exclusão dos dados. Apaga as contas
//     conectadas daquele ig_user_id (os posts agendados vão junto por
//     ON DELETE CASCADE) e responde no formato que a Meta exige:
//       { "url": "<página de status>", "confirmation_code": "<código>" }
//
// DEPLOY — precisa de --no-verify-jwt:
//   supabase functions deploy instagram-deauthorize --no-verify-jwt
// Quem chama é a Meta, que não tem JWT de usuário para apresentar. A
// autorização é a assinatura do signed_request, verificada abaixo com o
// META_APP_SECRET: sem assinatura válida a função responde 401.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const META_APP_SECRET  = Deno.env.get('META_APP_SECRET')!
const APP_URL          = Deno.env.get('APP_URL') ?? 'https://statusmedia.com.br'

interface SignedRequestPayload {
  user_id?:   string
  algorithm?: string
  issued_at?: number
}

// ── signed_request ────────────────────────────────────────────────────────────

function base64UrlToBytes(input: string): Uint8Array {
  const b64     = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded  = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const binary  = atob(padded)
  const bytes   = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Comparação de tempo constante — evita vazar a assinatura por timing. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

/**
 * Valida o signed_request e devolve o payload, ou null se a assinatura não
 * confere. Formato: "<assinatura base64url>.<payload base64url>", assinado
 * com HMAC-SHA256 sobre a string do payload usando o app secret.
 */
async function parseSignedRequest(signed: string): Promise<SignedRequestPayload | null> {
  const [sigPart, payloadPart] = signed.split('.')
  if (!sigPart || !payloadPart) return null

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(META_APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const expected = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadPart)),
  )

  if (!timingSafeEqual(expected, base64UrlToBytes(sigPart))) return null

  try {
    const json = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadPart)))
    // A Meta só assina com HMAC-SHA256; qualquer outro algoritmo é recusado.
    if (json.algorithm && String(json.algorithm).toUpperCase() !== 'HMAC-SHA256') return null
    return json as SignedRequestPayload
  } catch {
    return null
  }
}

/** Aceita o signed_request tanto por form urlencoded quanto por JSON. */
async function readSignedRequest(req: Request): Promise<string | null> {
  const contentType = req.headers.get('content-type') ?? ''
  try {
    if (contentType.includes('application/json')) {
      const body = await req.json()
      return body?.signed_request ?? null
    }
    const form = await req.formData()
    return (form.get('signed_request') as string | null) ?? null
  } catch {
    return null
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Headers': 'content-type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const isDeletion = new URL(req.url).searchParams.get('type') === 'delete'

  const signed = await readSignedRequest(req)
  if (!signed) return new Response('Missing signed_request', { status: 400 })

  const payload = await parseSignedRequest(signed)
  if (!payload) {
    console.warn('signed_request inválido — assinatura não confere')
    return new Response('Invalid signature', { status: 401 })
  }

  const igUserId = payload.user_id ? String(payload.user_id) : null
  if (!igUserId) return new Response('Missing user_id', { status: 400 })

  const supabase         = createClient(SUPABASE_URL, SUPABASE_SERVICE)
  const confirmationCode = crypto.randomUUID().replace(/-/g, '')
  const statusUrl        = `${APP_URL}/data-deletion?code=${confirmationCode}`

  let affected = 0
  let errorMessage: string | null = null

  try {
    if (isDeletion) {
      // Apaga de vez. scheduled_posts some junto (ON DELETE CASCADE).
      const { data, error } = await supabase
        .from('instagram_accounts')
        .delete()
        .eq('ig_user_id', igUserId)
        .select('id')
      if (error) throw error
      affected = data?.length ?? 0
    } else {
      // Desautorização: mantém o histórico da agência, mas a conexão morre.
      // O token é substituído porque a coluna é NOT NULL e guardar credencial
      // revogada não serve a ninguém.
      const { data, error } = await supabase
        .from('instagram_accounts')
        .update({
          is_active:        false,
          access_token:     'revoked',
          token_expires_at: new Date().toISOString(),
          updated_at:       new Date().toISOString(),
        })
        .eq('ig_user_id', igUserId)
        .select('id')
      if (error) throw error
      affected = data?.length ?? 0
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`Falha ao processar ${isDeletion ? 'exclusão' : 'desautorização'} de ${igUserId}:`, errorMessage)
  }

  // O registro é o que sustenta a página de status: sem ele, o código de
  // confirmação devolvido à Meta não corresponderia a nada.
  await supabase.from('data_deletion_requests').insert({
    confirmation_code: confirmationCode,
    ig_user_id:        igUserId,
    kind:              isDeletion ? 'delete' : 'deauthorize',
    status:            errorMessage ? 'failed' : 'completed',
    accounts_affected: affected,
    error_message:     errorMessage,
  })

  console.log(
    `${isDeletion ? 'Exclusão' : 'Desautorização'} de ig_user_id=${igUserId}: ` +
    `${affected} conta(s), código ${confirmationCode}`,
  )

  // A Meta espera exatamente estas duas chaves no callback de exclusão. No de
  // desautorização o corpo é ignorado, então responder o mesmo não atrapalha.
  return new Response(
    JSON.stringify({ url: statusUrl, confirmation_code: confirmationCode }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
