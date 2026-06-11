-- ── 047_whatsapp_notifications.sql ───────────────────────────────────────────
-- Fan-out das notificações da AGÊNCIA para o WhatsApp via Evolution API.
--
-- Princípio: TODAS as notificações terminam num INSERT em public.notifications
-- (algumas via trigger SQL, outras via código/edge). Por isso o gancho fica no
-- INSERT da tabela, não nos triggers individuais. Esta migration só prepara o
-- estado (colunas, log e verificação); o disparo do webhook fica na 048.
--
-- Fase 1: somente a agência (role = 'agency') recebe. Clientes ficam de fora.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Campos de WhatsApp no perfil da agência ───────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp           text,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_verified  boolean NOT NULL DEFAULT false,
  -- Preferências por CATEGORIA (espelham as abas do NotificationsModal).
  -- Default: tudo ligado; a agência desliga o que não quiser.
  ADD COLUMN IF NOT EXISTS whatsapp_prefs     jsonb   NOT NULL DEFAULT
    '{"aprovacoes": true, "tarefas": true, "instagram": true, "solicitacoes": true}'::jsonb;

-- ── 2. Estado de verificação do número (código enviado pelo Evolution) ────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_verify_code     text,
  ADD COLUMN IF NOT EXISTS whatsapp_verify_expires  timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_verify_attempts int NOT NULL DEFAULT 0;

-- ── 3. Log de entregas (idempotência + auditoria + retry) ─────────────────────
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid        NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel         text        NOT NULL DEFAULT 'whatsapp',
  provider        text,                       -- 'evolution' | 'cloud_api'
  status          text        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','sent','failed','skipped')),
  to_number       text,
  provider_msg_id text,
  error           text,
  attempts        int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  -- Garante NO MÁXIMO um envio por notificação e canal (idempotência).
  UNIQUE (notification_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_deliveries_status
  ON public.notification_deliveries (status)
  WHERE status IN ('pending', 'failed');

-- Incrementa o contador de tentativas de forma atômica (usado pela edge function).
CREATE OR REPLACE FUNCTION public.increment_delivery_attempts(p_notification_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.notification_deliveries
     SET attempts = attempts + 1, updated_at = now()
   WHERE notification_id = p_notification_id AND channel = 'whatsapp';
$$;

-- RLS: a tabela é manipulada apenas pela service role (edge functions).
-- Nenhuma policy de SELECT para usuários comuns é necessária na Fase 1.
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

-- ── 4. Mapa tipo → categoria (usado pela edge function e por relatórios) ──────
-- Mantém em SQL a mesma lógica do front (CATEGORY_OF no NotificationsModal),
-- para que a checagem de preferência não dependa do cliente.
CREATE OR REPLACE FUNCTION public.notification_category(p_type text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_type
    WHEN 'APPROVED'           THEN 'aprovacoes'
    WHEN 'REJECTED'           THEN 'aprovacoes'
    WHEN 'COMMENT'            THEN 'aprovacoes'
    WHEN 'APPROVAL_REQUEST'   THEN 'aprovacoes'
    WHEN 'ADJUSTMENT_DONE'    THEN 'aprovacoes'
    WHEN 'NEW_CONTENT'        THEN 'conteudo'
    WHEN 'POST_PUBLISHED'     THEN 'instagram'
    WHEN 'POST_FAILED'        THEN 'instagram'
    WHEN 'TASK_DONE'          THEN 'tarefas'
    WHEN 'TASK_STATUS_UPDATE' THEN 'tarefas'
    WHEN 'FORM_SUBMITTED'     THEN 'solicitacoes'
    WHEN 'NOTE_REQUEST'       THEN 'solicitacoes'
    ELSE NULL
  END;
$$;
