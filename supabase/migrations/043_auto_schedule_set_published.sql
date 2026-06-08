-- =============================================
-- KairoHub — Auto-agendamento também marca o planner como "publicado"
-- Quando o cliente aprova e o post é agendado automaticamente no Instagram,
-- o status do item no planner deve subir de "aprovado" para "publicado".
-- (A aprovação em si já eleva o status para "aprovado" no app; este trigger
-- eleva para "publicado" na mesma transação quando há agendamento.)
-- Execute no SQL Editor do Supabase.
-- =============================================

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
  -- Só processa UPDATEs
  IF TG_OP != 'UPDATE' THEN RETURN NEW; END IF;

  -- Pula se já agendado, sem tipo IG ou sem cliente
  IF NEW.ig_scheduled IS TRUE OR NEW.ig_post_type IS NULL OR NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- ── Decide se deve agendar ──────────────────────────────────────────────────

  -- Fluxo com aprovação parcial (Arte + Copy)
  -- Só dispara quando AMBOS mudam para aprovado (transição real, não re-save)
  IF NEW.art_approval_status IS NOT NULL OR NEW.copy_approval_status IS NOT NULL THEN
    IF NEW.art_approval_status  = 'aprovado'
    AND NEW.copy_approval_status = 'aprovado'
    AND (
      OLD.art_approval_status  IS DISTINCT FROM 'aprovado'
      OR OLD.copy_approval_status IS DISTINCT FROM 'aprovado'
    ) THEN
      v_should_schedule := true;
    END IF;

  -- Fluxo legado ou "Aprovar tudo" (só approval_status geral)
  ELSE
    IF NEW.approval_status = 'aprovado'
       AND (OLD.approval_status IS DISTINCT FROM 'aprovado') THEN
      v_should_schedule := true;
    END IF;
  END IF;

  IF NOT v_should_schedule THEN RETURN NEW; END IF;

  -- ── Busca conta Instagram ativa do cliente ──────────────────────────────────
  SELECT id INTO v_ig_account_id
  FROM instagram_accounts
  WHERE user_id   = NEW.user_id
    AND client_id = NEW.client_id
    AND is_active = true
  LIMIT 1;

  IF v_ig_account_id IS NULL THEN RETURN NEW; END IF;

  -- ── Busca mídias: prefere is_ig_media=true, fallback imagens/vídeos ─────────
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

  -- Sem mídia = não agenda
  IF v_media_urls IS NULL OR array_length(v_media_urls, 1) = 0 THEN
    RETURN NEW;
  END IF;

  -- ── Calcula data/hora do agendamento ────────────────────────────────────────
  v_scheduled_at := (
    (NEW.scheduled_date::date
     + COALESCE(NEW.scheduled_time::time, '09:00'::time))
    AT TIME ZONE 'America/Sao_Paulo'
  );

  -- ── Insere em scheduled_posts ───────────────────────────────────────────────
  INSERT INTO scheduled_posts (
    user_id, ig_account_id, client_id,
    post_type, caption, media_urls, scheduled_at, status
  ) VALUES (
    NEW.user_id,
    v_ig_account_id,
    NEW.client_id,
    NEW.ig_post_type,
    COALESCE(NEW.notes, ''),
    v_media_urls,
    v_scheduled_at,
    'scheduled'
  );

  -- ── Marca o item do planner como agendado e PUBLICADO ───────────────────────
  -- (BEFORE trigger: modifica NEW diretamente, sem UPDATE extra)
  NEW.ig_scheduled := true;
  NEW.status       := 'publicado';

  RETURN NEW;
END;
$$;

-- Remove e recria o trigger
DROP TRIGGER IF EXISTS trigger_auto_schedule_instagram ON public.planner;

CREATE TRIGGER trigger_auto_schedule_instagram
  BEFORE UPDATE ON public.planner
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_schedule_instagram_post();

-- ── Backfill: corrige itens existentes que ficaram com status defasado ──────────
-- Já aprovados E agendados no Instagram → publicado
UPDATE public.planner
   SET status = 'publicado'
 WHERE ig_scheduled IS TRUE
   AND approval_status = 'aprovado'
   AND status IS DISTINCT FROM 'publicado';

-- Aprovados pelo cliente mas ainda não agendados → aprovado
UPDATE public.planner
   SET status = 'aprovado'
 WHERE approval_status = 'aprovado'
   AND (ig_scheduled IS NOT TRUE)
   AND status IN ('ideia', 'producao', 'revisao');
