ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notify_client_whatsapp boolean NOT NULL DEFAULT false;
