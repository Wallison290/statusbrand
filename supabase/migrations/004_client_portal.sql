-- =============================================
-- AgênciaForge — Portal do Cliente
-- Execute no SQL Editor do Supabase
-- =============================================

-- Adiciona role e linked_client_id na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'agency';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linked_client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- =============================================
-- RLS: clients — cliente portal pode ler o próprio registro
-- =============================================
CREATE POLICY "clients_portal_read" ON clients
  FOR SELECT
  USING (
    id = (
      SELECT linked_client_id FROM profiles
      WHERE id = auth.uid() AND role = 'client'
    )
  );

-- =============================================
-- RLS: brand_dna — cliente portal pode ler o próprio DNA
-- =============================================
CREATE POLICY "brand_dna_portal_read" ON brand_dna
  FOR SELECT
  USING (
    client_id = (
      SELECT linked_client_id FROM profiles
      WHERE id = auth.uid() AND role = 'client'
    )
  );

-- =============================================
-- RLS: planner — cliente portal pode ler seus planejamentos
-- =============================================
CREATE POLICY "planner_portal_read" ON planner
  FOR SELECT
  USING (
    client_id = (
      SELECT linked_client_id FROM profiles
      WHERE id = auth.uid() AND role = 'client'
    )
  );

-- =============================================
-- RLS: planner_attachments — cliente portal pode ler seus anexos
-- =============================================
CREATE POLICY "planner_attachments_portal_read" ON planner_attachments
  FOR SELECT
  USING (
    planner_id IN (
      SELECT id FROM planner
      WHERE client_id = (
        SELECT linked_client_id FROM profiles
        WHERE id = auth.uid() AND role = 'client'
      )
    )
  );

-- =============================================
-- RLS: planner_links — cliente portal pode ler seus links
-- =============================================
CREATE POLICY "planner_links_portal_read" ON planner_links
  FOR SELECT
  USING (
    planner_id IN (
      SELECT id FROM planner
      WHERE client_id = (
        SELECT linked_client_id FROM profiles
        WHERE id = auth.uid() AND role = 'client'
      )
    )
  );

-- =============================================
-- RLS: contents — cliente portal pode ler seus conteúdos
-- =============================================
CREATE POLICY "contents_portal_read" ON contents
  FOR SELECT
  USING (
    client_id = (
      SELECT linked_client_id FROM profiles
      WHERE id = auth.uid() AND role = 'client'
    )
  );
