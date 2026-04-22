-- =============================================
-- AgênciaForge — Anexos e Links do Planejamento
-- Execute no SQL Editor do Supabase APÓS a migration 001
-- =============================================

-- =============================================
-- PLANNER ATTACHMENTS
-- =============================================
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

-- =============================================
-- PLANNER LINKS
-- =============================================
CREATE TABLE IF NOT EXISTS planner_links (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  planner_id  UUID NOT NULL REFERENCES planner(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  label       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_planner_attachments_planner_id ON planner_attachments(planner_id);
CREATE INDEX IF NOT EXISTS idx_planner_attachments_user_id    ON planner_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_links_planner_id       ON planner_links(planner_id);
CREATE INDEX IF NOT EXISTS idx_planner_links_user_id          ON planner_links(user_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE planner_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_links       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments_own" ON planner_attachments
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "links_own" ON planner_links
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- SUPABASE STORAGE — Bucket planner-attachments
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'planner-attachments',
  'planner-attachments',
  true,
  52428800, -- 50 MB
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

-- Política de upload: usuário só sobe para seu próprio prefixo (user_id/)
CREATE POLICY "storage_upload_own" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'planner-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Leitura pública (bucket é público)
CREATE POLICY "storage_read_public" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'planner-attachments');

-- Deleção: apenas o dono
CREATE POLICY "storage_delete_own" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'planner-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
