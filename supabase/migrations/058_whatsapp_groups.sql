-- ── 058: whatsapp_groups ──────────────────────────────────────────────────────
-- Tabela para armazenar grupos de WhatsApp configurados pela agência.
-- Cada grupo pode ter categorias diferentes de notificações habilitadas.

CREATE TABLE IF NOT EXISTS whatsapp_groups (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_jid   text        NOT NULL,
  group_name  text        NOT NULL,
  categories  jsonb       NOT NULL DEFAULT '{"aprovacoes":true,"tarefas":true,"instagram":true,"solicitacoes":true}',
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, group_jid)
);

ALTER TABLE whatsapp_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency manages own groups"
  ON whatsapp_groups FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX ON whatsapp_groups (user_id) WHERE is_active = true;
