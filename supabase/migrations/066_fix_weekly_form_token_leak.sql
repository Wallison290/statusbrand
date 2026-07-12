-- =============================================
-- StatusMedia — Correção: enumeração de tokens do formulário semanal público
--
-- A policy "anon_select_active_configs" (não versionada — criada direto no
-- SQL Editor, fora de qualquer migration deste repositório) libera SELECT em
-- weekly_form_configs para QUALQUER pessoa com "is_active = true". O app
-- filtra por public_token no client-side (fetchConfigByToken), mas RLS não
-- sabe disso: uma chamada direta à API (sem passar pelo app) lista TODOS os
-- formulários ativos de TODOS os clientes de TODAS as agências, expondo o
-- public_token (o "segredo" que deveria proteger o link) de cada um.
--
-- Correção: RPC SECURITY DEFINER que já valida o token dentro da função —
-- mesmo padrão já usado pelo Portal do Colaborador
-- (032_collaborator_portal_rpc.sql). Remove a policy de leitura pública da
-- tabela; o app passa a chamar a RPC em vez de consultar a tabela direto.
-- Execute no SQL Editor do Supabase.
-- =============================================

CREATE OR REPLACE FUNCTION public.get_weekly_form_config_by_token(p_token uuid)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
BEGIN
  SELECT wfc.id, wfc.client_id, wfc.day_of_week, wfc.is_active,
         wfc.public_token, wfc.custom_questions, wfc.created_at, wfc.updated_at,
         c.company_name
  INTO   v_config
  FROM   public.weekly_form_configs wfc
  JOIN   public.clients c ON c.id = wfc.client_id
  WHERE  wfc.public_token = p_token
    AND  wfc.is_active    = true
  LIMIT  1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'id',               v_config.id,
    'client_id',        v_config.client_id,
    'day_of_week',      v_config.day_of_week,
    'is_active',        v_config.is_active,
    'public_token',     v_config.public_token,
    'custom_questions', v_config.custom_questions,
    'created_at',       v_config.created_at,
    'updated_at',       v_config.updated_at,
    'clients',          json_build_object('company_name', v_config.company_name)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_weekly_form_config_by_token(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_weekly_form_config_by_token(uuid) TO authenticated;

DROP POLICY IF EXISTS "anon_select_active_configs" ON public.weekly_form_configs;
