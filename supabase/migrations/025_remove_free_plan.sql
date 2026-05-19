-- ── Remove plano free — acesso somente pagando ───────────────────────────────

-- Atualiza constraint de planos (starter | pro | agency)
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('starter', 'pro', 'agency'));

-- Migra qualquer registro 'free' existente para 'starter'
UPDATE public.subscriptions SET plan = 'starter' WHERE plan = 'free';

-- Novos usuários entram com status 'inactive' até pagar
-- (o trigger handle_new_subscription já cria a linha — apenas atualizamos o default)
ALTER TABLE public.subscriptions
  ALTER COLUMN status SET DEFAULT 'inactive';

-- Atualiza trigger para criar assinatura inativa por padrão
CREATE OR REPLACE FUNCTION public.handle_new_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'starter', 'inactive')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ⚠️  Usuários já existentes ficam como 'active' no starter
-- (para não bloquear quem já usava o sistema)
-- Ajuste manualmente se quiser exigir pagamento retroativo.
UPDATE public.subscriptions
SET plan = 'starter', status = 'active'
WHERE status = 'active' AND plan NOT IN ('starter', 'pro', 'agency');
