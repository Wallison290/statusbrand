-- ── Instagram por cliente ─────────────────────────────────────────────────────
-- Adiciona client_id em instagram_accounts para vincular conta por cliente

ALTER TABLE instagram_accounts
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients ON DELETE SET NULL;

-- Remove constraint antiga e cria nova que inclui client_id
-- NULL client_id = conta pessoal da agência (legado)
-- Non-null client_id = conta do cliente específico
ALTER TABLE instagram_accounts
  DROP CONSTRAINT IF EXISTS instagram_accounts_user_id_ig_user_id_key;

ALTER TABLE instagram_accounts
  ADD CONSTRAINT instagram_accounts_user_id_ig_user_id_client_id_key
  UNIQUE NULLS NOT DISTINCT (user_id, ig_user_id, client_id);

-- Índice para busca por client_id
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_client_id
  ON instagram_accounts (client_id)
  WHERE client_id IS NOT NULL;
