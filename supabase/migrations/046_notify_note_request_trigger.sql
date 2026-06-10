-- ── 046_notify_note_request_trigger.sql ─────────────────────────────────────
-- Notifica a AGÊNCIA quando o CLIENTE envia uma solicitação/ideia pelo portal
-- (nota com origin='client' e type='solicitacao' na tabela `notes`).
--
-- Antes, a notificação era inserida pelo frontend (useCreatePortalNote), mas a
-- RLS bloqueava: o cliente não pode inserir notificação com user_id da agência.
-- Agora um trigger SECURITY DEFINER cria a notificação, contornando a RLS com
-- segurança (mesmo padrão de notify_weekly_form_submitted).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Garante o tipo NOTE_REQUEST no CHECK (idempotente — caso a 042 não tenha rodado)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'NEW_CONTENT', 'APPROVAL_REQUEST', 'APPROVED', 'REJECTED', 'COMMENT',
    'ADJUSTMENT_DONE', 'TASK_STATUS_UPDATE', 'TASK_DONE', 'FORM_SUBMITTED',
    'POST_PUBLISHED', 'POST_FAILED', 'NOTE_REQUEST'
  ));

-- 2. Função do trigger
CREATE OR REPLACE FUNCTION public.notify_note_request()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_agency_user_id uuid;
  v_client_name    text;
BEGIN
  -- Só processa solicitação/ideia enviada pelo cliente
  IF NEW.origin IS DISTINCT FROM 'client' OR NEW.type IS DISTINCT FROM 'solicitacao' THEN
    RETURN NEW;
  END IF;
  IF NEW.client_id IS NULL THEN RETURN NEW; END IF;

  SELECT user_id, company_name INTO v_agency_user_id, v_client_name
  FROM clients WHERE id = NEW.client_id;

  IF v_agency_user_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO notifications (user_id, client_id, type, title, message, link, is_read)
  VALUES (
    v_agency_user_id,
    NEW.client_id,
    'NOTE_REQUEST',
    'Nova solicitação/ideia 💡',
    COALESCE(v_client_name, 'O cliente') || ' enviou: ' || COALESCE(NULLIF(NEW.title, ''), 'Sem título'),
    '/notes',
    false
  );

  RETURN NEW;
END;
$$;

-- 3. Trigger
DROP TRIGGER IF EXISTS trigger_notify_note_request ON public.notes;
CREATE TRIGGER trigger_notify_note_request
  AFTER INSERT ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.notify_note_request();
