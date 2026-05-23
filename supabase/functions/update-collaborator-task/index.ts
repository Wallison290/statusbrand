// Edge Function: update-collaborator-task
// Permite ao colaborador atualizar status, nota e URL de entrega sem autenticação

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STATUS_LABELS: Record<string, string> = {
  a_fazer:      'A fazer',
  em_andamento: 'Em andamento',
  revisao:      'Em revisão',
  concluido:    'Concluído',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { portal_token, task_id, status, collaborator_note, delivery_url } = await req.json()

    if (!portal_token || !task_id || !status) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios faltando' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (!STATUS_LABELS[status]) {
      return new Response(JSON.stringify({ error: 'Status inválido' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Valida token e busca membro
    const { data: member, error: memberErr } = await supabase
      .from('team_members')
      .select('id, name, user_id')
      .eq('portal_token', portal_token)
      .eq('is_active', true)
      .single()

    if (memberErr || !member) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Verifica que a tarefa pertence ao membro
    const { data: task, error: taskErr } = await supabase
      .from('tasks')
      .select('id, title, user_id, status')
      .eq('id', task_id)
      .eq('assignee_id', member.id)
      .single()

    if (taskErr || !task) {
      return new Response(JSON.stringify({ error: 'Tarefa não encontrada ou sem permissão' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Monta update
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (collaborator_note !== undefined) updateData.collaborator_note = collaborator_note
    if (delivery_url      !== undefined) updateData.delivery_url      = delivery_url

    const { error: updateErr } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', task_id)

    if (updateErr) throw updateErr

    // Cria notificação para o dono da agência
    await supabase.from('notifications').insert({
      user_id: task.user_id,
      type:    'TASK_STATUS_UPDATE',
      title:   `${member.name} atualizou uma tarefa`,
      message: `"${task.title}" → ${STATUS_LABELS[status]}`,
      link:    task_id,
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
