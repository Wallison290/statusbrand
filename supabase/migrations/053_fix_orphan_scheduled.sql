-- ── 053_fix_orphan_scheduled.sql ─────────────────────────────────────────────
-- Conserta itens do planner que ficaram presos em "Aprovado e agendado" sem
-- nenhum post agendado ativo — tipicamente porque a conta de Instagram foi
-- desconectada (delete → CASCADE apaga os scheduled_posts) ou os posts foram
-- removidos antes de existir o vínculo planner_id.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Backfill do vínculo planner_id nos posts antigos, via mídia compartilhada
--    com planner_attachments (auto-agendamento usa o file_url do anexo).
UPDATE public.scheduled_posts s
SET planner_id = pa.planner_id
FROM public.planner_attachments pa
WHERE s.planner_id IS NULL
  AND pa.file_url = ANY(s.media_urls);

-- 2. Trigger: ao DELETAR um post agendado (ex.: cascata ao desconectar a conta),
--    reverte o item do planner se não sobrar nenhum post ativo dele.
CREATE OR REPLACE FUNCTION public.revert_planner_on_schedule_delete()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.planner_id IS NOT NULL THEN
    UPDATE public.planner p
       SET ig_scheduled = false,
           status = CASE WHEN p.status = 'publicado' THEN 'aprovado' ELSE p.status END,
           updated_at = now()
     WHERE p.id = OLD.planner_id
       AND p.ig_scheduled IS TRUE
       AND NOT EXISTS (
         SELECT 1 FROM public.scheduled_posts s
         WHERE s.planner_id = OLD.planner_id AND s.id <> OLD.id
           AND s.status IN ('scheduled', 'publishing', 'published')
       );
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_revert_planner_on_delete ON public.scheduled_posts;
CREATE TRIGGER trigger_revert_planner_on_delete
  AFTER DELETE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.revert_planner_on_schedule_delete();

-- 3. Limpeza dos itens já presos: destrava quem não tem post ativo LINKADO,
--    desde que o cliente também não tenha posts ativos SEM vínculo (evita
--    desmarcar por engano um item cujo post não pôde ser religado).
UPDATE public.planner p
   SET ig_scheduled = false,
       status = CASE WHEN p.status = 'publicado' THEN 'aprovado' ELSE p.status END,
       updated_at = now()
 WHERE p.ig_scheduled IS TRUE
   AND NOT EXISTS (
     SELECT 1 FROM public.scheduled_posts s
     WHERE s.planner_id = p.id AND s.status IN ('scheduled', 'publishing', 'published')
   )
   AND NOT EXISTS (
     SELECT 1 FROM public.scheduled_posts s2
     WHERE s2.client_id = p.client_id
       AND s2.planner_id IS NULL
       AND s2.status IN ('scheduled', 'publishing', 'published')
   );
