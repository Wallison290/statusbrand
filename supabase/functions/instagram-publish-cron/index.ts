// ── Edge Function: instagram-publish-cron ─────────────────────────────────────
// Verifica posts agendados e publica os que estão no prazo.
// Chamar via cron a cada 1 minuto (cron-job.org ou Supabase Scheduler).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const IG_API           = 'https://graph.facebook.com/v19.0'

// ── Helpers de publicação ─────────────────────────────────────────────────────

async function createContainer(
  igUserId: string,
  token: string,
  params: Record<string, string>
): Promise<string> {
  const res  = await fetch(`${IG_API}/${igUserId}/media`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ...params, access_token: token }),
  })
  const data = await res.json()
  if (!data.id) throw new Error(`Container error: ${JSON.stringify(data)}`)
  return data.id
}

async function waitVideoReady(containerId: string, token: string): Promise<void> {
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 5_000))
    const res    = await fetch(`${IG_API}/${containerId}?fields=status_code&access_token=${token}`)
    const { status_code } = await res.json()
    if (status_code === 'FINISHED') return
    if (status_code === 'ERROR') throw new Error('Falha no processamento do vídeo')
  }
  throw new Error('Timeout no processamento do vídeo')
}

async function publishContainer(igUserId: string, token: string, containerId: string): Promise<string> {
  const res  = await fetch(`${IG_API}/${igUserId}/media_publish`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ creation_id: containerId, access_token: token }),
  })
  const data = await res.json()
  if (!data.id) throw new Error(`Publish error: ${JSON.stringify(data)}`)
  return data.id
}

async function publishPost(post: Record<string, any>, account: Record<string, any>): Promise<string> {
  const { ig_user_id, access_token } = account
  const caption = post.caption ?? ''

  // ── Imagem única ──────────────────────────────────────────────────────────
  if (post.post_type === 'IMAGE') {
    const cid = await createContainer(ig_user_id, access_token, {
      image_url: post.media_urls[0],
      caption,
    })
    return publishContainer(ig_user_id, access_token, cid)
  }

  // ── Carrossel ─────────────────────────────────────────────────────────────
  if (post.post_type === 'CAROUSEL_ALBUM') {
    const childIds: string[] = []
    for (const url of post.media_urls) {
      const cid = await createContainer(ig_user_id, access_token, {
        image_url:         url,
        is_carousel_item:  'true',
      })
      childIds.push(cid)
    }
    const carouselCid = await createContainer(ig_user_id, access_token, {
      media_type: 'CAROUSEL',
      children:   childIds.join(','),
      caption,
    })
    return publishContainer(ig_user_id, access_token, carouselCid)
  }

  // ── Reel ──────────────────────────────────────────────────────────────────
  if (post.post_type === 'REELS') {
    const cid = await createContainer(ig_user_id, access_token, {
      media_type: 'REELS',
      video_url:  post.media_urls[0],
      caption,
    })
    await waitVideoReady(cid, access_token)
    return publishContainer(ig_user_id, access_token, cid)
  }

  throw new Error(`Tipo desconhecido: ${post.post_type}`)
}

// ── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Autenticação mínima: Bearer com a service key
  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ') || auth.replace('Bearer ', '') !== SUPABASE_SERVICE) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

  // Busca posts agendados com prazo vencido
  const { data: posts, error } = await supabase
    .from('scheduled_posts')
    .select('*, instagram_accounts(*)')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .limit(10)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!posts || posts.length === 0) {
    return new Response(JSON.stringify({ published: 0, message: 'Nenhum post pendente' }))
  }

  let published = 0
  const results: any[] = []

  for (const post of posts) {
    // Marca como "publicando"
    await supabase
      .from('scheduled_posts')
      .update({ status: 'publishing', updated_at: new Date().toISOString() })
      .eq('id', post.id)

    try {
      const igPostId = await publishPost(post, post.instagram_accounts)

      await supabase
        .from('scheduled_posts')
        .update({
          status:       'published',
          ig_post_id:   igPostId,
          published_at: new Date().toISOString(),
          updated_at:   new Date().toISOString(),
        })
        .eq('id', post.id)

      published++
      results.push({ id: post.id, status: 'published', ig_post_id: igPostId })

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await supabase
        .from('scheduled_posts')
        .update({ status: 'failed', error_message: msg, updated_at: new Date().toISOString() })
        .eq('id', post.id)

      results.push({ id: post.id, status: 'failed', error: msg })
    }
  }

  return new Response(JSON.stringify({ published, total: posts.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
