// ── Edge Function: instagram-report ───────────────────────────────────────────
// Gera (ou atualiza) o relatório MENSAL de um cliente puxando as métricas da
// conta de Instagram conectada via API de Insights (instagram_business_manage_insights).
//
// Entrada (POST, autenticado com o JWT do usuário da agência):
//   { client_id: uuid, month: 1-12, year: number }
//
// Preenche em client_reports: followers_start, followers_end, reach,
// impressions, engagement (%), posts_published — mantendo intactos os campos de
// tráfego pago e a análise escrita. Marca auto_generated = true.
//
// Robusto: cada métrica é buscada de forma independente; se uma falhar (ex.: a
// permissão ainda não foi aprovada/concedida), ela vira null e seguimos com o
// resto, retornando os avisos. Se NADA vier, retorna erro claro.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON    = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const IG_API           = 'https://graph.instagram.com/v21.0'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

// Janela do mês em segundos Unix (UTC): [00:00 do dia 1, 00:00 do dia 1 do mês seguinte)
function monthRange(year: number, month: number) {
  const since = Math.floor(Date.UTC(year, month - 1, 1, 0, 0, 0) / 1000)
  const until = Math.floor(Date.UTC(year, month, 1, 0, 0, 0) / 1000)
  return { since, until }
}

// Busca UMA métrica de conta e devolve o total no período (ou null se falhar).
// Lida com os dois formatos da API: total_value (agregado) e values[] (série).
async function fetchAccountMetric(
  igUserId: string, token: string, metric: string,
  since: number, until: number, warnings: string[],
): Promise<number | null> {
  // Primeiro tenta o formato agregado (total_value), que é o ideal para somatório mensal.
  const tryUrls = [
    `${IG_API}/${igUserId}/insights?metric=${metric}&period=day&metric_type=total_value&since=${since}&until=${until}&access_token=${token}`,
    `${IG_API}/${igUserId}/insights?metric=${metric}&period=day&since=${since}&until=${until}&access_token=${token}`,
  ]
  for (const url of tryUrls) {
    try {
      const res  = await fetch(url)
      const data = await res.json()
      if (data.error) {
        // Guarda só o primeiro erro relevante por métrica e tenta o próximo formato.
        if (url === tryUrls[tryUrls.length - 1]) {
          warnings.push(`${metric}: ${data.error.message ?? 'erro'}`)
        }
        continue
      }
      const row = data?.data?.[0]
      if (!row) continue
      if (row.total_value && typeof row.total_value.value === 'number') {
        return row.total_value.value
      }
      if (Array.isArray(row.values)) {
        return row.values.reduce((s: number, v: any) => s + (Number(v.value) || 0), 0)
      }
    } catch (e) {
      warnings.push(`${metric}: ${String(e)}`)
    }
  }
  return null
}

