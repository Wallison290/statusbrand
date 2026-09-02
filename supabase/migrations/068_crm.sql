-- ── 068: CRM (funil comercial) ───────────────────────────────────────────────
-- Kanban de leads da agência: colunas personalizáveis pelo usuário e cards que
-- se movem entre elas mudando o status.
--
-- Por que tabelas próprias e não `clients.status`:
-- `clients` já tem status ('lead', 'proposta', 'fechado'...), mas quem entra lá
-- vira cliente de verdade — aparece na carteira, no financeiro, nos relatórios e
-- conta contra o limite de clientes do plano. Prospect não é cliente. O CRM vive
-- separado e só cruza a ponte quando o lead fecha, via `converted_client_id`.

-- ── crm_columns ───────────────────────────────────────────────────────────────
-- As etapas do funil. `stage_type` distingue as colunas terminais das demais:
--   normal  → etapa do meio do funil
--   ganho   → fechou; é onde aparece o botão "converter em cliente"
--   perdido → não fechou; sai da base de cálculo do funil ativo

CREATE TABLE IF NOT EXISTS crm_columns (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  color       text        NOT NULL DEFAULT '#2563EB',
  position    integer     NOT NULL DEFAULT 0,
  stage_type  text        NOT NULL DEFAULT 'normal'
                          CHECK (stage_type IN ('normal', 'ganho', 'perdido')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_columns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency manages own crm columns" ON crm_columns;
CREATE POLICY "Agency manages own crm columns"
  ON crm_columns FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS crm_columns_user_position_idx
  ON crm_columns (user_id, position);

-- ── crm_leads ─────────────────────────────────────────────────────────────────
-- Os cards. `ON DELETE CASCADE` no column_id é intencional: a tela sempre
-- pergunta para onde mover os cards antes de excluir uma coluna, então chegar
-- aqui com cards dentro significa que o usuário escolheu descartá-los.

CREATE TABLE IF NOT EXISTS crm_leads (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  column_id           uuid        NOT NULL REFERENCES crm_columns(id) ON DELETE CASCADE,
  position            integer     NOT NULL DEFAULT 0,

  name                text        NOT NULL,
  company             text,
  whatsapp            text,
  email               text,
  instagram           text,

  source              text,                       -- origem: indicação, Instagram, prospecção...
  estimated_value     numeric(12,2),
  temperature         text        DEFAULT 'morno'
                                  CHECK (temperature IN ('frio', 'morno', 'quente')),
  responsible_user_id uuid        REFERENCES team_members(id) ON DELETE SET NULL,
  next_contact_at     date,
  notes               text,                       -- observações livres sobre o lead

  converted_client_id uuid        REFERENCES clients(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency manages own crm leads" ON crm_leads;
CREATE POLICY "Agency manages own crm leads"
  ON crm_leads FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS crm_leads_user_idx
  ON crm_leads (user_id);
CREATE INDEX IF NOT EXISTS crm_leads_column_position_idx
  ON crm_leads (column_id, position);

-- ── updated_at automático ─────────────────────────────────────────────────────
-- Função própria do CRM em vez de reaproveitar uma existente: um CREATE OR
-- REPLACE numa função compartilhada reescreveria o corpo usado por outras
-- tabelas, e nenhuma migration nova deveria poder fazer isso.

CREATE OR REPLACE FUNCTION crm_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_columns_set_updated_at ON crm_columns;
CREATE TRIGGER crm_columns_set_updated_at
  BEFORE UPDATE ON crm_columns
  FOR EACH ROW EXECUTE FUNCTION crm_set_updated_at();

DROP TRIGGER IF EXISTS crm_leads_set_updated_at ON crm_leads;
CREATE TRIGGER crm_leads_set_updated_at
  BEFORE UPDATE ON crm_leads
  FOR EACH ROW EXECUTE FUNCTION crm_set_updated_at();
