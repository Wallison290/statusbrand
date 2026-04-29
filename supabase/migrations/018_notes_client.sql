-- ─────────────────────────────────────────────────────────────────────────────
-- AgênciaForge — Evolução do módulo Notes (vinculação a clientes)
-- Execute este script no SQL Editor do Supabase
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Novas colunas ──────────────────────────────────────────────────────────

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS type     text NOT NULL DEFAULT 'interna'
    CHECK (type IN ('interna', 'ideia', 'solicitacao')),
  ADD COLUMN IF NOT EXISTS origin   text NOT NULL DEFAULT 'agency'
    CHECK (origin IN ('agency', 'client'));

CREATE INDEX IF NOT EXISTS idx_notes_client ON public.notes (client_id);

-- ── 2. Atualizar RLS ──────────────────────────────────────────────────────────

-- Remove políticas antigas
DROP POLICY IF EXISTS "notes_select_own"  ON public.notes;
DROP POLICY IF EXISTS "notes_insert_own"  ON public.notes;
DROP POLICY IF EXISTS "notes_update_own"  ON public.notes;
DROP POLICY IF EXISTS "notes_delete_own"  ON public.notes;

-- Agência: vê suas próprias notas + notas do cliente vinculadas a ela
CREATE POLICY "notes_select_agency"
  ON public.notes FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = notes.client_id
        AND c.user_id = auth.uid()
    )
  );

-- Cliente: vê apenas notas vinculadas ao seu client_id (exceto internas)
CREATE POLICY "notes_select_client"
  ON public.notes FOR SELECT
  USING (
    notes.type <> 'interna'
    AND notes.client_id = get_my_linked_client_id()
    AND get_my_linked_client_id() IS NOT NULL
  );

-- Inserção: qualquer usuário autenticado pode criar nota (user_id = próprio)
CREATE POLICY "notes_insert_own"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Atualização: dono ou agência dona do cliente
CREATE POLICY "notes_update_own"
  ON public.notes FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = notes.client_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = notes.client_id
        AND c.user_id = auth.uid()
    )
  );

-- Exclusão: apenas o dono
CREATE POLICY "notes_delete_own"
  ON public.notes FOR DELETE
  USING (auth.uid() = user_id);
