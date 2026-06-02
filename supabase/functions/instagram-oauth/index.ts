// ── Edge Function: instagram-oauth ────────────────────────────────────────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const META_APP_ID      = Deno.env.get('META_APP_ID')!
const META_APP_SECRET  = Deno.env.get('META_APP_SECRET')!
const APP_URL          = Deno.env.get('APP_URL')!

Deno.serve(async (req) => {
  const url      = new URL(req.url)
  const code     = url.searchParams.get('code')
  const state    = url.searchParams.get('state')
  const errParam = url.searchParams.get('error')

  const redirect = (path: string) =>
    new Response(null, { status: 302, headers: { Location: `${APP_URL}${path}` } })

  if (errParam) return redirect('/instagram?error=auth_denied')
  if (!code || !state) return redirect('/instagram?error=invalid_callback')

  const redirectUri = `${SUPABASE_URL}/functions/v1/instagram-oauth`

  try {
    // ── 1. Short-lived token ──────────────────────────────────────────────────
    const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        client_id:     META_APP_ID,
        client_secret: META_APP_SECRET,
        grant_type:    'authorization_code',
        redirect_uri:  redirectUri,
        code,
      }),
    })
    const shortData = await shortRes.json()

    if (!shortData.access_token) {
      console.error('Short token failed:', shortData)
      return redirect('/instagram?error=token_exchange_failed')
    }

    const shortToken = shortData.access_token
    // igUserId provisório — será sobrescrito pelo id retornado de /me
    const igUserIdFromToken = String(shortData.user_id)

    // ── 2. Long-lived token (60 dias) ─────────────────────────────────────────
    const longRes  = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token` +
      `&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&access_token=${shortToken}`
    )
    const longData = await longRes.json()

    const longToken  = longData.access_token ?? shortToken
    const expiresIn  = longData.expires_in   ?? 3_600

    // ── 3. Perfil ─────────────────────────────────────────────────────────────
    const profRes = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=id,username,name,profile_picture_url,followers_count&access_token=${longToken}`
    )
    const profData = await profRes.json()

    if (profData.error) {
      console.error('Profile failed:', profData.error)
      return redirect('/instagram?error=profile_failed')
    }

    // Usa o id retornado por /me como fonte autoritativa (pode diferir do token)
    const igUserId    = String(profData.id           ?? igUserIdFromToken)
    const igUsername  = profData.username            ?? igUserId
    const igName      = profData.name                ?? null
    const igPic       = profData.profile_picture_url ?? null
    const igFollowers = profData.followers_count     ?? 0

    // ── 4. Salva no Supabase ──────────────────────────────────────────────────
    // state pode ser "userId" ou "userId|clientId"
    const [userId, clientId] = state.includes('|') ? state.split('|') : [state, null]

    const supabase  = createClient(SUPABASE_URL, SUPABASE_SERVICE)
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    // ── 4a. Gate: verificar limite de perfis pelo plano ───────────────────────
    const INSTAGRAM_LIMITS: Record<string, number> = {
      starter: 1,
      pro:     5,
      agency:  -1, // ilimitado
    }

    // Busca o plano do usuário
    const { data: subRow } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', userId)
      .maybeSingle()

    const planId    = subRow?.plan ?? 'starter'
    const maxProfiles = INSTAGRAM_LIMITS[planId] ?? 1

    if (maxProfiles !== -1) {
      // Conta perfis ATIVOS — exclui o ig_user_id atual para permitir reconexão
      const { count } = await supabase
        .from('instagram_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true)
        .neq('ig_user_id', igUserId) // reconexão da mesma conta não conta

      const activeCount = count ?? 0
      if (activeCount >= maxProfiles) {
        console.warn(`User ${userId} hit Instagram profile limit (plan=${planId}, limit=${maxProfiles}, active=${activeCount})`)
        const target = clientId
          ? `/clients/${clientId}?ig_error=profile_limit`
          : `/instagram?error=profile_limit`
        return redirect(target)
      }
    }

    const upsertPayload: Record<string, unknown> = {
      user_id:             userId,
      ig_user_id:          igUserId,
      username:            igUsername,
      name:                igName,
      profile_picture_url: igPic,
      followers_count:     igFollowers,
      access_token:        longToken,
      token_expires_at:    expiresAt.toISOString(),
      is_active:           true,
      updated_at:          new Date().toISOString(),
    }
    if (clientId) upsertPayload.client_id = clientId

    const { error: upsertError } = await supabase
      .from('instagram_accounts')
      .upsert(upsertPayload, { onConflict: 'user_id,ig_user_id,client_id' })

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      return redirect('/instagram?error=save_failed')
    }

    const target = clientId ? `/clients/${clientId}?ig_connected=true` : `/instagram?connected=true`
    return redirect(target)

  } catch (err) {
    console.error('OAuth error:', err)
    return redirect('/instagram?error=unknown')
  }
})
