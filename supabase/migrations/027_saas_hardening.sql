-- ── 027_saas_hardening.sql ────────────────────────────────────────────────────
-- Conjunto de melhorias para produção SaaS:
--   1. Trial de 3 dias (trial_ends_at + canceled_at na tabela subscriptions)
--   2. Limite de clientes por plano enforced no banco (trigger)
--   3. Policy storage content-assets restrita por user_id

-- ── 1. Campos de trial e cancelamento ────────────────────────────────────────

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at  timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_at    timestamptz;

-- Índice para o cron job de expiração de trial
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial
  ON public.subscriptions (status, trial_ends_at)
  WHERE status = 'trialing';

-- Atualiza trigger de novo usuário: cria com status=trialing + 3 dias de trial
CREATE OR REPLACE FUNCTION public.handle_new_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, trial_ends_at)
  VALUES (NEW.id, 'starter', 'trialing', now() + interval '3 days')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── 2. Limite de clientes por plano enforced no banco ─────────────────────────

CREATE OR REPLACE FUNCTION public.check_client_plan_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_plan  text;
  v_count integer;
  v_limit integer;
BEGIN
  -- Busca o plano ativo do usuário
  SELECT plan INTO v_plan
  FROM public.subscriptions
  WHERE user_id = NEW.user_id;

  -- Limite por plano (agency = ilimitado)
  v_limit := CASE v_plan
    WHEN 'starter' THEN 5
    WHEN 'pro'     THEN 20
    ELSE 999999
  END;

  -- Conta clientes ativos (exclui inativos/cancelados)
  SELECT COUNT(*) INTO v_count
  FROM public.clients
  WHERE user_id = NEW.user_id
    AND status NOT IN ('inactive', 'cancelado');

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Limite de clientes do plano % atingido (máx. %). Faça upgrade para adicionar mais.',
      COALESCE(v_plan, 'starter'), v_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_client_plan_limit ON public.clients;
CREATE TRIGGER enforce_client_plan_limit
  BEFORE INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.check_client_plan_limit();

-- ── 3. Corrigir policy do bucket content-assets (restringir por user_id) ─────

DROP POLICY IF EXISTS "content_assets_upload" ON storage.objects;

CREATE POLICY "content_assets_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'content-assets'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 4. Função auxiliar para expirar trials (rodar via cron job diário) ────────
-- Pode ser chamada manualmente: SELECT expire_trials();
-- Ou configurar um Supabase Scheduled Job diário.

CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.subscriptions
  SET status = 'inactive', updated_at = now()
  WHERE status = 'trialing'
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
