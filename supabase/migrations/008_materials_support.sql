-- ─── Bucket: client-materials ────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-materials', 'client-materials', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "materials_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "materials_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-materials');

CREATE POLICY "materials_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ─── Tabela: client_materials ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_materials (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT,
  type        TEXT        NOT NULL DEFAULT 'documento'
              CHECK (type IN ('pdf','imagem','video','link','documento','outro')),
  file_url    TEXT,
  link_url    TEXT,
  file_size   BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE client_materials ENABLE ROW LEVEL SECURITY;

-- Agência: CRUD completo nos materiais dos seus clientes
CREATE POLICY "materials_agency_all" ON client_materials
  FOR ALL USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- Portal do cliente: leitura
CREATE POLICY "materials_portal_read" ON client_materials
  FOR SELECT USING (
    client_id IN (
      SELECT linked_client_id FROM profiles
      WHERE id = auth.uid() AND linked_client_id IS NOT NULL
    )
  );

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION update_client_materials_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_client_materials_updated_at
  BEFORE UPDATE ON client_materials
  FOR EACH ROW EXECUTE FUNCTION update_client_materials_updated_at();

-- ─── Tabela: client_support_contacts ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_support_contacts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id     UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  role          TEXT,
  contact_type  TEXT        NOT NULL DEFAULT 'whatsapp'
                CHECK (contact_type IN ('whatsapp','email','telefone','outro')),
  contact_value TEXT        NOT NULL,
  direct_link   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE client_support_contacts ENABLE ROW LEVEL SECURITY;

-- Agência: CRUD completo
CREATE POLICY "support_agency_all" ON client_support_contacts
  FOR ALL USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- Portal do cliente: leitura
CREATE POLICY "support_portal_read" ON client_support_contacts
  FOR SELECT USING (
    client_id IN (
      SELECT linked_client_id FROM profiles
      WHERE id = auth.uid() AND linked_client_id IS NOT NULL
    )
  );
