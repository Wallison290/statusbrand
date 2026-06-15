-- ── 049_reports_auto.sql ──────────────────────────────────────────────────────
-- Relatório automático do Instagram: marca os relatórios preenchidos via API de
-- Insights e registra quando foi a última sincronização. As métricas continuam
-- nas colunas que já existem em client_reports (followers_*, reach, engagement,
-- impressions, posts_published) — nada de schema novo para os dados.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.client_reports
  ADD COLUMN IF NOT EXISTS auto_generated boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ig_synced_at   timestamptz;
