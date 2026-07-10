-- =============================================
-- StatusMedia — Painel de Admin (dono do sistema)
-- Não cria tabelas novas: libera leitura de TODAS as linhas de profiles,
-- clients e subscriptions apenas para a conta marcada como is_admin=true.
-- A trava fica no banco (RLS), não só na tela — mesmo digitando a URL
-- direto, um usuário comum continua vendo só os próprios dados.
-- Execute no SQL Editor do Supabase.
-- =============================================

-- ── 1. Coluna is_admin em profiles ────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- ── 2. Helper is_admin() ──────────────────────────────────────────────────────
-- SECURITY DEFINER: roda com privilégio de owner, então a consulta interna
-- não passa pela RLS de profiles (evita recursão infinita na policy abaixo).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ── 3. Policies de leitura total para admin ───────────────────────────────────
-- Policies SELECT são permissivas por padrão no Postgres (combinam com OR),
-- então isso apenas ADICIONA acesso para quem é admin — não afeta as
-- policies existentes de "cada um vê só o seu".

DROP POLICY IF EXISTS "profiles_admin_read_all" ON public.profiles;
CREATE POLICY "profiles_admin_read_all" ON public.profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "clients_admin_read_all" ON public.clients;
CREATE POLICY "clients_admin_read_all" ON public.clients
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "subscriptions_admin_read_all" ON public.subscriptions;
CREATE POLICY "subscriptions_admin_read_all" ON public.subscriptions
  FOR SELECT USING (public.is_admin());

-- ── 4. Marca a conta dona do sistema como admin ───────────────────────────────
UPDATE public.profiles
SET is_admin = true
WHERE lower(trim(email)) = lower('contatowallisoncarvalho@gmail.com');
