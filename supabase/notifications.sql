-- ─────────────────────────────────────────────────────────────────────────────
-- AgênciaForge — Sistema de Notificações
-- Execute este script no SQL Editor do Supabase
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Tabela principal ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id  uuid        REFERENCES public.clients(id) ON DELETE CASCADE,
  type       text        NOT NULL
               CHECK (type IN ('NEW_CONTENT','APPROVAL_REQUEST','APPROVED','REJECTED','COMMENT','ADJUSTMENT_DONE')),
  title      text        NOT NULL,
  message    text        NOT NULL,
  link       text,                          -- planner item id (UUID como texto)
  is_read    boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications (user_id)
  WHERE is_read = false;

-- ── 2. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Cada usuário vê apenas suas próprias notificações
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Usuário pode marcar as próprias como lidas
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 3. Trigger: conteúdo enviado para revisão → notifica cliente ──────────────

CREATE OR REPLACE FUNCTION public.notify_approval_request()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_client_user_id uuid;
BEGIN
  -- Dispara quando status muda PARA 'revisao'
  IF NEW.status = 'revisao'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'revisao')
  THEN
    SELECT id INTO v_client_user_id
    FROM profiles
    WHERE linked_client_id = NEW.client_id
      AND role = 'client'
    LIMIT 1;

    IF v_client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, client_id, type, title, message, link)
      VALUES (
        v_client_user_id,
        NEW.client_id,
        'APPROVAL_REQUEST',
        'Conteúdo aguardando sua aprovação',
        COALESCE(NEW.title, 'Um novo conteúdo foi enviado para sua aprovação'),
        NEW.id::text
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_approval_request ON public.planner;
CREATE TRIGGER trigger_notify_approval_request
  AFTER INSERT OR UPDATE OF status ON public.planner
  FOR EACH ROW EXECUTE FUNCTION public.notify_approval_request();

-- ── 4. Trigger: agência marca ajuste como realizado → notifica cliente ───────

CREATE OR REPLACE FUNCTION public.notify_adjustment_done()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_client_user_id uuid;
BEGIN
  IF OLD.approval_status IS DISTINCT FROM NEW.approval_status
     AND NEW.approval_status = 'ajuste_realizado'
  THEN
    SELECT id INTO v_client_user_id
    FROM profiles
    WHERE linked_client_id = NEW.client_id
      AND role = 'client'
    LIMIT 1;

    IF v_client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, client_id, type, title, message, link)
      VALUES (
        v_client_user_id,
        NEW.client_id,
        'ADJUSTMENT_DONE',
        'Ajuste realizado',
        'O conteúdo "' || COALESCE(NEW.title, 'sem título') || '" foi ajustado e está pronto para nova revisão.',
        NEW.id::text
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_adjustment_done ON public.planner;
CREATE TRIGGER trigger_notify_adjustment_done
  AFTER UPDATE OF approval_status ON public.planner
  FOR EACH ROW EXECUTE FUNCTION public.notify_adjustment_done();

-- ── 5. Trigger: cliente aprova/reprova → notifica agência ─────────────────────

CREATE OR REPLACE FUNCTION public.notify_approval_result()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_agency_user_id uuid;
  v_type           text;
  v_title          text;
  v_message        text;
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
     AND NEW.approval_status IN ('aprovado', 'reprovado', 'ajuste_solicitado')
  THEN
    SELECT user_id INTO v_agency_user_id
    FROM clients
    WHERE id = NEW.client_id
    LIMIT 1;

    IF NEW.approval_status = 'aprovado' THEN
      v_type    := 'APPROVED';
      v_title   := 'Conteúdo aprovado pelo cliente';
      v_message := COALESCE(NEW.title, 'Um conteúdo foi aprovado pelo cliente');
    ELSIF NEW.approval_status = 'ajuste_solicitado' THEN
      v_type    := 'REJECTED';
      v_title   := 'Ajuste solicitado pelo cliente';
      v_message := COALESCE(NEW.title, 'O cliente solicitou ajustes no conteúdo');
    ELSE
      v_type    := 'REJECTED';
      v_title   := 'Conteúdo reprovado pelo cliente';
      v_message := COALESCE(NEW.title, 'Um conteúdo foi reprovado pelo cliente');
    END IF;

    IF v_agency_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, client_id, type, title, message, link)
      VALUES (v_agency_user_id, NEW.client_id, v_type, v_title, v_message, NEW.id::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_approval_result ON public.planner;
CREATE TRIGGER trigger_notify_approval_result
  AFTER UPDATE OF approval_status ON public.planner
  FOR EACH ROW EXECUTE FUNCTION public.notify_approval_result();

-- ── 5. Trigger: novo comentário → notifica a outra parte ──────────────────────

CREATE OR REPLACE FUNCTION public.notify_new_comment()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_recipient_id uuid;
  v_client_id    uuid;
  v_item_title   text;
  v_notif_title  text;
  v_preview      text;
BEGIN
  SELECT client_id, title
    INTO v_client_id, v_item_title
    FROM planner
   WHERE id = NEW.planner_id;

  IF NEW.role = 'agency' THEN
    v_notif_title := 'Comentário da agência';
    SELECT id INTO v_recipient_id
    FROM profiles
    WHERE linked_client_id = v_client_id AND role = 'client'
    LIMIT 1;
  ELSE
    v_notif_title := 'Comentário do cliente';
    SELECT user_id INTO v_recipient_id
    FROM clients
    WHERE id = v_client_id
    LIMIT 1;
  END IF;

  -- Monta preview: "Título do post: mensagem..."
  v_preview := LEFT(
    COALESCE(v_item_title || ': ', '') || NEW.message,
    120
  );

  IF v_recipient_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, client_id, type, title, message, link)
    VALUES (v_recipient_id, v_client_id, 'COMMENT', v_notif_title, v_preview, NEW.planner_id::text);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_comment ON public.planner_comments;
CREATE TRIGGER trigger_notify_new_comment
  AFTER INSERT ON public.planner_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_comment();
