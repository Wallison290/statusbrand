-- Definições ANTERIORES das 3 funções, capturadas do banco em 2026-08-05 01:59
-- antes de aplicar a 067. Cole isto no SQL Editor para desfazer.

CREATE OR REPLACE FUNCTION public.check_client_email(p_email text)
 RETURNS TABLE(client_id uuid, client_name text, has_auth_access boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id   UUID;
  v_client_name TEXT;
  v_has_access  BOOLEAN := FALSE;
BEGIN
  SELECT c.id, c.company_name
  INTO   v_client_id, v_client_name
  FROM   clients c
  WHERE  LOWER(TRIM(c.email)) = LOWER(TRIM(p_email))
  LIMIT  1;

  IF v_client_id IS NULL THEN
    RETURN;
  END IF;

  -- Bloqueia se já existe profile vinculado como client
  -- OU se já existe qualquer usuário auth com esse email
  SELECT (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.linked_client_id = v_client_id AND p.role = 'client'
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(p_email))
    )
  ) INTO v_has_access;

  RETURN QUERY SELECT v_client_id, v_client_name, v_has_access;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v_role TEXT; v_linked_client_id UUID; BEGIN v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'agency'); BEGIN v_linked_client_id := (NEW.raw_user_meta_data->>'linked_client_id')::UUID; EXCEPTION WHEN others THEN v_linked_client_id := NULL; END; INSERT INTO profiles (id, email, full_name, role, linked_client_id) VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), v_role, v_linked_client_id) ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, linked_client_id = COALESCE(EXCLUDED.linked_client_id, profiles.linked_client_id), updated_at = NOW(); RETURN NEW; END; $function$
;

CREATE OR REPLACE FUNCTION public.setup_client_profile(p_user_id uuid, p_client_id uuid, p_client_name text, p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Atualiza profile criado pelo trigger handle_new_user (role='agency' por padrão)
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

  -- NÃO auto-confirma email: o cliente precisa clicar no link de confirmação
END;
$function$
;