// Conta quantas mídias foram publicadas no mês.
async function countMediaInMonth(
  igUserId: string, token: string, since: number, until: number, warnings: string[],
): Promise<number | null> {
  try {
    let url: string | null =
      `${IG_API}/${igUserId}/media?fields=id,timestamp&since=${since}&until=${until}&limit=100&access_token=${token}`
    let count = 0
    let guard = 0
    while (url && guard < 10) {
      const res: Response = await fetch(url)
      const data = await res.json()
      if (data.error) { warnings.push(`media: ${data.error.message ?? 'erro'}`); return null }
      count += (data.data?.length ?? 0)
      url = data.paging?.next ?? null
      guard++
    }
    return count
  } catch (e) {
    warnings.push(`media: ${String(e)}`)
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // ── Autenticação: identifica a agência pelo JWT ───────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Não autenticado' }, 401)

    const { client_id, month, year } = await req.json()
    if (!client_id || !month || !year) return json({ error: 'Parâmetros faltando (client_id, month, year)' }, 400)
    if (month < 1 || month > 12) return json({ error: 'Mês inválido' }, 400)

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE)

    // ── Confirma que o cliente pertence à agência ─────────────────────────────
    const { data: client } = await admin
      .from('clients')
      .select('id, user_id, company_name')
      .eq('id', client_id)
      .maybeSingle()
    if (!client || (client as any).user_id !== user.id) {
      return json({ error: 'Cliente não encontrado ou sem permissão' }, 403)
    }

    // ── Conta de Instagram conectada a esse cliente ───────────────────────────
    const { data: account } = await admin
      .from('instagram_accounts')
      .select('ig_user_id, username, access_token, followers_count, token_expires_at, is_active')
      .eq('client_id', client_id)
      .eq('is_active', true)
      .maybeSingle()

    const acc = account as any
    // Casos de "negócio" voltam como 200 + ok:false para o front ler a mensagem.
    if (!acc) {
      return json({ ok: false, error: 'no_account', message: 'Nenhuma conta de Instagram conectada a este cliente. Conecte na aba Instagram do cliente.' })
    }
    if (acc.token_expires_at && new Date(acc.token_expires_at) < new Date()) {
      return json({ ok: false, error: 'token_expired', message: 'O token do Instagram expirou. Reconecte a conta para gerar o relatório.' })
    }

    const token    = acc.access_token
    const igUserId = String(acc.ig_user_id)
    const { since, until } = monthRange(Number(year), Number(month))
    const warnings: string[] = []

    // ── Seguidores ATUAIS (live) → followers_end ──────────────────────────────
    let followersEnd: number | null = acc.followers_count ?? null
    try {
      const meRes  = await fetch(`${IG_API}/${igUserId}?fields=followers_count&access_token=${token}`)
      const meData = await meRes.json()
      if (!meData.error && typeof meData.followers_count === 'number') {
        followersEnd = meData.followers_count
        // mantém o cache em instagram_accounts atualizado
        await admin.from('instagram_accounts')
          .update({ followers_count: followersEnd, updated_at: new Date().toISOString() })
          .eq('client_id', client_id).eq('ig_user_id', igUserId)
      }
    } catch { /* usa o valor em cache */ }

    // ── followers_start = followers_end do mês anterior (se houver) ────────────
    const prevMonth = Number(month) === 1 ? 12 : Number(month) - 1
    const prevYear  = Number(month) === 1 ? Number(year) - 1 : Number(year)
    const { data: prevReport } = await admin
      .from('client_reports')
      .select('followers_end')
      .eq('client_id', client_id).eq('month', prevMonth).eq('year', prevYear)
      .maybeSingle()
    const followersStart = (prevReport as any)?.followers_end ?? null

    // ── Métricas de Insights do mês ───────────────────────────────────────────
    const reach        = await fetchAccountMetric(igUserId, token, 'reach', since, until, warnings)
    // "views" substituiu "impressions" nas versões novas; tenta views e cai p/ impressions.
    let impressions    = await fetchAccountMetric(igUserId, token, 'views', since, until, warnings)
    if (impressions == null) {
      impressions = await fetchAccountMetric(igUserId, token, 'impressions', since, until, warnings)
    }
    const interactions = await fetchAccountMetric(igUserId, token, 'total_interactions', since, until, warnings)
    const postsCount   = await countMediaInMonth(igUserId, token, since, until, warnings)

    // ── Engajamento (%) = interações / alcance * 100, limitado a 999.99 ────────
    let engagement: number | null = null
    if (interactions != null && reach && reach > 0) {
      engagement = Math.min(999.99, Math.round((interactions / reach) * 10000) / 100)
    }

    // Se TUDO falhou, provavelmente a permissão de insights ainda não está ativa.
    if (reach == null && impressions == null && interactions == null && postsCount == null) {
      return json({
        ok: false,
        error: 'insights_unavailable',
        message: 'Não foi possível ler os insights desta conta. Verifique se a permissão de insights foi concedida/aprovada e se a conta é Profissional (Business/Creator).',
        warnings,
      })
    }

    // ── Upsert: atualiza só os campos sociais; preserva pago/análise ──────────
    const social = {
      followers_start: followersStart,
      followers_end:   followersEnd,
      reach,
      impressions,
      engagement,
      posts_published: postsCount,
      auto_generated:  true,
      ig_synced_at:    new Date().toISOString(),
      updated_at:      new Date().toISOString(),
    }

    const { data: existing } = await admin
      .from('client_reports')
      .select('id')
      .eq('client_id', client_id).eq('month', month).eq('year', year)
      .maybeSingle()

    let reportId: string
    if (existing) {
      reportId = (existing as any).id
      const { error: upErr } = await admin.from('client_reports').update(social).eq('id', reportId)
      if (upErr) return json({ error: upErr.message }, 500)
    } else {
      const { data: ins, error: insErr } = await admin.from('client_reports')
        .insert({ client_id, user_id: user.id, month, year, ...social })
        .select('id').single()
      if (insErr) return json({ error: insErr.message }, 500)
      reportId = (ins as any).id
    }

    return json({
      ok: true,
      report_id: reportId,
      metrics: { followers_start: followersStart, followers_end: followersEnd, reach, impressions, engagement, posts_published: postsCount },
      account: acc.username,
      warnings,
    })
  } catch (err) {
    console.error('instagram-report error:', err)
    return json({ error: String(err) }, 500)
  }
})
