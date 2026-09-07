-- ── Pedidos de exclusão de dados vindos da Meta ──────────────────────────────
-- A Meta exige um Data Deletion Request Callback que responda com um
-- confirmation_code rastreável, e uma URL onde o usuário consulte o pedido.
-- Sem persistir o código, "acompanhe pelo código" seria uma promessa vazia.
--
-- Também registra as desautorizações (quando o usuário remove o app no
-- Instagram): é o log que explica por que uma conta apareceu desconectada.

CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_code text NOT NULL UNIQUE,
  ig_user_id        text NOT NULL,
  kind              text NOT NULL DEFAULT 'delete'
                    CHECK (kind IN ('delete', 'deauthorize')),
  status            text NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('received', 'completed', 'failed')),
  accounts_affected integer NOT NULL DEFAULT 0,
  error_message     text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS data_deletion_requests_ig_user_id_idx
  ON public.data_deletion_requests (ig_user_id);

-- RLS ligada e sem policy: a tabela é acessível apenas pelo service role, que
-- é quem as Edge Functions usam. Nenhum usuário final lê pedidos de outro.
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;
