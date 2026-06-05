-- ── 041_notifications_complete.sql ───────────────────────────────────────────
-- Adiciona todos os tipos de notificação faltantes e cria os triggers
-- correspondentes no banco de dados.
--
-- Novos tipos: FORM_SUBMITTED, TASK_DONE, POST_PUBLISHED, POST_FAILED
-- Novos triggers:
--   • notify_approval_result  → cliente aprova/reprova/pede ajuste → notifica agência
--   • notify_weekly_form_submitted → formulário semanal enviado → notifica agência
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Estende o CHECK constraint de tipos ────────────────────────────────────
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'NEW_CONTENT',
    'APPROVAL_REQUEST',
    'APPROVED',
    'REJECTED',
    'COMMENT',
    'ADJUSTMENT_DONE',
    'TASK_STATUS_UPDATE',
    'TASK_DONE',
    'FORM_SUBMITTED',
    'POST_PUBLISHED',
    'POST_FAILED'
  ));

-- ── 2. notify_approval_result ─────────────────────────────────────────────────
-- Quando o CLIENTE aprova, reprova ou pede ajuste no portal,
-- notifica o usuário da agência dono do planner item.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_approval_result()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_notif_type  text;
  v_notif_title text;
  v_message     text;
BEGIN
  -- Só processa UPDATEs onde approval_status mudou
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
  IF OLD.approval_status IS NOT DISTINCT FROM NEW.approval_status THEN RETURN NEW; END IF;
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  -- Só notifica se quem fez a mudança é um cliente do portal
  IF NEW.reviewed_by IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = NEW.reviewed_by AND role = 'client'
    ) THEN
      RETURN NEW;
    END IF;
  ELSE
    -- Se reviewed_by é null, ignora (não sabemos quem alterou)
    RETURN NEW;
  END IF;

  CASE NEW.approval_status
    WHEN 'aprovado' THEN
      v_notif_type  := 'APPROVED';
      v_notif_title := 'Conteúdo aprovado pelo cliente ✅';
      v_message     := '"' || COALESCE(NEW.title, 'Sem título') || '" foi aprovado.';
    WHEN 'reprovado' THEN
      v_notif_type  := 'REJECTED';
      v_notif_title := 'Conteúdo reprovado pelo cliente ❌';
      v_message     := '"' || COALESCE(NEW.title, 'Sem título') || '" foi reprovado. Verifique o feedback.';
    WHEN 'ajuste_solicitado' THEN
      v_notif_type  := 'COMMENT';
      v_notif_title := 'Ajuste solicitado pelo cliente ✏️';
      v_message     := 'O cliente pediu ajuste em "' || COALESCE(NEW.title, 'Sem título') || '".';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO notifications (user_id, client_id, type, title, message, link, is_read)
  VALUES (
    NEW.user_id,
    NEW.client_id,
    v_notif_type,
    v_notif_title,
    v_message,
    NEW.id::text,
    false
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_approval_result ON public.planner;

CREATE TRIGGER trigger_notify_approval_result
  AFTER UPDATE ON public.planner
  FOR EACH ROW EXECUTE FUNCTION public.notify_approval_result();

-- ── 3. notify_weekly_form_submitted ──────────────────────────────────────────
-- Quando o formulário semanal é preenchido (inclusive por anônimos),
-- notifica a agência responsável pela config do formulário.
-- Usa SECURITY DEFINER para contornar RLS do usuário anônimo.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_weekly_form_submitted()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_agency_user_id uuid;
  v_client_name    text;
BEGIN
  SELECT user_id INTO v_agency_user_id
  FROM weekly_form_configs
  WHERE id = NEW.config_id;

  IF v_agency_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT company_name INTO v_client_name
  FROM clients
  WHERE id = NEW.client_id;

  INSERT INTO notifications (user_id, client_id, type, title, message, link, is_read)
  VALUES (
    v_agency_user_id,
    NEW.client_id,
    'FORM_SUBMITTED',
    'Formulário semanal respondido 📋',
    COALESCE(NEW.respondent_name, 'Alguém') || ' de ' || COALESCE(v_client_name, 'cliente') || ' respondeu o formulário da semana.',
    NULL,
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_weekly_form_submitted ON public.weekly_form_responses;

CREATE TRIGGER trigger_notify_weekly_form_submitted
  AFTER INSERT ON public.weekly_form_responses
  FOR EACH ROW EXECUTE FUNCTION public.notify_weekly_form_submitted();
