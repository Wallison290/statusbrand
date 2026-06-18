-- ── 048_whatsapp_webhook.sql ─────────────────────────────────────────────────
-- Liga o INSERT em public.notifications à Edge Function notify-whatsapp.
--
-- Estratégia: trigger AFTER INSERT que faz um POST assíncrono (pg_net) para a
-- função. Como pg_net é fire-and-forget e NÃO bloqueia a transação, mesmo que a
-- Evolution esteja fora do ar a notificação no app é criada normalmente — o cron
-- de reprocessamento (sweep) cobre o que falhar.
--
-- PRÉ-REQUISITOS (executar uma vez no projeto):
--   create extension if not exists pg_net;
--   -- Guarde a URL do projeto e a service role key como GUC do banco:
--   alter database postgres set app.settings.supabase_url        = 'https://<ref>.supabase.co';
--   alter database postgres set app.settings.service_role_key    = '<service_role_key>';
-- (Esses valores também podem ser injetados via Supabase Vault; ver README.)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.dispatch_whatsapp_notification()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_base_url text;
  v_key      text;
BEGIN
  -- Só vale a pena chamar a função se a notificação é de uma categoria
  -- que pode ir para a agência. (O filtro definitivo — role/opt-in/prefs —
  -- acontece na edge function; aqui é só para evitar chamadas inúteis.)
  IF public.notification_category(NEW.type) IS NULL THEN
    RETURN NEW;
  END IF;

  v_base_url := current_setting('app.settings.supabase_url', true);
  v_key      := current_setting('app.settings.service_role_key', true);

  IF v_base_url IS NULL OR v_key IS NULL THEN
    -- Sem config: não derruba o INSERT; o sweep do cron entregará depois.
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := v_base_url || '/functions/v1/notify-whatsapp',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := jsonb_build_object('type', 'INSERT', 'record', to_jsonb(NEW))
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_dispatch_whatsapp ON public.notifications;
CREATE TRIGGER trigger_dispatch_whatsapp
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_whatsapp_notification();

-- ── Cron de reprocessamento (rede de segurança) ──────────────────────────────
-- Requer a extensão pg_cron habilitada no projeto. Roda a cada 5 minutos e
-- chama a função em modo "sweep" (sem record), que reprocessa pending/failed.
--
--   create extension if not exists pg_cron;
--
-- select cron.schedule(
--   'whatsapp-notif-sweep',
--   '*/5 * * * *',
--   $$
--   select net.http_post(
--     url     := current_setting('app.settings.supabase_url') || '/functions/v1/notify-whatsapp',
--     headers := jsonb_build_object(
--       'Content-Type','application/json',
--       'Authorization','Bearer ' || current_setting('app.settings.service_role_key')
--     ),
--     body    := '{}'::jsonb
--   );
--   $$
-- );
