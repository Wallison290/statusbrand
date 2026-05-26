// ── Edge Function: instagram-oauth ────────────────────────────────────────────
// Recebe o callback do Instagram Business Login, troca o code por token e salva.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const META_APP_ID       = Deno.env.get('META_APP_ID')!
const META_APP_SECRET   = Deno.env.get('META_APP_SECRET')!
const APP_URL           = Deno.env.get('APP_URL')!

Deno.serve(async (req) => {
  const url      = new URL(req.url)
  const code     = url.searchParams.get('code')
  const state    = url.searchParams.get('state')   // user_id do Supabase
  const errParam = url.searchParams.get('error')

  const redirect = (path: string) =>
    new Response(null, { status: 302, headers: { Location: `${APP_URL}${path}` } })

  if (errParam) return redirect('/instagram?error=auth_denied')
  if (!code || !state) return redirect('/instagram?error=invalid_callback')

  const redirectUri = `${SUPABASE_URL}/functions/v1/instagram-oauth`

  try {
    // ── 1. Troca code por token de curta duração ──────────────────────────────
    const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        client_id:     META_APP_ID,
        client_secret: META_APP_SECRET,
        grant_type:    'authorization_code',
        redirect_uri:  redirectUri,
        code:          code,
      }),
    })
    const shortData = await shortRes.json()
    if (!shortData.access_token) {
      console.error('Short token error:', shortData)
      return redirect('/instagram?error=token_exchange_failed')
    }

    const igUserId = String(shortData.user_id)

    // ── 2. Troca por token de longa duração (60 dias) ─────────────────────────
    const longRes = await fetch('https://graph.instagram.com/access_token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        grant_type:    'ig_exchange_token',
        client_id:     META_APP_ID,
        client_secret: META_APP_SECRET,
        access_token:  shortData.access_token,
      }),
    })
    const longData  = await longRes.json()
    const longToken = longData.access_token ?? shortData.access_token
    const expiresIn = longData.expires_in   ?? 3_600   // fallback: 1h (short token)

    // ── 3. Busca perfil do Instagram ──────────────────────────────────────────
    const profileRes = await fetch(
      `https://graph.instagram.com/me` +
      `?fields=username,name,profile_picture_url,followers_count` +
      `&access_token=${longToken}`
    )
    const profile     = await profileRes.json()
    const igUsername  = profile.username            ?? 'unknown'
    const igName      = profile.name                ?? null
    const igPic       = profile.profile_picture_url ?? null
    const igFollowers = profile.followers_count     ?? 0

    console.log('Profile:', JSON.stringify(profile))

    // ── 4. Salva no Supabase ──────────────────────────────────────────────────
    const supabase  = createClient(SUPABASE_URL, SUPABASE_SERVICE)
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    const { error: upsertError } = await supabase
      .from('instagram_accounts')
      .upsert({
        user_id:             state,
        ig_user_id:          igUserId,
        username:            igUsername,
        name:                igName,
        profile_picture_url: igPic,
        followers_count:     igFollowers,
        access_token:        longToken,
        token_expires_at:    expiresAt.toISOString(),
        is_active:           true,
        updated_at:          new Date().toISOString(),
      }, { onConflict: 'user_id,ig_user_id' })

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      return redirect('/instagram?error=save_failed')
    }

    return redirect('/instagram?connected=true')

  } catch (err) {
    console.error('OAuth error:', err)
    return redirect('/instagram?error=unknown')
  }
})
