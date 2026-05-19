-- ── Controle de uso da IA por usuário ────────────────────────────────────────
-- Registra requests mensais para limitar abuso e custos

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month       text        NOT NULL,  -- formato: 'YYYY-MM'
  requests    integer     NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Usuário pode apenas ler seu próprio uso (update feito via service role na Edge Function)
CREATE POLICY "ai_usage_read_own"
  ON public.ai_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS ai_usage_user_month_idx
  ON public.ai_usage(user_id, month);
