-- Allow content_assets to exist without a linked client (library-only items)
ALTER TABLE content_assets
  ALTER COLUMN client_id DROP NOT NULL;

-- Add category field for better organisation
ALTER TABLE content_assets
  ADD COLUMN IF NOT EXISTS category text;
