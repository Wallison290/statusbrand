-- ============================================================
-- FIX: Garante existência das tabelas planner_attachments e
--      planner_links com as FKs necessárias para o PostgREST
--      resolver o join alias no usePlanner() SELECT.
--
-- Execute no SQL Editor do Supabase (pode rodar mais de uma vez)
-- ============================================================

-- Extensão necessária para uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PLANNER ATTACHMENTS ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS planner_attachments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  planner_id  UUID NOT NULL REFERENCES planner(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_type   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_size   BIGINT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─── PLANNER LINKS ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS planner_links (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  planner_id  UUID NOT NULL REFERENCES planner(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  label       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─── INDEXES ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_planner_attachments_planner_id ON planner_attachments(planner_id);
CREATE INDEX IF NOT EXISTS idx_planner_attachments_user_id    ON planner_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_links_planner_id       ON planner_links(planner_id);
CREATE INDEX IF NOT EXISTS idx_planner_links_user_id          ON planner_links(user_id);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────

ALTER TABLE planner_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_links       ENABLE ROW LEVEL SECURITY;

-- Políticas para planner_attachments
DO $$
BEGIN
  CREATE POLICY "attachments_own" ON planner_attachments
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Política de leitura para portal (cliente lê anexos dos seus planner items)
DO $$
BEGIN
  CREATE POLICY "attachments_portal_read" ON planner_attachments
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM planner p
        WHERE p.id = planner_attachments.planner_id
          AND p.client_id = (
            SELECT linked_client_id FROM profiles WHERE id = auth.uid() LIMIT 1
          )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para planner_links
DO $$
BEGIN
  CREATE POLICY "links_own" ON planner_links
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "links_portal_read" ON planner_links
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM planner p
        WHERE p.id = planner_links.planner_id
          AND p.client_id = (
            SELECT linked_client_id FROM profiles WHERE id = auth.uid() LIMIT 1
          )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── STORAGE BUCKET ──────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'planner-attachments',
  'planner-attachments',
  true,
  52428800,
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
    'video/mp4','video/quicktime','video/webm',
    'audio/mpeg','audio/mp4','audio/wav','audio/ogg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain','text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage (idempotentes via ON CONFLICT)
DO $$
BEGIN
  CREATE POLICY "storage_upload_own" ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'planner-attachments'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "storage_read_public" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'planner-attachments');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "storage_delete_own" ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'planner-attachments'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── FORÇAR RELOAD DO SCHEMA CACHE DO POSTGREST ──────────────
-- Notifica o PostgREST para atualizar o schema cache imediatamente
NOTIFY pgrst, 'reload schema';
