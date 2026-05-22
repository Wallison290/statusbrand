-- =============================================
-- 029 — Adiciona 'inactive' à constraint de status da tabela subscriptions
-- Bug: stripe-webhook usava status='inactive' em customer.subscription.deleted
--      e expire_trials() também — mas a constraint só permitia
--      active | trialing | past_due | canceled.
--      Resultado: cancelamentos não bloqueavam acesso (update silhava).
-- =============================================

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status = ANY (ARRAY[
    'active'::text,
    'trialing'::text,
    'past_due'::text,
    'canceled'::text,
    'inactive'::text
  ]));
