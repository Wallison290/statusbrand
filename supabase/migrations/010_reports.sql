-- Relatórios mensais de performance
CREATE TABLE client_reports (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id         uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL REFERENCES auth.users(id),
  month             int         NOT NULL CHECK (month BETWEEN 1 AND 12),
  year              int         NOT NULL CHECK (year >= 2020),
  -- Métricas sociais
  followers_start   int,
  followers_end     int,
  reach             int,
  engagement        numeric(5,2),
  impressions       int,
  posts_published   int,
  -- Tráfego pago
  paid_investment   numeric(10,2),
  paid_leads        int,
  paid_cpl          numeric(10,2),
  paid_conversions  int,
  paid_roas         numeric(6,2),
  -- Análise
  analysis_text     text,
  created_at        timestamptz DEFAULT now() NOT NULL,
  updated_at        timestamptz DEFAULT now() NOT NULL,
  UNIQUE(client_id, month, year)
);

ALTER TABLE client_reports ENABLE ROW LEVEL SECURITY;

-- Agência: acesso total nos relatórios dos seus clientes
CREATE POLICY "agency_all_reports" ON client_reports FOR ALL
  USING  (EXISTS (SELECT 1 FROM clients c WHERE c.id = client_reports.client_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clients c WHERE c.id = client_reports.client_id AND c.user_id = auth.uid()));

-- Portal: cliente lê seus próprios relatórios
CREATE POLICY "portal_read_reports" ON client_reports FOR SELECT
  USING (client_id = public.get_my_linked_client_id());

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON client_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Anexos dos relatórios
CREATE TABLE report_attachments (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id   uuid        NOT NULL REFERENCES client_reports(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id),
  type        text        NOT NULL CHECK (type IN ('imagem', 'pdf', 'link')),
  title       text        NOT NULL,
  description text,
  file_url    text,
  link_url    text,
  file_size   int,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE report_attachments ENABLE ROW LEVEL SECURITY;

-- Agência: acesso total nos anexos dos seus clientes
CREATE POLICY "agency_all_report_attachments" ON report_attachments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM client_reports r
      JOIN clients c ON c.id = r.client_id
      WHERE r.id = report_attachments.report_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_reports r
      JOIN clients c ON c.id = r.client_id
      WHERE r.id = report_attachments.report_id AND c.user_id = auth.uid()
    )
  );

-- Portal: cliente lê anexos dos seus relatórios
CREATE POLICY "portal_read_report_attachments" ON report_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_reports r
      WHERE r.id = report_attachments.report_id
        AND r.client_id = public.get_my_linked_client_id()
    )
  );

-- Storage bucket para anexos de relatórios
INSERT INTO storage.buckets (id, name, public) VALUES ('report-attachments', 'report-attachments', true);

CREATE POLICY "agency_upload_report_attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'report-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "public_read_report_attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'report-attachments');

CREATE POLICY "agency_delete_report_attachments" ON storage.objects
  FOR DELETE USING (bucket_id = 'report-attachments' AND auth.uid() = owner);
