-- =============================================
-- StatusMedia — Correção CRÍTICA: service_role_key público + n8n exposto
--
-- 1. app_config
--    A migration 049_whatsapp_config.sql já tinha revogado acesso de
--    anon/authenticated ("REVOKE ALL ... FROM anon, authenticated") de
--    propósito, porque essa tabela guarda o service_role_key em texto puro
--    (usado só internamente por um trigger SECURITY DEFINER pra chamar a
--    edge function de notificação do WhatsApp). Em algum momento depois
--    esse acesso foi reaberto (provavelmente edição pela interface do
--    Supabase, que reconcede grants por padrão) — a auditoria encontrou
--    anon com SELECT/INSERT/UPDATE/DELETE liberado e RLS desligado. Ou
--    seja: QUALQUER PESSOA, sem login, conseguia ler a chave mestra do
--    banco (bypassa toda RLS, todo o resto das correções desta sessão).
--
--    AÇÃO MANUAL NECESSÁRIA (fora deste SQL): gire (regenere) o
--    service_role_key no Supabase Dashboard → Settings → API, e atualize
--    o valor em app_config e nas Edge Functions que o usam. A chave atual
--    deve ser considerada comprometida.
--
-- 2. n8n_chat_histories
--    Tabela usada só pelo n8n (fora deste app — sem nenhuma referência no
--    código-fonte). RLS estava desligado e anon/authenticated tinham CRUD
--    completo: qualquer pessoa sem login podia ler/editar/apagar o
--    histórico de conversas do n8n.
--
-- Execute no SQL Editor do Supabase.
-- =============================================

REVOKE ALL ON public.app_config FROM anon, authenticated;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- Sem policies de propósito: só o trigger SECURITY DEFINER (dono da tabela)
-- e o service_role continuam com acesso.

REVOKE ALL ON public.n8n_chat_histories FROM anon, authenticated;
ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;
-- Sem policies de propósito: se o n8n usa a chave de serviço (service_role)
-- ou conexão direta ao Postgres, continua funcionando normalmente — RLS só
-- afeta anon/authenticated (chamadas via PostgREST com a chave pública).
