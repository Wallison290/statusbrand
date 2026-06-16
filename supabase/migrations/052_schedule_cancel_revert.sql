-- ── 052_schedule_cancel_revert.sql ───────────────────────────────────────────
-- Corrige o ciclo de agendamento do Instagram:
--   1. Vincula scheduled_posts ao item do planner (planner_id).
--   2. Ao CANCELAR um post agendado, reverte o item do planner (ig_scheduled=false,
--      status='aprovado') para que o modal volte a oferecer data/hora p/ reagendar.
--   3. Backfill: destrava itens que ficaram presos em "Aprovado e agendado" mas
--      cujos posts já foram todos cancelados.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Vínculo planner_id ─────────────────────────────────────────────────────
ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS planner_id uuid REFERENCES public.planner(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_planner ON public.scheduled_posts (planner_id);

-- ── 2. Auto-agendamento agora grava o planner_id ──────────────────────────────
-- (mesma lógica da 043, apenas incluindo planner_id na inserção)
CREATE OR REPLACE FUNCTION public.auto_schedule_instagram_post()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_should_schedule boolean := false;
  v_ig_account_id   uuid;
  v_media_urls      text[];
  v_scheduled_at    timestamptz;
BEGIN
  IF TG_OP != 'UPDATE' THEN RETURN NEW; END IF;

  IF NEW.ig_scheduled IS TRUE OR NEW.ig_post_type IS NULL OR NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.art_approval_status IS NOT NULL OR NEW.copy_approval_status IS NOT NULL THEN
    IF NEW.art_approval_status  = 'aprovado'
    AND NEW.copy_approval_status = 'aprovado'
    AND (
      OLD.art_approval_status  IS DISTINCT FROM 'aprovado'
      OR OLD.copy_approval_status IS DISTINCT FROM 'aprovado'
    ) THEN
      v_should_schedule := true;
    END IF;
  ELSE
    IF NEW.approval_status = 'aprovado'
       AND (OLD.approval_status IS DISTINCT FROM 'aprovado') THEN
      v_should_schedule := true;
    END IF;
  END IF;

  IF NOT v_should_schedule THEN RETURN NEW; END IF;

  SELECT id INTO v_ig_account_id
  FROM instagram_accounts
  WHERE user_id = NEW.user_id AND client_id = NEW.client_id AND is_active = true
  LIMIT 1;

  IF v_ig_account_id IS NULL THEN RETURN NEW; END IF;

  SELECT ARRAY_AGG(file_url ORDER BY sort_order)
  INTO v_media_urls
  FROM planner_attachments
  WHERE planner_id = NEW.id AND is_ig_media = true;

  IF v_media_urls IS NULL OR array_length(v_media_urls, 1) = 0 THEN
    SELECT ARRAY_AGG(file_url)
    INTO v_media_urls
    FROM planner_attachments
    WHERE planner_id = NEW.id
      AND (file_type LIKE 'image/%' OR file_type LIKE 'video/%');
  END IF;

  IF v_media_urls IS NULL OR array_length(v_media_urls, 1) = 0 THEN
    RETURN NEW;
  END IF;

  v_scheduled_at := (
    (NEW.scheduled_date::date + COALESCE(NEW.scheduled_time::time, '09:00'::time))
    AT TIME ZONE 'America/Sao_Paulo'
  );

  INSERT INTO scheduled_posts (
    user_id, ig_account_id, client_id, planner_id,
    post_type, caption, media_urls, scheduled_at, status
  ) VALUES (
    NEW.user_id, v_ig_account_id, NEW.client_id, NEW.id,
    NEW.ig_post_type, COALESCE(NEW.notes, ''), v_media_urls, v_scheduled_at, 'scheduled'
  );

  NEW.ig_scheduled := true;
  NEW.status       := 'publicado';

  RETURN NEW;
END;
$$;

-- ── 3. Reverte o planner quando o post agendado é cancelado ────────────────────
CREATE OR REPLACE FUNCTION public.revert_planner_on_schedule_cancel()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled'
     AND OLD.status IS DISTINCT FROM 'cancelled'
     AND NEW.planner_id IS NOT NULL
  THEN
    UPDATE public.planner
       SET ig_scheduled = false,
           status = CASE WHEN status = 'publicado' THEN 'aprovado' ELSE status END,
           updated_at = now()
     WHERE id = NEW.planner_id
       AND ig_scheduled IS TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_revert_planner_on_cancel ON public.scheduled_posts;
CREATE TRIGGER trigger_revert_planner_on_cancel
  AFTER UPDATE OF status ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.revert_planner_on_schedule_cancel();

-- ── 4. Backfill: destrava itens presos sem nenhum post ativo ──────────────────
-- (caso "todos os agendamentos do cliente foram cancelados")
UPDATE public.planner p
   SET ig_scheduled = false,
       status = CASE WHEN p.status = 'publicado' THEN 'aprovado' ELSE p.status END,
       updated_at = now()
 WHERE p.ig_scheduled IS TRUE
   AND p.approval_status = 'aprovado'
   AND NOT EXISTS (
     SELECT 1 FROM public.scheduled_posts s
     WHERE s.client_id = p.client_id
       AND s.status IN ('scheduled', 'publishing', 'published')
   );
