-- ── 054_production_hardening.sql ─────────────────────────────────────────────
-- Correções de prontidão para produção (auditoria de assinantes):
--   1. CRÍTICO: check_client_plan_limit — fecha paywall para usuários sem assinatura ativa
--   2. Coluna cancel_at_period_end na tabela subscriptions
--   3. Índice composto em scheduled_posts(status, scheduled_at) — cron 1440x/dia
--   4. Índices em notifications — listagem por usuário
--   5. RPC find_user_id_by_email — O(1) vs O(n) do listUsers()
--   6. Cron diário para expire_trials() via pg_cron (Supabase Pro)

-- ── 1. CRÍTICO: corrige check_client_plan_limit ────────────────────────────────
-- Problema: sem assinatura ou com assinatura inactive/past_due retornava 999999 (ilimitado)
CREATE OR REPLACE FUNCTION public.check_client_plan_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_plan   text;
  v_status text;
  v_count  integer;
  v_limit  integer;
BEGIN
  -- Busca plano E status da assinatura ativa
  SELECT plan, status INTO v_plan, v_status
  FROM public.subscriptions
  WHERE user_id = NEW.user_id;

  -- Sem assinatura = bloqueado
  IF v_plan IS NULL THEN
    RAISE EXCEPTION 'Sem assinatura encontrada. Assine um plano para adicionar clientes.';
  END IF;

  -- Somente assinaturas ativas ou em trial têm acesso
  IF v_status NOT IN ('active', 'trialing') THEN
    RAISE EXCEPTION 'Assinatura inativa (status: %). Reative para adicionar clientes.', v_status;
  END IF;

  -- Limite por plano (agency = ilimitado)
  v_limit := CASE v_plan
    WHEN 'starter' THEN 5
    WHEN 'pro'     THEN 20
    WHEN 'agency'  THEN 999999
    ELSE 0
  END;

  -- 0 = plano desconhecido = bloqueado
  IF v_limit = 0 THEN
    RAISE EXCEPTION 'Plano desconhecido (%). Entre em contato com o suporte.', v_plan;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.clients
  WHERE user_id = NEW.user_id
    AND status NOT IN ('inactive', 'cancelado');

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Limite de clientes do plano % atingido (máx. %). Faça upgrade para adicionar mais.',
      v_plan, v_limit;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 2. Coluna cancel_at_period_end (cancelamento agendado pelo usuário) ─────────
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

-- ── 3. Índice composto em scheduled_posts — query crítica do cron (1440x/dia) ───
-- Sem esse índice: full scan a cada minuto com crescimento de posts
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_pending
  ON public.scheduled_posts (scheduled_at, status)
  WHERE status = 'scheduled';

-- ── 4. Índices em notifications ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_all
  ON public.notifications (user_id, created_at DESC);

-- ── 5. RPC find_user_id_by_email — substitui listUsers() O(n) no invite-client ─
-- Retorna uuid do usuário ou NULL se não existir
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(p_email text)
RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id FROM auth.users WHERE email = lower(trim(p_email)) LIMIT 1;
$$;

-- ── 6. Cron diário para expirar trials (requer pg_cron — disponível no Supabase Pro) ─
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove agendamento anterior se existir (idempotente)
    PERFORM cron.unschedule('expire-trials')
    FROM cron.job WHERE jobname = 'expire-trials';

    PERFORM cron.schedule(
      'expire-trials',
      '0 2 * * *',   -- 02:00 UTC todos os dias
      'SELECT public.expire_trials()'
    );

    RAISE NOTICE 'Cron "expire-trials" agendado para 02:00 UTC diariamente.';
  ELSE
    RAISE NOTICE 'pg_cron não disponível. Configure manualmente: Database → Scheduled Tasks → expire_trials diário.';
  END IF;
END $$;
