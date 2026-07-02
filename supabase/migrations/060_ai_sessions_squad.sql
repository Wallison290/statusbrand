-- Associa cada sessão de chat da StatusIA ao squad/estúdio onde foi criada
-- ('livre', 'imagem' ou o id de um squad de src/data/aiSquads.ts), permitindo
-- que o histórico apareça filtrado dentro de cada estúdio.

ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS squad_id TEXT;

CREATE INDEX IF NOT EXISTS ai_sessions_user_squad_idx
  ON ai_sessions(user_id, squad_id, updated_at DESC);
