-- =============================================
-- AgênciaForge — Aprovação de Conteúdo pelo Cliente
-- Execute no SQL Editor do Supabase
-- =============================================

-- Adiciona campos de aprovação na tabela planner
ALTER TABLE planner ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pendente_aprovacao';
ALTER TABLE planner ADD COLUMN IF NOT EXISTS client_feedback TEXT;
ALTER TABLE planner ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE planner ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- =============================================
-- RLS: permite que o cliente atualize apenas
-- os campos de aprovação nos próprios itens
-- =============================================
CREATE POLICY "planner_portal_approve" ON planner
  FOR UPDATE
  USING (
    client_id = (
      SELECT linked_client_id FROM profiles
      WHERE id = auth.uid() AND role = 'client'
    )
  )
  WITH CHECK (
    client_id = (
      SELECT linked_client_id FROM profiles
      WHERE id = auth.uid() AND role = 'client'
    )
  );
