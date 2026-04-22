-- ─────────────────────────────────────────────────────────────────────────────
-- 007_onboarding.sql  — Módulo de Onboarding de Clientes
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Migrar status antigos para os novos valores ────────────────────────────
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;

UPDATE clients SET status = 'ativo'     WHERE status = 'active';
UPDATE clients SET status = 'pausado'   WHERE status = 'paused';
UPDATE clients SET status = 'encerrado' WHERE status = 'inactive';

ALTER TABLE clients ADD CONSTRAINT clients_status_check
  CHECK (status IN ('lead','proposta','fechado','onboarding','ativo','pausado','encerrado'));

-- ── 2. Responsável interno ────────────────────────────────────────────────────
ALTER TABLE clients ADD COLUMN IF NOT EXISTS
  responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 3. Permitir que usuários agency vejam outros agency (para dropdown) ────────
DROP POLICY IF EXISTS "agency_profiles_read" ON profiles;
CREATE POLICY "agency_profiles_read" ON profiles
  FOR SELECT USING (role = 'agency');

-- ── 4. Checklist ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_checklist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  completed   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE client_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checklist_own" ON client_checklist;
CREATE POLICY "checklist_own" ON client_checklist
  FOR ALL USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- ── 5. Documentos: bucket + tabela ───────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "client_docs_upload" ON storage.objects;
CREATE POLICY "client_docs_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'client-documents' AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "client_docs_read" ON storage.objects;
CREATE POLICY "client_docs_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'client-documents');

DROP POLICY IF EXISTS "client_docs_delete" ON storage.objects;
CREATE POLICY "client_docs_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'client-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE TABLE IF NOT EXISTS client_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_type   TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size   BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_own" ON client_documents;
CREATE POLICY "documents_own" ON client_documents
  FOR ALL USING (user_id = auth.uid());

-- ── 6. Briefing ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_briefing (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE client_briefing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "briefing_own" ON client_briefing;
CREATE POLICY "briefing_own" ON client_briefing
  FOR ALL USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION update_client_briefing_ts()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_client_briefing_ts ON client_briefing;
CREATE TRIGGER set_client_briefing_ts
  BEFORE UPDATE ON client_briefing
  FOR EACH ROW EXECUTE FUNCTION update_client_briefing_ts();
