// ── Edge Function: instagram-publish-cron ─────────────────────────────────────
// Verifica posts agendados e publica os que estão no prazo.
// Chamar via cron a cada 1 minuto.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET      = Deno.env.get('CRON_SECRET') ?? ''
const IG_API           = 'https://graph.instagram.com/v21.0'

// Quantas tentativas automáticas fazer antes de marcar como "failed".
// Cada tentativa acontece na próxima execução do cron (~1 min depois).
const MAX_RETRIES = 3

// Decide se vale a pena tentar de novo. Cobre os erros transitórios típicos:
// o Instagram baixa a mídia a partir da URL e, se demora demais, retorna
// "Timeout" / subcode 2207003. Esses erros costumam passar numa nova tentativa.
// Erros permanentes (formato inválido, mídia inacessível, etc.) NÃO são repetidos.
function isRetryableError(msg: string): boolean {
  const m = (msg || '').toLowerCase()
  return (
    m.includes('2207003') ||              // download da mídia demorou (timeout)
    m.includes('2207001') ||              // erro transitório de processamento
    m.includes('"message":"timeout"') ||
    m.includes('timeout aguardando') ||   // nosso próprio timeout em waitContainerReady
    m.includes('"is_transient":true') ||
    m.includes('failed to fetch') ||
    m.includes('fetch failed') ||
    m.includes('econnreset') ||
    m.includes('network') ||
    /\b50\d\b/.test(m)                     // 500/502/503/504
  )
}

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

// Aguarda o container ficar FINISHED antes de publicar.
// maxAttempts * intervalMs = timeout total
async function waitContainerReady(
  containerId: string,
  token: string,
  maxAttempts = 12,
  intervalMs = 5_000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs))
    const res = await fetch(
      `${IG_API}/${containerId}?fields=status_code,status&access_token=${token}`
    )
    const data = await res.json()
    const sc   = data.status_code
    console.log(`Container ${containerId} status: ${sc}`)
    if (sc === 'FINISHED') return
    if (sc === 'ERROR')    throw new Error(`Falha no processamento da mídia: ${JSON.stringify(data)}`)
  }
  throw new Error('Timeout aguardando container ficar pronto')
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

async function resolveIgUserId(storedId: string, token: string): Promise<string> {
  try {
    const res  = await fetch(`${IG_API}/me?fields=id&access_token=${token}`)
    const data = await res.json()
    if (data.id && data.id !== storedId) {
      console.warn(`ig_user_id mismatch: stored=${storedId}, me=${data.id}. Using me.id`)
      return String(data.id)
    }
  } catch (e) {
    console.warn('resolveIgUserId failed, using stored id', e)
  }
  return storedId
}

async function publishPost(post: Record<string, any>, account: Record<string, any>): Promise<string> {
  const { access_token } = account
  const ig_user_id = await resolveIgUserId(account.ig_user_id, access_token)
  const caption = post.caption ?? ''

  if (post.post_type === 'IMAGE') {
    const cid = await createContainer(ig_user_id, access_token, {
      image_url: post.media_urls[0],
      caption,
    })
    // Imagens também precisam de tempo para processar antes de publicar
    await waitContainerReady(cid, access_token, 12, 5_000)
    return publishContainer(ig_user_id, access_token, cid)
  }

  if (post.post_type === 'CAROUSEL_ALBUM') {
    const childIds: string[] = []
    for (const url of post.media_urls) {
      const cid = await createContainer(ig_user_id, access_token, {
        image_url:        url,
        is_carousel_item: 'true',
      })
      childIds.push(cid)
    }
    const carouselCid = await createContainer(ig_user_id, access_token, {
      media_type: 'CAROUSEL',
      children:   childIds.join(','),
      caption,
    })
    await waitContainerReady(carouselCid, access_token, 12, 5_000)
    return publishContainer(ig_user_id, access_token, carouselCid)
  }

  if (post.post_type === 'REELS') {
    const cid = await createContainer(ig_user_id, access_token, {
      media_type: 'REELS',
      video_url:  post.media_urls[0],
      caption,
    })
    // Vídeos demoram mais — até 150 segundos
    await waitContainerReady(cid, access_token, 30, 5_000)
    return publishContainer(ig_user_id, access_token, cid)
  }

  throw new Error(`Tipo desconhecido: ${post.post_type}`)
}

// ── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  // Aceita service role key OU cron secret dedicado
  const auth   = req.headers.get('Authorization') ?? ''
  const secret = req.headers.get('X-Cron-Secret')  ?? ''
  const token  = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const authorized = token === SUPABASE_SERVICE || secret === CRON_SECRET || token === CRON_SECRET
  if (!authorized) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

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

  // Busca nomes dos clientes em lote
  const clientIds = [...new Set(posts.map((p: any) => p.client_id).filter(Boolean))]
  const clientNames: Record<string, string> = {}
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, company_name')
      .in('id', clientIds)
    for (const c of (clients ?? []) as any[]) {
      clientNames[c.id] = c.company_name
    }
  }

  let published = 0
  const results: any[] = []

  for (const post of posts) {
    const clientName: string | null = post.client_id ? (clientNames[post.client_id] ?? null) : null
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

      // Notifica a agência que o post foi publicado com sucesso
      if (post.user_id) {
        const prefix = clientName ? `[${clientName}] ` : ''
        const caption = post.caption
          ? ': "' + String(post.caption).slice(0, 60) + (post.caption.length > 60 ? '…' : '') + '"'
          : '.'
        await (supabase as any).from('notifications').insert({
          user_id:   post.user_id,
          client_id: post.client_id ?? null,
          type:      'POST_PUBLISHED',
          title:     'Post publicado no Instagram ✅',
          message:   `${prefix}O conteúdo agendado foi publicado com sucesso${caption}`,
          link:      '/instagram',
          is_read:   false,
        })
      }

      published++
      results.push({ id: post.id, status: 'published', ig_post_id: igPostId })

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const attempts = post.retry_count ?? 0

      // Erro transitório (ex.: timeout do Instagram baixando a mídia) e ainda
      // há tentativas → devolve para "scheduled" e tenta de novo no próximo
      // ciclo do cron (~1 min depois). Não notifica e não marca como falha.
      if (isRetryableError(msg) && attempts < MAX_RETRIES) {
        const nextAttempt = attempts + 1
        await supabase
          .from('scheduled_posts')
          .update({
            status:        'scheduled',
            retry_count:   nextAttempt,
            error_message: null,
            updated_at:    new Date().toISOString(),
          })
          .eq('id', post.id)

        console.log(`Post ${post.id}: erro transitório, reagendando (tentativa ${nextAttempt}/${MAX_RETRIES}). ${msg}`)
        results.push({ id: post.id, status: 'retry_scheduled', attempt: nextAttempt, error: msg })
        continue
      }

      // Erro permanente ou tentativas esgotadas → falha definitiva.
      await supabase
        .from('scheduled_posts')
        .update({ status: 'failed', error_message: msg, updated_at: new Date().toISOString() })
        .eq('id', post.id)

      // Notifica a agência que o post falhou
      if (post.user_id) {
        const exhausted = attempts >= MAX_RETRIES
        const prefix = clientName ? `[${clientName}] ` : ''
        await (supabase as any).from('notifications').insert({
          user_id:   post.user_id,
          client_id: post.client_id ?? null,
          type:      'POST_FAILED',
          title:     'Falha ao publicar no Instagram ❌',
          message:   exhausted
            ? `${prefix}Não foi possível publicar mesmo após ${MAX_RETRIES} tentativas automáticas. Verifique a aba Instagram.`
            : `${prefix}Não foi possível publicar o conteúdo agendado. Verifique a aba Instagram.`,
          link:      '/instagram',
          is_read:   false,
        })
      }

      results.push({ id: post.id, status: 'failed', error: msg })
    }
  }

  return new Response(JSON.stringify({ published, total: posts.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
