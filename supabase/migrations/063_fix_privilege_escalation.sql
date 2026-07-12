-- =============================================
-- StatusMedia — Correção CRÍTICA: escalonamento de privilégio em profiles
--
-- A policy "profiles_own" (001_initial.sql:192) é:
--   FOR ALL USING (auth.uid() = id)
-- Sem WITH CHECK por coluna. "FOR ALL" cobre SELECT/INSERT/UPDATE/DELETE, e
-- quando não há WITH CHECK separado, o Postgres reaproveita o USING também
-- pra validar updates. Resultado: qualquer usuário autenticado podia rodar,
-- direto do navegador (sem passar por nenhuma tela do sistema):
--
--   supabase.from('profiles').update({ is_admin: true }).eq('id', meuId)
--
-- E a RLS deixava passar, porque só checava "essa linha é minha?" — nunca
-- checou QUAIS colunas estavam sendo alteradas. O mesmo valia pra "role"
-- (client -> agency) e "linked_client_id" (trocar de qual cliente enxerga
-- o portal). Foi assim que uma conta externa virou admin do sistema.
--
-- Execute no SQL Editor do Supabase.
-- =============================================

-- ── 1. Reverte qualquer escalonamento já feito ────────────────────────────
-- Remove is_admin de qualquer conta que não seja a dona do sistema.
UPDATE public.profiles
SET is_admin = false
WHERE is_admin = true
  AND lower(trim(email)) <> lower('contatowallisoncarvalho@gmail.com');

-- ── 2. Trava is_admin / role / linked_client_id contra o próprio usuário ──
-- Trigger roda ANTES de qualquer UPDATE em profiles e força essas 3 colunas
-- a manterem o valor anterior, a menos que a chamada venha do service_role
-- (edge functions / scripts administrativos rodados com a chave de serviço,
-- que já pulam RLS mas continuam passando pelo trigger).
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  NEW.is_admin := OLD.is_admin;
  NEW.role := OLD.role;
  NEW.linked_client_id := OLD.linked_client_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_columns ON public.profiles;
CREATE TRIGGER protect_profile_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_columns();

-- ── 3. Auditoria: liste manualmente quem tinha algo suspeito ──────────────
-- Rode esta consulta separadamente pra ver contas afetadas antes/depois:
--   SELECT id, email, role, is_admin, linked_client_id, created_at
--   FROM public.profiles
--   WHERE is_admin = true OR role = 'agency'
--   ORDER BY created_at DESC;
