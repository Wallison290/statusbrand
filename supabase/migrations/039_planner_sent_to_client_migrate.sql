-- =============================================
-- AgênciaForge — Migra itens existentes para sent_to_client
-- Itens que já tinham client_id são considerados como já enviados
-- Execute no SQL Editor do Supabase
-- =============================================

-- Itens antigos (criados antes do campo existir) que têm cliente
-- são marcados como enviados para não quebrarem o portal
UPDATE planner
SET sent_to_client = TRUE
WHERE client_id IS NOT NULL
  AND (sent_to_client IS NULL OR sent_to_client = FALSE);
