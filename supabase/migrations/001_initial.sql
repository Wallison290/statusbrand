-- =============================================
-- AgênciaForge — Schema Inicial do Banco de Dados
-- Execute no SQL Editor do Supabase
-- =============================================

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  agency_name TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Auto-criar profile quando usuário se registra
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- CLIENTS
-- =============================================
CREATE TABLE IF NOT EXISTS clients (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name        TEXT NOT NULL,
  responsible_name    TEXT NOT NULL,
  niche               TEXT NOT NULL,
  instagram           TEXT,
  whatsapp            TEXT,
  email               TEXT,
  website             TEXT,
  main_objective      TEXT,
  target_audience     TEXT,
  tone_of_voice       TEXT,
  communication_style TEXT,
  differentials       TEXT,
  services_offered    TEXT,
  forbidden_words     TEXT,
  observations        TEXT,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused')),
  entry_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- BRAND DNA
-- =============================================
CREATE TABLE IF NOT EXISTS brand_dna (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id            UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  how_brand_speaks     TEXT,
  how_brand_not_speaks TEXT,
  positioning          TEXT,
  ideal_language       TEXT,
  mental_triggers      TEXT,
  communication_style  TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(client_id)
);

-- =============================================
-- CONTENTS
-- =============================================
CREATE TABLE IF NOT EXISTS contents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
  term              TEXT NOT NULL,
  objective         TEXT NOT NULL,
  content_type      TEXT NOT NULL,
  tone_of_voice     TEXT NOT NULL,
  caption_size      TEXT NOT NULL DEFAULT 'medio',
  include_emojis    BOOLEAN DEFAULT TRUE,
  include_hashtags  BOOLEAN DEFAULT TRUE,
  additional_notes  TEXT,
  title             TEXT,
  subtitle          TEXT,
  caption           TEXT,
  cta               TEXT,
  hashtags          TEXT,
  keywords          TEXT,
  visual_suggestion TEXT,
  carousel_ideas    TEXT,
  video_script      TEXT,
  status            TEXT NOT NULL DEFAULT 'gerado' CHECK (status IN ('gerado','editado','aprovado','publicado','arquivado')),
  version           INTEGER DEFAULT 1,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- PLANNER
-- =============================================
CREATE TABLE IF NOT EXISTS planner (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id      UUID REFERENCES clients(id) ON DELETE SET NULL,
  content_id     UUID REFERENCES contents(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  content_type   TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  status         TEXT NOT NULL DEFAULT 'ideia' CHECK (status IN ('ideia','producao','revisao','aprovado','publicado')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- TASKS
-- =============================================
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  due_date    DATE,
  priority    TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa','media','alta','urgente')),
  status      TEXT NOT NULL DEFAULT 'a_fazer' CHECK (status IN ('a_fazer','em_andamento','revisao','concluido')),
  assignee    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- LIBRARY
-- =============================================
CREATE TABLE IF NOT EXISTS library (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category   TEXT NOT NULL CHECK (category IN ('ideia','gancho','cta','template')),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  niche      TEXT,
  tags       TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- INDEXES para performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_contents_user_id ON contents(user_id);
CREATE INDEX IF NOT EXISTS idx_contents_client_id ON contents(client_id);
CREATE INDEX IF NOT EXISTS idx_contents_created_at ON contents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_planner_user_id ON planner(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_scheduled_date ON planner(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_library_user_id ON library(user_id);
CREATE INDEX IF NOT EXISTS idx_library_category ON library(category);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_dna  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE library    ENABLE ROW LEVEL SECURITY;

-- Policies: cada usuário só acessa seus próprios dados
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "clients_own" ON clients FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "brand_dna_own" ON brand_dna FOR ALL
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "contents_own" ON contents FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "planner_own" ON planner FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "tasks_own" ON tasks FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "library_own" ON library FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- FUNÇÃO: updated_at automático
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_profiles   BEFORE UPDATE ON profiles   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_clients    BEFORE UPDATE ON clients    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_brand_dna  BEFORE UPDATE ON brand_dna  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_contents   BEFORE UPDATE ON contents   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_planner    BEFORE UPDATE ON planner    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_tasks      BEFORE UPDATE ON tasks      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_library    BEFORE UPDATE ON library    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
