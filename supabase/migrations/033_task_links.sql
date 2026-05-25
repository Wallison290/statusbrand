-- ── Links/anexos por tarefa ───────────────────────────────────────────────────
-- Armazena array de links/referências adicionados pela agência para o colaborador

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS task_links JSONB DEFAULT '[]'::jsonb;

-- Atualiza a função RPC do portal para incluir task_links
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
  SELECT id, name, role, color, avatar_url, portal_token, user_id
  INTO   v_member
  FROM   team_members
  WHERE  portal_token = p_token
    AND  is_active    = true
  LIMIT  1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Link inválido ou colaborador inativo');
  END IF;

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
      'task_links',        COALESCE(t.task_links, '[]'::jsonb),
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

GRANT EXECUTE ON FUNCTION get_collaborator_data(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_collaborator_data(TEXT) TO authenticated;
