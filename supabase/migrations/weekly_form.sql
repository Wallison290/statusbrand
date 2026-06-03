-- ── Formulário Semanal de Inteligência de Conteúdo ───────────────────────────

-- Tabela 1: Configuração por cliente
CREATE TABLE IF NOT EXISTS weekly_form_configs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week   smallint NOT NULL DEFAULT 1 CHECK (day_of_week BETWEEN 0 AND 6),
  is_active     boolean NOT NULL DEFAULT true,
  public_token  uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- Tabela 2: Respostas individuais
CREATE TABLE IF NOT EXISTS weekly_form_responses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id        uuid NOT NULL REFERENCES weekly_form_configs(id) ON DELETE CASCADE,
  client_id        uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  week_reference   date NOT NULL,             -- segunda-feira da semana
  respondent_name  text NOT NULL,
  respondent_role  text,
  q_doubts         text,
  q_objections     text,
  q_highlights     text,
  q_demands        text,
  q_cases          text,
  q_trends         text,
  q_faq            text,
  q_suggestions    text,
  q_important      text,
  is_internal      boolean NOT NULL DEFAULT false,
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_wfc_client_id ON weekly_form_configs(client_id);
CREATE INDEX IF NOT EXISTS idx_wfc_token     ON weekly_form_configs(public_token);
CREATE INDEX IF NOT EXISTS idx_wfr_client_id ON weekly_form_responses(client_id);
CREATE INDEX IF NOT EXISTS idx_wfr_config_id ON weekly_form_responses(config_id);
CREATE INDEX IF NOT EXISTS idx_wfr_week      ON weekly_form_responses(week_reference);

-- RLS
ALTER TABLE weekly_form_configs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_form_responses ENABLE ROW LEVEL SECURITY;

-- Policies: configs (somente o dono lê/escreve)
CREATE POLICY "owner_select_configs" ON weekly_form_configs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "owner_insert_configs" ON weekly_form_configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_update_configs" ON weekly_form_configs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "owner_delete_configs" ON weekly_form_configs
  FOR DELETE USING (auth.uid() = user_id);

-- Policies: responses
-- Dono lê todas as respostas dos seus clientes
CREATE POLICY "owner_select_responses" ON weekly_form_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM weekly_form_configs wfc
      WHERE wfc.id = weekly_form_responses.config_id
        AND wfc.user_id = auth.uid()
    )
  );

-- Qualquer um pode inserir resposta (link público — sem auth)
-- mas somente se o config estiver ativo e o token correto for usado
-- (validação feita no lado do app via fetchConfigByToken)
CREATE POLICY "public_insert_responses" ON weekly_form_responses
  FOR INSERT WITH CHECK (true);

-- Trigger para updated_at em configs
CREATE OR REPLACE FUNCTION update_weekly_form_config_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wfc_updated_at
  BEFORE UPDATE ON weekly_form_configs
  FOR EACH ROW EXECUTE FUNCTION update_weekly_form_config_updated_at();
