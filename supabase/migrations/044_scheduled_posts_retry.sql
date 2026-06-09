-- =============================================
-- KairoHub — Retry automático de publicação no Instagram
-- Adiciona um contador de tentativas em scheduled_posts. Quando a publicação
-- falha por erro transitório (ex.: o Instagram demora demais para baixar a
-- mídia → subcode 2207003 "Timeout"), o cron reagenda o post para a próxima
-- execução em vez de marcá-lo como "failed" na hora. Só após esgotar as
-- tentativas (MAX_RETRIES na Edge Function) o post vai para "failed".
-- Execute no SQL Editor do Supabase.
-- =============================================

ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.scheduled_posts.retry_count IS
  'Número de tentativas automáticas já feitas após falha transitória de publicação.';
