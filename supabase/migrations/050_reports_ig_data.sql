-- ── 050_reports_ig_data.sql ───────────────────────────────────────────────────
-- Guarda os dados RICOS de insights do Instagram no relatório (visitas ao perfil,
-- quebra de interações, top publicações do mês e demografia da audiência) num
-- único campo jsonb, sem precisar de uma coluna por métrica.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.client_reports
  ADD COLUMN IF NOT EXISTS ig_data jsonb;
