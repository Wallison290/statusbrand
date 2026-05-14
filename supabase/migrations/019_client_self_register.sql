-- =============================================
-- 019 — Client Self-Registration
-- Permite que clientes criem o próprio acesso
-- usando o e-mail cadastrado pela agência.
-- =============================================

-- ─── 1. check_client_email ────────────────────────────────────────────────────
-- Valida se o e-mail existe na tabela clients (sem exigir autenticação).
-- Retorna: client_id, client_name, has_auth_access.
-- Chamada por usuários anônimos antes de criar conta.

CREATE OR REPLACE FUNCTION check_client_email(p_email TEXT)
RETURNS TABLE(client_id UUID, client_name TEXT, has_auth_access BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id   UUID;
  v_client_name TEXT;
  v_has_access  BOOLEAN := FALSE;
BEGIN
  -- Busca cliente pelo e-mail (case-insensitive, sem espaços extras)
  SELECT c.id, c.company_name
  INTO   v_client_id, v_client_name
  FROM   clients c
  WHERE  LOWER(TRIM(c.email)) = LOWER(TRIM(p_email))
  LIMIT  1;

  IF v_client_id IS NULL THEN
    -- Nenhum cliente encontrado com esse e-mail
    RETURN;
  END IF;

  -- Verifica se já existe um perfil de cliente vinculado a esse client_id
  SELECT EXISTS (
    SELECT 1
    FROM   profiles p
    WHERE  p.linked_client_id = v_client_id
    AND    p.role = 'client'
  ) INTO v_has_access;

  RETURN QUERY SELECT v_client_id, v_client_name, v_has_access;
END;
$$;

-- Permite chamada por qualquer origem (anon = usuário não autenticado)
GRANT EXECUTE ON FUNCTION check_client_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION check_client_email(TEXT) TO authenticated;


-- ─── 2. setup_client_profile ─────────────────────────────────────────────────
-- Define role='client' e linked_client_id no perfil recém-criado.
-- Usada logo após supabase.auth.signUp(), antes ou depois da confirmação
-- de e-mail, pois roda com privilégio de owner (SECURITY DEFINER).

CREATE OR REPLACE FUNCTION setup_client_profile(
  p_user_id     UUID,
  p_client_id   UUID,
  p_client_name TEXT,
  p_email       TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Tenta atualizar perfil que o trigger já criou
  UPDATE profiles
  SET
    role             = 'client',
    linked_client_id = p_client_id,
    full_name        = COALESCE(NULLIF(full_name, ''), p_client_name),
    email            = COALESCE(NULLIF(email, ''), p_email),
    updated_at       = NOW()
  WHERE id = p_user_id;

  -- Se o trigger ainda não rodou (race condition), insere direto
  IF NOT FOUND THEN
    INSERT INTO profiles (id, email, full_name, role, linked_client_id)
    VALUES (p_user_id, p_email, p_client_name, 'client', p_client_id)
    ON CONFLICT (id) DO UPDATE SET
      role             = 'client',
      linked_client_id = p_client_id,
      updated_at       = NOW();
  END IF;
END;
$$;

-- Apenas usuários autenticados podem chamar (o signUp já cria sessão quando
-- a confirmação de e-mail está desativada; quando está ativada, chamamos
-- com a service role key via RPC — ver ClientRegister.tsx)
GRANT EXECUTE ON FUNCTION setup_client_profile(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION setup_client_profile(UUID, UUID, TEXT, TEXT) TO anon;
