-- ── 068_instagram_token_refresh.sql ──────────────────────────────────────────
-- Renovação automática dos tokens do Instagram.
--
-- Problema que isto resolve: o long-lived token gravado pelo instagram-oauth
-- vale 60 dias. Nada no sistema o renovava, então a cada 60 dias todas as
-- publicações agendadas passavam a falhar com OAuthException 190
-- ("Session has expired") até alguém reconectar a conta na mão.
--
-- Esta migration:
--   1. Cria o tipo de notificação IG_TOKEN_EXPIRING
--   2. Índice para a checagem de vencimento
--   3. Agenda a Edge Function instagram-token-refresh 1x por dia via pg_cron
--
-- PRÉ-REQUISITO: a Edge Function precisa estar publicada ANTES do cron rodar:
--   supabase functions deploy instagram-token-refresh
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Novo tipo de notificação ──────────────────────────────────────────────
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'NEW_CONTENT', 'APPROVAL_REQUEST', 'APPROVED', 'REJECTED', 'COMMENT',
    'ADJUSTMENT_DONE', 'TASK_STATUS_UPDATE', 'TASK_DONE', 'FORM_SUBMITTED',
    'POST_PUBLISHED', 'POST_FAILED', 'NOTE_REQUEST', 'NEW_REPORT',
    'IG_TOKEN_EXPIRING'
  ));

-- ── 2. Índice para a varredura diária ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_expiry
  ON public.instagram_accounts (token_expires_at)
  WHERE is_active = true;

-- ── 3. Cron diário ───────────────────────────────────────────────────────────
-- Roda às 04:00 UTC (01:00 em Brasília) — fora do horário de publicação.
-- Requer pg_cron + pg_net e os GUC app.settings.* já usados pelo cron do
-- WhatsApp (ver infra/evolution/README.md, Passo 5).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN

    -- Idempotente: remove agendamento anterior se existir
    PERFORM cron.unschedule('instagram-token-refresh')
    FROM cron.job WHERE jobname = 'instagram-token-refresh';

    PERFORM cron.schedule(
      'instagram-token-refresh',
      '0 4 * * *',
      $cron$
      SELECT net.http_post(
        url     := current_setting('app.settings.supabase_url') || '/functions/v1/instagram-token-refresh',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body    := '{}'::jsonb
      );
      $cron$
    );

    RAISE NOTICE 'Cron "instagram-token-refresh" agendado para 04:00 UTC diariamente.';
  ELSE
    RAISE NOTICE 'pg_cron/pg_net indisponíveis. Agende manualmente: Database -> Scheduled Tasks -> POST /functions/v1/instagram-token-refresh, diário.';
  END IF;
END $$;
