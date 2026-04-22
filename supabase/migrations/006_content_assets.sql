-- ─────────────────────────────────────────────────────────────────────────────
-- 006_content_assets.sql  — Arsenal de Conteúdos Manual
-- ─────────────────────────────────────────────────────────────────────────────

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-assets', 'content-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "content_assets_upload" ON storage.objects;
CREATE POLICY "content_assets_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'content-assets' AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "content_assets_public_read" ON storage.objects;
CREATE POLICY "content_assets_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'content-assets');

DROP POLICY IF EXISTS "content_assets_owner_delete" ON storage.objects;
CREATE POLICY "content_assets_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'content-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Tabela principal
CREATE TABLE IF NOT EXISTS content_assets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id    UUID NOT NULL REFERENCES clients(id)   ON DELETE CASCADE,
  title        TEXT NOT NULL,
  caption      TEXT,
  content_type TEXT NOT NULL DEFAULT 'post',
  media_url    TEXT,
  observations TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE content_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assets_own" ON content_assets;
CREATE POLICY "assets_own" ON content_assets
  FOR ALL USING (user_id = auth.uid());

-- Portal: cliente pode ver seus próprios assets
DROP POLICY IF EXISTS "assets_portal_read" ON content_assets;
CREATE POLICY "assets_portal_read" ON content_assets
  FOR SELECT USING (
    client_id = (
      SELECT linked_client_id FROM profiles
      WHERE id = auth.uid() AND role = 'client'
    )
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_content_assets_ts()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_content_assets_ts ON content_assets;
CREATE TRIGGER set_content_assets_ts
  BEFORE UPDATE ON content_assets
  FOR EACH ROW EXECUTE FUNCTION update_content_assets_ts();

-- Adiciona asset_id ao planner (referência opcional ao arsenal)
ALTER TABLE planner ADD COLUMN IF NOT EXISTS
  asset_id UUID REFERENCES content_assets(id) ON DELETE SET NULL;
