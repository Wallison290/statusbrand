-- Cores da marca por cliente — usadas na Criação de Imagens da StatusIA
-- para manter identidade visual consistente nas artes geradas por IA

ALTER TABLE clients ADD COLUMN IF NOT EXISTS brand_color_primary TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS brand_color_secondary TEXT;
