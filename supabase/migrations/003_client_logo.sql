-- =============================================
-- AgênciaForge — Logo do Cliente
-- Execute no SQL Editor do Supabase
-- =============================================

-- Adiciona coluna logo_url na tabela clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- =============================================
-- STORAGE — Bucket client-logos
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-logos',
  'client-logos',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg','image/png','image/gif','image/webp','image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Upload: usuário só sobe para seu próprio prefixo
CREATE POLICY "logos_upload_own" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'client-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Leitura pública
CREATE POLICY "logos_read_public" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'client-logos');

-- Substituição: mesmo usuário pode fazer upsert
CREATE POLICY "logos_update_own" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'client-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Deleção: apenas o dono
CREATE POLICY "logos_delete_own" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'client-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
