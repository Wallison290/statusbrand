-- ── Funções RPC para o Portal do Colaborador ─────────────────────────────────
-- Substitui as Edge Functions por funções PostgreSQL chamadas diretamente
-- pelo cliente Supabase. Não precisa de CLI para deploy.

-- ── 1. Buscar dados do colaborador pelo token ─────────────────────────────────
CREATE OR REPLACE FUNCTION get_collaborator_data(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member RECORD;
  v_tasks  JSON;
BEGIN
  -- Busca o membro pelo token
  SELECT id, name, role, color, avatar_url, portal_token, user_id
  INTO   v_member
  FROM   team_members
  WHERE  portal_token = p_token
    AND  is_active    = true
  LIMIT  1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Link inválido ou colaborador inativo');
  END IF;

  -- Busca as tarefas atribuídas ao membro (com join de clientes)
  SELECT json_agg(
    json_build_object(
      'id',                t.id,
      'title',             t.title,
      'description',       t.description,
      'status',            t.status,
      'priority',          t.priority,
      'due_date',          t.due_date,
      'collaborator_note', t.collaborator_note,
      'delivery_url',      t.delivery_url,
      'created_at',        t.created_at,
      'updated_at',        t.updated_at,
      'client_id',         t.client_id,
      'clients',           CASE
                             WHEN c.id IS NOT NULL
                             THEN json_build_object('id', c.id, 'company_name', c.company_name)
                             ELSE NULL
                           END
    )
    ORDER BY t.due_date ASC NULLS LAST
  ) INTO v_tasks
  FROM  tasks t
  LEFT  JOIN clients c ON c.id = t.client_id
  WHERE t.assignee_id = v_member.id;

  RETURN json_build_object(
    'member', json_build_object(
      'id',           v_member.id,
      'name',         v_member.name,
      'role',         v_member.role,
      'color',        v_member.color,
      'avatar_url',   v_member.avatar_url,
      'portal_token', v_member.portal_token,
      'user_id',      v_member.user_id
    ),
    'tasks', COALESCE(v_tasks, '[]'::json)
  );
END;
$$;

-- Permite chamada por usuários anônimos (portal público)
GRANT EXECUTE ON FUNCTION get_collaborator_data(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_collaborator_data(TEXT) TO authenticated;


-- ── 2. Atualizar tarefa pelo colaborador ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_collaborator_task(
  p_token             TEXT,
  p_task_id           UUID,
  p_status            TEXT    DEFAULT NULL,
  p_collaborator_note TEXT    DEFAULT NULL,
  p_delivery_url      TEXT    DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
BEGIN
  -- Valida o token e obtém o ID do membro
  SELECT id INTO v_member_id
  FROM   team_members
  WHERE  portal_token = p_token
    AND  is_active    = true
  LIMIT  1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Token inválido');
  END IF;

  -- Verifica que a tarefa pertence ao membro
  IF NOT EXISTS (
    SELECT 1 FROM tasks WHERE id = p_task_id AND assignee_id = v_member_id
  ) THEN
    RETURN json_build_object('error', 'Tarefa não encontrada ou sem permissão');
  END IF;

  -- Atualiza apenas os campos fornecidos (NULL = manter valor atual)
  UPDATE tasks SET
    status            = CASE WHEN p_status            IS NOT NULL THEN p_status            ELSE status            END,
    collaborator_note = CASE WHEN p_collaborator_note IS NOT NULL THEN p_collaborator_note ELSE collaborator_note END,
    delivery_url      = CASE WHEN p_delivery_url      IS NOT NULL THEN p_delivery_url      ELSE delivery_url      END,
    updated_at        = NOW()
  WHERE id = p_task_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Permite chamada por usuários anônimos (portal público)
GRANT EXECUTE ON FUNCTION update_collaborator_task(TEXT, UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_collaborator_task(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;
