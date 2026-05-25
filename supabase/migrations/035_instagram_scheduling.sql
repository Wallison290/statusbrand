-- ── Agendamento de posts no Instagram ────────────────────────────────────────

-- Contas Instagram conectadas por usuário
CREATE TABLE IF NOT EXISTS instagram_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  ig_user_id          text NOT NULL,
  username            text NOT NULL,
  name                text,
  profile_picture_url text,
  followers_count     integer DEFAULT 0,
  access_token        text NOT NULL,
  token_expires_at    timestamptz,
  is_active           boolean DEFAULT true,
  connected_at        timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE(user_id, ig_user_id)
);

ALTER TABLE instagram_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ig_accounts_owner" ON instagram_accounts
  FOR ALL USING (user_id = auth.uid());

-- Posts agendados
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  ig_account_id   uuid NOT NULL REFERENCES instagram_accounts ON DELETE CASCADE,
  client_id       uuid REFERENCES clients ON DELETE SET NULL,
  post_type       text NOT NULL CHECK (post_type IN ('IMAGE', 'CAROUSEL_ALBUM', 'REELS')),
  caption         text,
  media_urls      text[] NOT NULL DEFAULT '{}',
  scheduled_at    timestamptz NOT NULL,
  status          text NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  ig_post_id      text,
  error_message   text,
  published_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduled_posts_owner" ON scheduled_posts
  FOR ALL USING (user_id = auth.uid());

-- Bucket de mídia para posts (imagens e vídeos)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('post-media', 'post-media', true, 209715200)  -- 200 MB
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "post_media_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "post_media_auth_insert"  ON storage.objects;
DROP POLICY IF EXISTS "post_media_auth_delete"  ON storage.objects;

CREATE POLICY "post_media_public_read"  ON storage.objects
  FOR SELECT USING (bucket_id = 'post-media');

CREATE POLICY "post_media_auth_insert"  ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'post-media' AND auth.role() = 'authenticated');

CREATE POLICY "post_media_auth_delete"  ON storage.objects
  FOR DELETE USING (bucket_id = 'post-media' AND auth.role() = 'authenticated');
