-- ── 051_notify_client_report.sql ─────────────────────────────────────────────
-- Notifica o CLIENTE quando a agência gera um relatório (a primeira vez que o
-- relatório do mês passa a ter conteúdo). Dispara uma única notificação por
-- relatório, controlada por client_notified_at.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Novo tipo NEW_REPORT no CHECK
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'NEW_CONTENT', 'APPROVAL_REQUEST', 'APPROVED', 'REJECTED', 'COMMENT',
    'ADJUSTMENT_DONE', 'TASK_STATUS_UPDATE', 'TASK_DONE', 'FORM_SUBMITTED',
    'POST_PUBLISHED', 'POST_FAILED', 'NOTE_REQUEST', 'NEW_REPORT'
  ));

-- 2. Controle de "já notifiquei este relatório"
ALTER TABLE public.client_reports
  ADD COLUMN IF NOT EXISTS client_notified_at timestamptz;

-- 3. Trigger BEFORE INSERT/UPDATE: notifica o cliente quando o relatório ganha
--    conteúdo pela primeira vez.
CREATE OR REPLACE FUNCTION public.notify_client_new_report()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_client_user uuid;
  v_has_data    boolean;
  v_month_name  text;
BEGIN
  v_has_data :=
       NEW.reach           IS NOT NULL
    OR NEW.analysis_text   IS NOT NULL
    OR NEW.ig_synced_at    IS NOT NULL
    OR NEW.posts_published IS NOT NULL
    OR NEW.followers_end   IS NOT NULL;

  IF NEW.client_notified_at IS NULL AND v_has_data THEN
    SELECT id INTO v_client_user
    FROM profiles
    WHERE linked_client_id = NEW.client_id AND role = 'client'
    LIMIT 1;

    IF v_client_user IS NOT NULL THEN
      v_month_name := (ARRAY['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                             'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'])[NEW.month];

      INSERT INTO notifications (user_id, client_id, type, title, message, link, is_read)
      VALUES (
        v_client_user,
        NEW.client_id,
        'NEW_REPORT',
        'Novo relatório disponível 📊',
        'O relatório de ' || COALESCE(v_month_name, '') || ' ' || NEW.year || ' já está no seu portal.',
        NULL,
        false
      );

      NEW.client_notified_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_client_new_report ON public.client_reports;
CREATE TRIGGER trigger_notify_client_new_report
  BEFORE INSERT OR UPDATE ON public.client_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_client_new_report();
