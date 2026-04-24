-- Adiciona campo de link externo opcional ao content_assets
ALTER TABLE content_assets
  ADD COLUMN IF NOT EXISTS link_url TEXT;
