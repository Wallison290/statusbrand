-- =============================================
-- 030 — Cria trial apenas para usuários com role='agency'
-- Bug: handle_new_subscription criava registro de assinatura
--      para todos os perfis, incluindo clientes convidados (role='client').
--      Resultado: banco com dados desnecessários e trials fantasmas.
-- Fix: verifica role antes de inserir.
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Só cria trial para usuários da agência
  IF NEW.role != 'agency' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.subscriptions (user_id, plan, status, trial_ends_at)
  VALUES (NEW.id, 'starter', 'trialing', now() + interval '3 days')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Remove assinaturas criadas incorretamente para não-agências
DELETE FROM public.subscriptions
WHERE user_id IN (SELECT id FROM profiles WHERE role != 'agency');
