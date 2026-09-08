-- ── 071_whatsapp_health.sql ──────────────────────────────────────────────────
-- Monitoramento da conexão da instância UazAPI.
--
-- Problema que isto resolve: quando a instância do WhatsApp desconecta, nada no
-- sistema percebe. As notificações param de sair em silêncio e o primeiro sinal
-- é um envio falhando na frente do cliente ("Edge Function returned a non-2xx
-- status code"). Entre a queda e a descoberta, todo o planejamento fica sem
-- aviso e ninguém sabe.
--
-- Esta migration:
--   1. Cria a tabela de estado public.whatsapp_health (uma linha só)
--   2. RLS: leitura apenas para admin; escrita apenas pela service_role
--   3. Agenda a Edge Function whatsapp-health a cada 5 min via pg_cron
--
-- PRÉ-REQUISITO: a Edge Function precisa estar publicada ANTES do cron rodar:
--   supabase functions deploy whatsapp-health
--
-- Secrets usados pela função: ALERT_EMAIL (destino do alerta), RESEND_API_KEY,
-- CRON_SECRET e o par de URL/token da UazAPI (aceita UAZAPI_* ou EVOLUTION_*).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Estado da conexão (linha única, id sempre = 1) ────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_health (
  id              smallint    PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  status          text        NOT NULL DEFAULT 'unknown'
                              CHECK (status IN ('connected', 'disconnected', 'unknown')),
  -- Resposta crua da UazAPI na última checagem: é o que explica a queda.
  detail          text,
  last_checked_at timestamptz,
  last_ok_at      timestamptz,
  -- Quando o status mudou pela última vez — é daqui que sai o "fora desde".
  changed_at      timestamptz,
  -- Último alerta efetivamente enviado; controla o re-alerta de 6 em 6 horas.
  alerted_at      timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.whatsapp_health IS
  'Estado da conexão da instância UazAPI. Escrito pela Edge Function whatsapp-health (cron 5 min).';

INSERT INTO public.whatsapp_health (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── 2. RLS ───────────────────────────────────────────────────────────────────
-- A instância da UazAPI é um recurso da plataforma, não de uma agência: uma
-- queda afeta todo mundo e quem age sobre ela é o admin. Por isso a leitura é
-- restrita a is_admin() — o banner do painel se apoia nesta policy.
-- A escrita não tem policy nenhuma: só a service_role (a Edge Function), que
-- passa por cima da RLS, grava aqui.
ALTER TABLE public.whatsapp_health ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.whatsapp_health TO authenticated;

DROP POLICY IF EXISTS whatsapp_health_admin_read ON public.whatsapp_health;
CREATE POLICY whatsapp_health_admin_read ON public.whatsapp_health
  FOR SELECT TO authenticated USING (public.is_admin());

-- ── 3. Cron a cada 5 minutos ─────────────────────────────────────────────────
-- Mesmo esquema da 068 (instagram-token-refresh): a URL base e o segredo saem
-- do Vault, e a autenticação usa o CRON_SECRET de baixo privilégio em vez da
-- service_role key — se vazar, só permite disparar a checagem, não ler o banco.
--
-- Reaproveita os segredos que a 068 já criou. Para separar os dois crons depois,
-- basta criar 'whatsapp_cron_base_url' / 'whatsapp_cron_secret' no Vault, que
-- têm prioridade no coalesce abaixo.
DO $$
DECLARE
  v_base text := coalesce(
    current_setting('app.settings.supabase_url', true),
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'whatsapp_cron_base_url'),
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'instagram_cron_base_url')
  );
  v_secret_name text := (
    SELECT name FROM vault.secrets
    WHERE name IN ('whatsapp_cron_secret', 'instagram_cron_secret')
    ORDER BY CASE name WHEN 'whatsapp_cron_secret' THEN 0 ELSE 1 END
    LIMIT 1
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

  IF v_secret_name IS NULL THEN
    RAISE NOTICE 'Nenhum segredo de cron no Vault — cron NÃO agendado.';
    RETURN;
  END IF;

  -- Idempotente: remove agendamento anterior se existir
  PERFORM cron.unschedule('whatsapp-health')
  FROM cron.job WHERE jobname = 'whatsapp-health';

  PERFORM cron.schedule(
    'whatsapp-health',
    '*/5 * * * *',
    format(
      $cron$
      SELECT net.http_post(
        url     := %L,
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'X-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets
                            WHERE name = %L)
        ),
        body    := '{}'::jsonb
      );
      $cron$,
      v_base || '/functions/v1/whatsapp-health',
      v_secret_name
    )
  );

  RAISE NOTICE 'Cron "whatsapp-health" agendado para rodar a cada 5 minutos.';
END $$;
