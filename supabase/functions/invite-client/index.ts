// ── invite-client: envia convite de acesso ao portal para o cliente ───────────

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  // Planos sem acesso ao portal (bloquear convite)
  const PLANS_WITHOUT_PORTAL = ['starter']

  try {
    const { email, clientId, clientName, companyName, redirectTo, resend } = await req.json()

    if (!email) throw new Error('Email é obrigatório')
    if (!clientId) throw new Error('clientId é obrigatório')

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // ── Gate: verifica se a agência dona do cliente tem portal ativado ─────────
    const { data: clientRow } = await sb.from('clients').select('user_id').eq('id', clientId).single()
    if (clientRow?.user_id) {
      const { data: sub } = await sb
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', clientRow.user_id)
        .maybeSingle()

      const plan   = sub?.plan ?? 'starter'
      const status = sub?.status ?? 'inactive'
      const isActive = status === 'active' || status === 'trialing'

      if (!isActive || PLANS_WITHOUT_PORTAL.includes(plan)) {
        return new Response(
          JSON.stringify({ error: 'Portal do cliente disponível apenas nos planos Pro e Agency. Faça upgrade para convidar clientes.' }),
          { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } },
        )
      }
    }

    // ── Verifica se o usuário já existe no Auth ────────────────────────────────
    const { data: existing } = await sb.auth.admin.listUsers()
    const existingUser = existing?.users?.find(u => u.email === email)

    if (existingUser) {
      if (!resend) {
        // Não é reenvio — retorna skipped (comportamento original)
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: 'already_exists' }),
          { headers: { ...CORS, 'Content-Type': 'application/json' } },
        )
      }

      // É reenvio — deleta o usuário e convida novamente
      // Seguro pois o cliente ainda não criou senha (needs_password_setup=true)
      const { error: deleteError } = await sb.auth.admin.deleteUser(existingUser.id)
      if (deleteError) throw deleteError
    }

    // ── Envia convite ──────────────────────────────────────────────────────────
    const { data: inviteData, error } = await sb.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo ?? 'https://kairohub.app.br/auth/callback',
      data: {
        role: 'client',
        full_name: clientName ?? '',
        company_name: companyName ?? '',
        linked_client_id: clientId,
        needs_password_setup: true,   // flag: cliente ainda não criou senha
      },
    })

    if (error) throw error

    // Garante que o profile foi criado com role=client e linked_client_id
    if (inviteData?.user?.id) {
      await sb.rpc('setup_client_profile', {
        p_user_id:     inviteData.user.id,
        p_client_id:   clientId,
        p_client_name: clientName ?? '',
        p_email:       email,
      })
    }

    return new Response(
      JSON.stringify({ success: true, resent: !!resend }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
