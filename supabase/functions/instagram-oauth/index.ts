// ── Edge Function: instagram-oauth ────────────────────────────────────────────
// Recebe o callback do Meta OAuth, troca o code por token e salva no Supabase.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const META_APP_ID       = Deno.env.get('META_APP_ID')!
const META_APP_SECRET   = Deno.env.get('META_APP_SECRET')!
const APP_URL           = Deno.env.get('APP_URL')!   // ex: https://statusbrand-snowy.vercel.app

Deno.serve(async (req) => {
  const url    = new URL(req.url)
  const code   = url.searchParams.get('code')
  const state  = url.searchParams.get('state')   // user_id do Supabase
  const errParam = url.searchParams.get('error')

  const redirect = (path: string) =>
    new Response(null, { status: 302, headers: { Location: `${APP_URL}${path}` } })

  if (errParam) return redirect('/instagram?error=auth_denied')
  if (!code || !state) return redirect('/instagram?error=invalid_callback')

  const redirectUri = `${SUPABASE_URL}/functions/v1/instagram-oauth`

  try {
    // ── 1. Troca code por token de curta duração ──────────────────────────────
    const shortRes  = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token` +
      `?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
    )
    const shortData = await shortRes.json()
    if (!shortData.access_token) {
      console.error('Short token error:', shortData)
      return redirect('/instagram?error=token_exchange_failed')
    }

    // ── 2. Troca por token de longa duração (60 dias) ─────────────────────────
    const longRes  = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token` +
      `?grant_type=fb_exchange_token&client_id=${META_APP_ID}` +
      `&client_secret=${META_APP_SECRET}&fb_exchange_token=${shortData.access_token}`
    )
    const longData = await longRes.json()
    const longToken = longData.access_token

    // ── 3. Lista Páginas do Facebook e acha conta Instagram Business ──────────
    const pagesRes  = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts` +
      `?fields=id,name,access_token&access_token=${longToken}`
    )
    const pagesData = await pagesRes.json()

    let igUserId: string | null = null
    let igToken: string | null  = null
    let igUsername = 'unknown'
    let igName: string | null   = null
    let igPic: string | null    = null
    let igFollowers = 0

    for (const page of pagesData.data ?? []) {
      const igCheck = await fetch(
        `https://graph.facebook.com/v19.0/${page.id}` +
        `?fields=instagram_business_account&access_token=${page.access_token}`
      )
      const igCheckData = await igCheck.json()

      if (igCheckData.instagram_business_account?.id) {
        igUserId = igCheckData.instagram_business_account.id
        igToken  = page.access_token

        // Busca dados do perfil Instagram
        const profileRes = await fetch(
          `https://graph.facebook.com/v19.0/${igUserId}` +
          `?fields=username,name,profile_picture_url,followers_count` +
          `&access_token=${igToken}`
        )
        const profile = await profileRes.json()
        igUsername  = profile.username   ?? 'unknown'
        igName      = profile.name       ?? null
        igPic       = profile.profile_picture_url ?? null
        igFollowers = profile.followers_count     ?? 0
        break
      }
    }

    if (!igUserId || !igToken) {
      return redirect('/instagram?error=no_instagram_account')
    }

    // ── 4. Salva no Supabase ──────────────────────────────────────────────────
    const supabase   = createClient(SUPABASE_URL, SUPABASE_SERVICE)
    const expiresAt  = new Date(Date.now() + (longData.expires_in ?? 5_184_000) * 1000)

    const { error: upsertError } = await supabase
      .from('instagram_accounts')
      .upsert({
        user_id:             state,
        ig_user_id:          igUserId,
        username:            igUsername,
        name:                igName,
        profile_picture_url: igPic,
        followers_count:     igFollowers,
        access_token:        igToken,
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
