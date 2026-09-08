-- ── 072_no_auto_schedule_stories.sql ─────────────────────────────────────────
-- Stories nunca entram no agendamento automático do Instagram.
--
-- Problema que isto resolve: "Tipo" (planner.content_type) e "Publicação no
-- Instagram" (planner.ig_post_type) são campos independentes no modal do
-- planejamento. Nada impede marcar Tipo = Story e ainda escolher Imagem no
-- bloco do Instagram para anexar a mídia. Quando o cliente aprovava, o trigger
-- não olhava o Tipo: via ig_post_type preenchido e criava um scheduled_post,
-- que o cron publicaria no FEED — não como story. A plataforma não faz
-- agendamento de stories, então esse caminho só podia dar publicação errada.
--
-- A exceção vale exclusivamente para Stories. Post, carrossel e reels seguem
-- agendando na aprovação, sem mudança nenhuma.
--
-- O restante do corpo da função é idêntico ao que está em produção hoje, que já
-- acumula as correções das migrations 042 (fuso America/Sao_Paulo), 043
-- (status := 'publicado') e 053 (planner_id em scheduled_posts). Esta migration
-- só acrescenta a guarda de story — nada mais foi alterado.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.auto_schedule_instagram_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_should_schedule boolean := false;
  v_ig_account_id   uuid;
  v_media_urls      text[];
  v_scheduled_at    timestamptz;
BEGIN
  IF TG_OP != 'UPDATE' THEN RETURN NEW; END IF;

  -- ── Exceção: Stories ───────────────────────────────────────────────────────
  -- Sai antes de qualquer outra checagem: mesmo aprovado pelo cliente, mesmo
  -- com ig_post_type e mídia preenchidos, um story não vira scheduled_post.
  -- A comparação é tolerante porque content_type é text livre, sem constraint —
  -- 'Story' ou 'stories' vindos de outro fluxo cairiam na mesma regra.
  IF lower(trim(coalesce(NEW.content_type, ''))) IN ('story', 'stories') THEN
    RETURN NEW;
  END IF;

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
$function$;

COMMENT ON FUNCTION public.auto_schedule_instagram_post() IS
  'Agenda no Instagram quando o cliente aprova. Stories (content_type story/stories) são excluídos: a plataforma não faz agendamento de stories.';
