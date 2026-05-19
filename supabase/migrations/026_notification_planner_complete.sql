-- ── 026_notification_planner_complete.sql ─────────────────────────────────────
-- Substitui o trigger notify_approval_request por uma versão abrangente que:
--   • Notifica o cliente em QUALQUER inserção ou edição de item do planejamento
--   • Tipo NEW_CONTENT para criação, APPROVAL_REQUEST para atualização
--   • Não dispara quando o próprio cliente altera approval_status
--   • Coexiste com notify_adjustment_done, notify_approval_result e notify_new_comment

-- Remove o trigger e função antigos
DROP TRIGGER IF EXISTS trigger_notify_approval_request ON public.planner;
DROP FUNCTION IF EXISTS public.notify_approval_request();

-- Nova função abrangente: agência cria/edita item → notifica cliente
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

  -- Itens postados não precisam de notificação de aprovação
  IF NEW.status = 'postado' THEN
    RETURN NEW;
  END IF;

  -- Tipo de operação
  IF TG_OP = 'INSERT' THEN
    v_notif_type  := 'NEW_CONTENT';
    v_notif_title := 'Novo conteúdo adicionado ao seu planejamento';

  ELSIF TG_OP = 'UPDATE' THEN
    -- Ignora quando APENAS approval_status mudou para ação do cliente
    -- (aprovado/reprovado/ajuste_solicitado são tratados pelo notify_approval_result)
    IF OLD.approval_status IS DISTINCT FROM NEW.approval_status
       AND NEW.approval_status IN ('aprovado', 'reprovado', 'ajuste_solicitado')
       AND OLD.title IS NOT DISTINCT FROM NEW.title
       AND OLD.content_type IS NOT DISTINCT FROM NEW.content_type
       AND OLD.status IS NOT DISTINCT FROM NEW.status
       AND OLD.notes IS NOT DISTINCT FROM NEW.notes
       AND OLD.scheduled_date IS NOT DISTINCT FROM NEW.scheduled_date THEN
      RETURN NEW;
    END IF;

    v_notif_type  := 'APPROVAL_REQUEST';
    v_notif_title := 'Conteúdo atualizado no seu planejamento';
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

CREATE TRIGGER trigger_notify_agency_planner_change
  AFTER INSERT OR UPDATE ON public.planner
  FOR EACH ROW EXECUTE FUNCTION public.notify_agency_planner_change();
