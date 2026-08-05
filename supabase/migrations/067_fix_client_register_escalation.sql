-- =============================================
-- StatusMedia — Correção CRÍTICA: escalonamento pelo cadastro do cliente
--
-- Mesma classe de falha que a 063 corrigiu na RLS de `profiles`, só que por
-- outra porta: funções SECURITY DEFINER, que NÃO passam por RLS.
--
-- ── Buraco 1: setup_client_profile (019_client_self_register.sql:57) ─────────
-- É SECURITY DEFINER, tem GRANT para `anon`, e recebe p_user_id e p_client_id
-- como parâmetros livres, sem validar nada. Qualquer pessoa, sem login, podia
-- chamar direto a API REST:
--
--   POST /rest/v1/rpc/setup_client_profile
--   { "p_user_id": "<id de qualquer usuário>",
--     "p_client_id": "<id de QUALQUER cliente>", ... }
--
-- e o perfil daquele usuário passava a apontar para o cliente escolhido —
-- entrando no portal dele e vendo conteúdo, relatórios e financeiro.
--
-- ── Buraco 2: handle_new_user (028_fix_handle_new_user_role.sql) ─────────────
-- Lê `role` e `linked_client_id` de raw_user_meta_data, que é escrito pelo
-- próprio navegador em supabase.auth.signUp({ options: { data } }). Ou seja,
-- bastava se cadastrar assim para nascer dentro do portal de outro cliente:
--
--   supabase.auth.signUp({ email, password, options: { data: {
--     role: 'client', linked_client_id: '<id de outro cliente>' } } })
--
-- ── Buraco 3: check_client_email (019:12) ───────────────────────────────────
-- Devolve o NOME DA EMPRESA para quem não está logado. Dá para varrer e-mails
-- e montar a carteira de clientes de uma agência.
--
-- ── A correção ──────────────────────────────────────────────────────────────
-- O vínculo deixa de ser informado por quem chama e passa a ser DERIVADO do
-- e-mail: um usuário só pode ser ligado ao cliente cujo e-mail cadastrado é
-- igual ao e-mail do próprio usuário. Isso mantém os dois fluxos legítimos
-- (auto-cadastro e convite pela agência) funcionando, e fecha os três buracos
-- sem depender de nenhuma mudança no frontend.
--
-- Execute no SQL Editor do Supabase.
-- =============================================


-- ── 1. Reverte vínculos que não batem com o e-mail ───────────────────────────
-- Se alguém já se ligou a um cliente que não é o dele, isso desfaz.
-- Rode o SELECT antes para ver o que será afetado.

-- SELECT p.id, p.email, p.linked_client_id, c.email AS email_do_cliente
-- FROM profiles p
-- LEFT JOIN clients c ON c.id = p.linked_client_id
-- WHERE p.role = 'client'
--   AND (c.id IS NULL OR LOWER(TRIM(c.email)) IS DISTINCT FROM LOWER(TRIM(p.email)));

UPDATE profiles p
SET    linked_client_id = NULL,
       role             = 'agency',
       updated_at       = NOW()
FROM   clients c
WHERE  p.role = 'client'
  AND  p.linked_client_id = c.id
  AND  LOWER(TRIM(c.email)) IS DISTINCT FROM LOWER(TRIM(p.email));


-- ── 2. setup_client_profile: vínculo derivado do e-mail ──────────────────────
-- p_client_id e p_client_name passam a ser IGNORADOS. Ficam na assinatura só
-- para não quebrar quem já chama a função (frontend e a Edge Function
-- invite-client).

