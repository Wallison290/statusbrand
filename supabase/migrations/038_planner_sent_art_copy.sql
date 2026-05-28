-- =============================================
-- AgênciaForge — Envio ao cliente + aprovação separada de Arte e Copy
-- Execute no SQL Editor do Supabase
-- =============================================

-- Controla se o item já foi enviado ao cliente (visibilidade no portal)
ALTER TABLE planner ADD COLUMN IF NOT EXISTS sent_to_client BOOLEAN DEFAULT FALSE;

-- Aprovação separada: Arte (imagem/vídeo)
ALTER TABLE planner ADD COLUMN IF NOT EXISTS art_approval_status TEXT DEFAULT NULL;
ALTER TABLE planner ADD COLUMN IF NOT EXISTS art_feedback TEXT DEFAULT NULL;

-- Aprovação separada: Copy (texto/legenda)
ALTER TABLE planner ADD COLUMN IF NOT EXISTS copy_approval_status TEXT DEFAULT NULL;
ALTER TABLE planner ADD COLUMN IF NOT EXISTS copy_feedback TEXT DEFAULT NULL;

-- Index para facilitar filtragem no portal
CREATE INDEX IF NOT EXISTS idx_planner_sent_to_client ON planner(client_id, sent_to_client);
