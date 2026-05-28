-- =============================================
-- AgênciaForge — Corrige trigger de notificação do planner
-- Notifica o cliente SOMENTE quando sent_to_client = TRUE
-- Execute no SQL Editor do Supabase
-- =============================================

-- Substitui a função com a verificação de sent_to_client
CREATE OR REPLACE FUNCTION public.notify_agency_planner_change()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_client_user_id uuid;
  v_notif_type     text;
  v_notif_title    text;
BEGIN
  -- Só processa itens com cliente associado
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- *** Só notifica se o item foi enviado ao cliente ***
  IF NEW.sent_to_client IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Itens postados não precisam de notificação de aprovação
  IF NEW.status = 'postado' THEN
    RETURN NEW;
  END IF;

  -- Tipo de operação
  IF TG_OP = 'INSERT' THEN
    v_notif_type  := 'NEW_CONTENT';
    v_notif_title := 'Novo conteúdo adicionado ao seu planejamento';

  ELSIF TG_OP = 'UPDATE' THEN
    -- Caso especial: o item acabou de ser "enviado ao cliente" (mudou de false/null para true)
    IF (OLD.sent_to_client IS NOT TRUE) AND (NEW.sent_to_client = TRUE) THEN
      v_notif_type  := 'NEW_CONTENT';
      v_notif_title := 'Novo conteúdo adicionado ao seu planejamento';

    -- Ignora quando APENAS approval_status mudou (ação do cliente)
    ELSIF OLD.approval_status IS DISTINCT FROM NEW.approval_status
       AND NEW.approval_status IN ('aprovado', 'reprovado', 'ajuste_solicitado')
       AND OLD.title IS NOT DISTINCT FROM NEW.title
       AND OLD.content_type IS NOT DISTINCT FROM NEW.content_type
       AND OLD.status IS NOT DISTINCT FROM NEW.status
       AND OLD.notes IS NOT DISTINCT FROM NEW.notes
       AND OLD.scheduled_date IS NOT DISTINCT FROM NEW.scheduled_date THEN
      RETURN NEW;

    ELSE
      v_notif_type  := 'APPROVAL_REQUEST';
      v_notif_title := 'Conteúdo atualizado no seu planejamento';
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Busca o user_id do cliente via profiles
  SELECT id INTO v_client_user_id
  FROM profiles
  WHERE linked_client_id = NEW.client_id AND role = 'client'
  LIMIT 1;

  IF v_client_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, client_id, type, title, message, link)
    VALUES (
      v_client_user_id,
      NEW.client_id,
      v_notif_type,
      v_notif_title,
      COALESCE(NEW.title, 'Sem título'),
      NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;