CREATE OR REPLACE FUNCTION setup_client_profile(
  p_user_id     UUID,
  p_client_id   UUID,   -- ignorado: mantido por compatibilidade
  p_client_name TEXT,   -- ignorado: mantido por compatibilidade
  p_email       TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_email  TEXT;
  v_client_id   UUID;
  v_client_name TEXT;
BEGIN
  -- O usuário informado precisa existir e ter exatamente o e-mail informado.
  SELECT u.email INTO v_auth_email
  FROM   auth.users u
  WHERE  u.id = p_user_id;

  IF v_auth_email IS NULL
     OR LOWER(TRIM(v_auth_email)) IS DISTINCT FROM LOWER(TRIM(p_email)) THEN
    RAISE EXCEPTION 'Usuário e e-mail não conferem.';
  END IF;

  -- O cliente é DERIVADO do e-mail, nunca aceito por parâmetro.
  SELECT c.id, c.company_name INTO v_client_id, v_client_name
  FROM   clients c
  WHERE  LOWER(TRIM(c.email)) = LOWER(TRIM(v_auth_email))
  LIMIT  1;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Este e-mail não pertence a nenhum cliente cadastrado.';
  END IF;

  UPDATE profiles
  SET    role             = 'client',
         linked_client_id = v_client_id,
         full_name        = COALESCE(NULLIF(full_name, ''), v_client_name),
         email            = COALESCE(NULLIF(email, ''), v_auth_email),
         updated_at       = NOW()
  WHERE  id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO profiles (id, email, full_name, role, linked_client_id)
    VALUES (p_user_id, v_auth_email, v_client_name, 'client', v_client_id)
    ON CONFLICT (id) DO UPDATE SET
      role             = 'client',
      linked_client_id = v_client_id,
      updated_at       = NOW();
  END IF;
END;
$$;


-- ── 3. handle_new_user: para de confiar nos metadados do navegador ───────────
-- role e linked_client_id deixam de vir de raw_user_meta_data. São derivados
-- do e-mail: se ele bate com um cliente cadastrado, nasce 'client' ligado
-- àquele cliente; senão nasce 'agency' sem vínculo. full_name continua vindo
-- dos metadados, porque é inofensivo.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id   UUID;
  v_client_name TEXT;
  v_role        TEXT := 'agency';
BEGIN
  SELECT c.id, c.company_name INTO v_client_id, v_client_name
  FROM   clients c
  WHERE  LOWER(TRIM(c.email)) = LOWER(TRIM(NEW.email))
  LIMIT  1;

  IF v_client_id IS NOT NULL THEN
    v_role := 'client';
  END IF;

  INSERT INTO profiles (id, email, full_name, role, linked_client_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), v_client_name, ''),
    v_role,
    v_client_id
  )
  ON CONFLICT (id) DO UPDATE SET
    role             = EXCLUDED.role,
    linked_client_id = EXCLUDED.linked_client_id,
    updated_at       = NOW();

  RETURN NEW;
END;
$$;


-- ── 4. check_client_email: para de entregar o nome da empresa ────────────────
-- Mantém a mesma forma de retorno para não quebrar o frontend, mas devolve o
-- nome vazio e o id nulo para quem não está autenticado. O vínculo não precisa
-- mais desses campos: quem decide é a função do item 2.

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
  v_autenticado BOOLEAN := auth.uid() IS NOT NULL;
BEGIN
  SELECT c.id, c.company_name INTO v_client_id, v_client_name
  FROM   clients c
  WHERE  LOWER(TRIM(c.email)) = LOWER(TRIM(p_email))
  LIMIT  1;

  IF v_client_id IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE  p.linked_client_id = v_client_id AND p.role = 'client'
  ) INTO v_has_access;

  -- Visitante anônimo só descobre se pode prosseguir. Nada de id nem de nome.
  IF v_autenticado THEN
    RETURN QUERY SELECT v_client_id, v_client_name, v_has_access;
  ELSE
    RETURN QUERY SELECT NULL::UUID, ''::TEXT, v_has_access;
  END IF;
END;
$$;


-- ── 5. Confere as permissões ─────────────────────────────────────────────────
-- Os dois GRANTs para anon continuam necessários: no auto-cadastro o cliente
-- ainda não tem sessão. A segurança agora está DENTRO das funções, não no
-- grant.

GRANT EXECUTE ON FUNCTION check_client_email(TEXT)                        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION setup_client_profile(UUID, UUID, TEXT, TEXT)    TO anon, authenticated;


-- ── 6. Verificação depois de rodar ───────────────────────────────────────────
-- Deve retornar zero linhas: nenhum perfil de cliente ligado a um cliente
-- cujo e-mail seja diferente do dele.
--
-- SELECT p.id, p.email, c.email AS email_do_cliente
-- FROM profiles p
-- JOIN clients c ON c.id = p.linked_client_id
-- WHERE p.role = 'client'
--   AND LOWER(TRIM(c.email)) IS DISTINCT FROM LOWER(TRIM(p.email));
