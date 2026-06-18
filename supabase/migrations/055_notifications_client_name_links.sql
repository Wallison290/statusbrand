-- ── 055_notifications_client_name_links.sql ──────────────────────────────────
-- Adiciona nome do cliente nas mensagens de aprovação e link nas notificações
-- de formulário semanal.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. notify_approval_result — inclui nome do cliente na mensagem ────────────
CREATE OR REPLACE FUNCTION public.notify_approval_result()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_notif_type  text;
  v_notif_title text;
  v_message     text;
  v_client_name text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
  IF OLD.approval_status IS NOT DISTINCT FROM NEW.approval_status THEN RETURN NEW; END IF;
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.reviewed_by IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = NEW.reviewed_by AND role = 'client'
    ) THEN
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Busca nome do cliente
  IF NEW.client_id IS NOT NULL THEN
    SELECT company_name INTO v_client_name
    FROM clients
    WHERE id = NEW.client_id;
  END IF;

  CASE NEW.approval_status
    WHEN 'aprovado' THEN
      v_notif_type  := 'APPROVED';
      v_notif_title := 'Conteúdo aprovado pelo cliente ✅';
      v_message     := CASE WHEN v_client_name IS NOT NULL
                          THEN '[' || v_client_name || '] "' || COALESCE(NEW.title, 'Sem título') || '" foi aprovado.'
                          ELSE '"' || COALESCE(NEW.title, 'Sem título') || '" foi aprovado.'
                        END;
    WHEN 'reprovado' THEN
      v_notif_type  := 'REJECTED';
      v_notif_title := 'Conteúdo reprovado pelo cliente ❌';
      v_message     := CASE WHEN v_client_name IS NOT NULL
                          THEN '[' || v_client_name || '] "' || COALESCE(NEW.title, 'Sem título') || '" foi reprovado. Verifique o feedback.'
                          ELSE '"' || COALESCE(NEW.title, 'Sem título') || '" foi reprovado. Verifique o feedback.'
                        END;
    WHEN 'ajuste_solicitado' THEN
      v_notif_type  := 'COMMENT';
      v_notif_title := 'Ajuste solicitado pelo cliente ✏️';
      v_message     := CASE WHEN v_client_name IS NOT NULL
                          THEN '[' || v_client_name || '] O cliente pediu ajuste em "' || COALESCE(NEW.title, 'Sem título') || '".'
                          ELSE 'O cliente pediu ajuste em "' || COALESCE(NEW.title, 'Sem título') || '".'
                        END;
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

-- ── 2. notify_weekly_form_submitted — adiciona link para a aba de notas ───────
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
    '/notas',
    false
  );

  RETURN NEW;
END;
$$;
