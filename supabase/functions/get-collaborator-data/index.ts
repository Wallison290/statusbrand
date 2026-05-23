// Edge Function: get-collaborator-data
// Retorna dados do membro e suas tarefas via portal_token (sem autenticação)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { portal_token } = await req.json()

    if (!portal_token) {
      return new Response(JSON.stringify({ error: 'Token obrigatório' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Busca membro pelo token
    const { data: member, error: memberErr } = await supabase
      .from('team_members')
      .select('id, name, role, color, avatar_url, portal_token, user_id')
      .eq('portal_token', portal_token)
      .eq('is_active', true)
      .single()

    if (memberErr || !member) {
      return new Response(JSON.stringify({ error: 'Link inválido ou colaborador inativo' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Busca tarefas atribuídas a esse membro
    const { data: tasks, error: tasksErr } = await supabase
      .from('tasks')
      .select(`
        id, title, description, status, priority, due_date,
        collaborator_note, delivery_url, created_at, updated_at,
        client_id, clients(id, name)
      `)
      .eq('assignee_id', member.id)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (tasksErr) throw tasksErr

    return new Response(JSON.stringify({ member, tasks: tasks ?? [] }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
