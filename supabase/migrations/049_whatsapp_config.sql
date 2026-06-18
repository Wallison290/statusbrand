-- ── 049_whatsapp_config.sql ───────────────────────────────────────────────────
-- O Supabase bloqueia ALTER DATABASE/ROLE para GUCs customizadas via API.
-- Solução: tabela app_config lida pelo trigger dispatch_whatsapp_notification.
-- Os valores são inseridos separadamente via .deploy/set-guc-whatsapp.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- Tabela de configuração interna (sem RLS — só lida internamente pelo trigger)
CREATE TABLE IF NOT EXISTS public.app_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

-- Sem RLS: o trigger SECURITY DEFINER com search_path=public tem acesso direto.
-- A tabela não é exposta pelo PostgREST (não há grant para anon/authenticated).
REVOKE ALL ON public.app_config FROM anon, authenticated;

-- Atualiza o trigger para ler da tabela em vez de GUC.
-- Mantém fallback para GUC por compatibilidade.
CREATE OR REPLACE FUNCTION public.dispatch_whatsapp_notification()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_base_url text;
  v_key      text;
BEGIN
  IF public.notification_category(NEW.type) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Tenta GUC primeiro (caso esteja configurado); depois cai para app_config.
  v_base_url := current_setting('app.settings.supabase_url', true);
  v_key      := current_setting('app.settings.service_role_key', true);

  IF v_base_url IS NULL OR v_base_url = '' THEN
    SELECT value INTO v_base_url FROM public.app_config WHERE key = 'supabase_url';
  END IF;
  IF v_key IS NULL OR v_key = '' THEN
    SELECT value INTO v_key FROM public.app_config WHERE key = 'service_role_key';
  END IF;

  IF v_base_url IS NULL OR v_key IS NULL THEN
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
