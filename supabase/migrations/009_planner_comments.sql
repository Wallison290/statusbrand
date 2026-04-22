-- Thread de comentários por item do planejador
CREATE TABLE planner_comments (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  planner_id  uuid        NOT NULL REFERENCES planner(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id),
  role        text        NOT NULL CHECK (role IN ('client', 'agency')),
  message     text        NOT NULL CHECK (char_length(trim(message)) > 0),
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE planner_comments ENABLE ROW LEVEL SECURITY;

-- Agência: acesso total a comentários dos seus clientes
CREATE POLICY "agency_all_comments" ON planner_comments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM planner p
      JOIN clients c ON c.id = p.client_id
      WHERE p.id = planner_comments.planner_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM planner p
      JOIN clients c ON c.id = p.client_id
      WHERE p.id = planner_comments.planner_id
        AND c.user_id = auth.uid()
    )
  );

-- Portal: cliente lê comentários do seu cliente vinculado
CREATE POLICY "portal_read_comments" ON planner_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM planner p
      WHERE p.id = planner_comments.planner_id
        AND p.client_id = public.get_my_linked_client_id()
    )
  );

-- Portal: cliente insere comentários (apenas com seu próprio user_id)
CREATE POLICY "portal_insert_comments" ON planner_comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM planner p
      WHERE p.id = planner_comments.planner_id
        AND p.client_id = public.get_my_linked_client_id()
    )
  );
