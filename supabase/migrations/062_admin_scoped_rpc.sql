-- =============================================
-- StatusMedia — Corrige vazamento de dados entre agências no Admin
-- As policies profiles_admin_read_all / clients_admin_read_all /
-- subscriptions_admin_read_all (migration 061) davam ao admin acesso a TODAS
-- as linhas em QUALQUER consulta às tabelas — inclusive nas telas normais do
-- app (Clientes, Financeiro), fazendo clientes de todas as agências
-- aparecerem misturados com os do próprio admin.
--
-- Correção: remove essas policies (RLS volta a isolar cada usuário aos
-- próprios dados, como sempre foi) e move a visão "todos os dados" para
-- funções RPC dedicadas (SECURITY DEFINER, gated por is_admin()) que só o
-- Painel de Admin chama explicitamente.
-- Execute no SQL Editor do Supabase.
-- =============================================

-- ── 1. Remove as policies que vazavam para as telas normais ──────────────────
DROP POLICY IF EXISTS "profiles_admin_read_all"      ON public.profiles;
DROP POLICY IF EXISTS "clients_admin_read_all"        ON public.clients;
DROP POLICY IF EXISTS "subscriptions_admin_read_all"  ON public.subscriptions;

-- ── 2. Funções RPC dedicadas ao Painel de Admin ───────────────────────────────
-- SECURITY DEFINER roda com privilégio de owner, então a query interna ignora
-- RLS — mas a própria função só devolve linhas quando quem chama é admin.

CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS SETOF public.profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM public.profiles WHERE public.is_admin();
$$;

CREATE OR REPLACE FUNCTION public.admin_list_clients()
RETURNS SETOF public.clients
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM public.clients WHERE public.is_admin();
$$;

CREATE OR REPLACE FUNCTION public.admin_list_subscriptions()
RETURNS SETOF public.subscriptions
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM public.subscriptions WHERE public.is_admin();
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_profiles()      TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_clients()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_subscriptions()  TO authenticated;
