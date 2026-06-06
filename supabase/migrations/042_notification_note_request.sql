-- ── 042_notification_note_request.sql ────────────────────────────────────────
-- Adiciona o tipo de notificação NOTE_REQUEST, usado quando o CLIENTE envia
-- uma solicitação/ideia na aba "Solicitações e Ideias" do portal.
-- A notificação é criada pelo app (useCreatePortalNote) e roteada para a
-- agência dona do cliente.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'NEW_CONTENT',
    'APPROVAL_REQUEST',
    'APPROVED',
    'REJECTED',
    'COMMENT',
    'ADJUSTMENT_DONE',
    'TASK_STATUS_UPDATE',
    'TASK_DONE',
    'FORM_SUBMITTED',
    'POST_PUBLISHED',
    'POST_FAILED',
    'NOTE_REQUEST'
  ));
