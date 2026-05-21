-- =============================================
-- 028 — Fix handle_new_user: lê role e linked_client_id dos metadados
-- Antes: profile era criado sem role → clientes convidados iam parar
--        no dashboard da agência em vez do portal.
-- Agora: role e linked_client_id são lidos do raw_user_meta_data
--        para que o convite via invite-client já posicione o usuário
--        corretamente na primeira sessão.
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role             TEXT;
  v_linked_client_id UUID;
BEGIN
  -- Lê role dos metadados (padrão: 'agency')
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'agency');

  -- Lê linked_client_id dos metadados (pode ser NULL)
  BEGIN
    v_linked_client_id := (NEW.raw_user_meta_data->>'linked_client_id')::UUID;
  EXCEPTION WHEN others THEN
    v_linked_client_id := NULL;
  END;

  INSERT INTO profiles (id, email, full_name, role, linked_client_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_role,
    v_linked_client_id
  )
  ON CONFLICT (id) DO UPDATE SET
    role             = EXCLUDED.role,
    linked_client_id = COALESCE(EXCLUDED.linked_client_id, profiles.linked_client_id),
    updated_at       = NOW();

  RETURN NEW;
END;
$$;
