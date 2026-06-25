-- ── 057_notify_adjustment_done.sql ───────────────────────────────────────────
-- Cria notificação ADJUSTMENT_DONE para o cliente via trigger SECURITY DEFINER.
-- Antes era feito pelo frontend, mas a RLS bloqueava inserts com user_id ≠ auth.uid().
-- Dispara quando approval_status muda para 'ajuste_realizado' no planner.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_adjustment_done()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_client_user_id uuid;
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
  IF NEW.approval_status IS NOT DISTINCT FROM OLD.approval_status THEN RETURN NEW; END IF;
  IF NEW.approval_status <> 'ajuste_realizado' THEN RETURN NEW; END IF;
  IF NEW.client_id IS NULL THEN RETURN NEW; END IF;

  SELECT id INTO v_client_user_id
  FROM profiles
  WHERE linked_client_id = NEW.client_id AND role = 'client'
  LIMIT 1;

  IF v_client_user_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO notifications (user_id, client_id, type, title, message, link, is_read)
  VALUES (
    v_client_user_id,
    NEW.client_id,
    'ADJUSTMENT_DONE',
    'Ajuste realizado pela agência',
    'A agência corrigiu o conteúdo e está aguardando sua aprovação.',
    NEW.id::text,
    false
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_adjustment_done ON public.planner;

CREATE TRIGGER trigger_notify_adjustment_done
  AFTER UPDATE ON public.planner
  FOR EACH ROW EXECUTE FUNCTION public.notify_adjustment_done();
