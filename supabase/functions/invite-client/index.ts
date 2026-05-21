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

  try {
    const { email, clientId, clientName, companyName, redirectTo } = await req.json()

    if (!email) throw new Error('Email é obrigatório')
    if (!clientId) throw new Error('clientId é obrigatório')

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Verifica se o usuário já existe no Auth
    const { data: existing } = await sb.auth.admin.listUsers()
    const alreadyExists = existing?.users?.some(u => u.email === email)

    if (alreadyExists) {
      // Usuário já tem acesso — não reenvia convite
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'already_exists' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const { data: inviteData, error } = await sb.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo ?? 'https://statusbrand-snowy.vercel.app/client-setup',
      data: {
        role: 'client',
        full_name: clientName ?? '',
        company_name: companyName ?? '',
        linked_client_id: clientId,
      },
    })

    if (error) throw error

    // Garante que o profile foi criado com role=client e linked_client_id
    // (o trigger handle_new_user já deve fazer isso, mas esta chamada
    //  serve como garantia em caso de race condition)
    if (inviteData?.user?.id) {
      await sb.rpc('setup_client_profile', {
        p_user_id:     inviteData.user.id,
        p_client_id:   clientId,
        p_client_name: clientName ?? '',
        p_email:       email,
      })
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
