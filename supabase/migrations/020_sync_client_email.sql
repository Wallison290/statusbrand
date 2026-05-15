-- =============================================
-- 020 — Sync client email across tables
-- Quando a agência altera o e-mail de um cliente,
-- sincroniza em profiles e auth.users (se existir
-- usuário vinculado).
-- =============================================

CREATE OR REPLACE FUNCTION sync_client_auth_email(
  p_client_id UUID,
  p_new_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_user_id UUID;
  v_normalized_email TEXT;
BEGIN
  -- Normaliza o e-mail
  v_normalized_email := LOWER(TRIM(p_new_email));

  -- Segurança: apenas a agência que criou o cliente pode alterar
  IF NOT EXISTS (
    SELECT 1 FROM clients
    WHERE id = p_client_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acesso negado: você não tem permissão para editar este cliente.';
  END IF;

  -- Busca o usuário de portal vinculado a este cliente
  SELECT id INTO v_profile_user_id
  FROM profiles
  WHERE linked_client_id = p_client_id
    AND role = 'client'
  LIMIT 1;

  -- Se não há usuário vinculado, nada mais a fazer
  -- (clients.email já foi atualizado pelo frontend via update normal)
  IF v_profile_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Atualiza profiles.email
  UPDATE profiles
  SET
    email      = v_normalized_email,
    updated_at = NOW()
  WHERE id = v_profile_user_id;

  -- Atualiza auth.users.email
  -- Mantém email_confirmed_at intacto — a agência já validou o e-mail
  UPDATE auth.users
  SET
    email      = v_normalized_email,
    updated_at = NOW()
  WHERE id = v_profile_user_id;
END;
$$;

-- Apenas usuários autenticados (agência) podem chamar
GRANT EXECUTE ON FUNCTION sync_client_auth_email(UUID, TEXT) TO authenticated;
