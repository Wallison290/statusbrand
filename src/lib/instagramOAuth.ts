// ── Business Login for Instagram ──────────────────────────────────────────────
// Fonte única da URL de autorização. Antes isso vivia solto dentro do
// ClientProfile; a página /instagram passou a precisar do mesmo fluxo e duas
// cópias divergiriam na primeira mudança de escopo.
//
// O App Review da Meta exige que o botão que dispara este fluxo esteja visível
// no app e no screencast — por isso ele existe em dois lugares: no perfil do
// cliente e na página Instagram.

const META_APP_ID  = import.meta.env.VITE_META_APP_ID  as string | undefined
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

/** Escopos solicitados. Mantenha em sincronia com a Política de Privacidade
 *  (src/pages/PrivacyPage.tsx) — o revisor da Meta cruza os dois, e escopo
 *  pedido que não aparece na política é reprovado como uso não declarado. */
export const INSTAGRAM_SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_insights',
] as const

export const isInstagramConfigured = !!META_APP_ID

/**
 * Monta a URL de autorização do Instagram.
 *
 * O `state` volta para a Edge Function instagram-oauth, que o usa para saber
 * a quem pertence a conta conectada. Sem clientId a conta fica no nível da
 * agência (client_id null) e não pode ser usada para agendar nem para
 * relatórios — por isso a UI sempre pede um cliente antes de conectar.
 */
export function buildInstagramOAuthUrl(userId: string, clientId: string): string {
  const redirectUri = `${SUPABASE_URL}/functions/v1/instagram-oauth`
  const state       = `${userId}|${clientId}`

  return (
    `https://www.instagram.com/oauth/authorize` +
    `?enable_fb_login=0` +
    `&force_authentication=1` +
    `&client_id=${META_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${INSTAGRAM_SCOPES.join(',')}` +
    `&state=${encodeURIComponent(state)}` +
    `&response_type=code`
  )
}
