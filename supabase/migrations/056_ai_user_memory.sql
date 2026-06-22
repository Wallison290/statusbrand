-- Memórias de agência/usuário: fatos aprendidos sobre a forma de trabalhar da agência
-- Diferente de ai_client_memory (por cliente), esta tabela armazena aprendizados gerais do usuário

CREATE TABLE IF NOT EXISTS ai_user_memory (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key        TEXT        NOT NULL,
  value      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

ALTER TABLE ai_user_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own agency memories"
  ON ai_user_memory FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
