-- ── 031_team_members.sql ──────────────────────────────────────────────────────
-- Área de Equipe: membros, delegação de tarefas e portal do colaborador

-- ── 1. Tabela team_members ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_members (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  role          TEXT,
  whatsapp      TEXT,
  email         TEXT,
  color         TEXT        NOT NULL DEFAULT '#7c3aed',
  avatar_url    TEXT,
  portal_token  TEXT        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Campos extras na tabela tasks ─────────────────────────────────────────
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assignee_id       UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS collaborator_note TEXT,
  ADD COLUMN IF NOT EXISTS delivery_url      TEXT;

-- ── 3. RLS team_members ───────────────────────────────────────────────────────
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_own"             ON public.team_members;
DROP POLICY IF EXISTS "team_members_public_by_token" ON public.team_members;

-- Dono gerencia tudo
CREATE POLICY "team_members_own"
  ON public.team_members FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Qualquer um pode ler pelo token (portal do colaborador usa edge function)
CREATE POLICY "team_members_public_by_token"
  ON public.team_members FOR SELECT
  USING (true);

-- ── 4. Novo tipo de notificação ───────────────────────────────────────────────
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'NEW_CONTENT',
    'APPROVAL_REQUEST',
    'APPROVED',
    'REJECTED',
    'COMMENT',
    'ADJUSTMENT_DONE',
    'TASK_STATUS_UPDATE'
  ));

-- ── 5. Índices ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_team_members_user
  ON public.team_members (user_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tasks_assignee
  ON public.tasks (assignee_id) WHERE assignee_id IS NOT NULL;

-- ── 6. Trigger updated_at ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_team_members_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_team_members_updated_at ON public.team_members;
CREATE TRIGGER trg_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.set_team_members_updated_at();
