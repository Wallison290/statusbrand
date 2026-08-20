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
--
-- Autenticação: usa o CRON_SECRET (header X-Cron-Secret), não a service_role
-- key. A Edge Function aceita os dois, mas o CRON_SECRET é de baixo privilégio
-- — se vazar, só permite disparar a renovação, não ler o banco.
--
-- Pré-requisitos (setup único por projeto, ver README):
--   a) pg_cron e pg_net instalados
--   b) URL base do projeto — no GUC app.settings.supabase_url (exige superusuário,
--      indisponível via Management API) OU no Vault, que é o caminho usado aqui:
--        SELECT vault.create_secret('https://<ref>.supabase.co', 'instagram_cron_base_url');
--   c) CRON_SECRET guardado no Vault:
--        SELECT vault.create_secret('<valor>', 'instagram_cron_secret');
DO $$
DECLARE
  v_base text := coalesce(
    current_setting('app.settings.supabase_url', true),
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'instagram_cron_base_url')
  );
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     OR NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_cron/pg_net indisponíveis — cron NÃO agendado.';
    RETURN;
  END IF;

  IF v_base IS NULL THEN
    RAISE NOTICE 'URL base ausente (GUC e Vault) — cron NÃO agendado. Veja o cabeçalho desta migration.';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'instagram_cron_secret') THEN
    RAISE NOTICE 'Segredo "instagram_cron_secret" ausente no Vault — cron NÃO agendado.';
    RETURN;
  END IF;

  -- Idempotente: remove agendamento anterior se existir
  PERFORM cron.unschedule('instagram-token-refresh')
  FROM cron.job WHERE jobname = 'instagram-token-refresh';

  PERFORM cron.schedule(
    'instagram-token-refresh',
    '0 4 * * *',
    format(
      $cron$
      SELECT net.http_post(
        url     := %L,
        headers := jsonb_build_object(
          'Content-Type',   'application/json',
          'X-Cron-Secret',  (SELECT decrypted_secret FROM vault.decrypted_secrets
                             WHERE name = 'instagram_cron_secret')
        ),
        body    := '{}'::jsonb
      );
      $cron$,
      v_base || '/functions/v1/instagram-token-refresh'
    )
  );

  RAISE NOTICE 'Cron "instagram-token-refresh" agendado para 04:00 UTC diariamente.';
END $$;
