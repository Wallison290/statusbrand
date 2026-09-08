/**
 * Extrai a mensagem real de erro de uma Edge Function.
 *
 * Quando a função responde com status não-2xx, o supabase-js zera o `data` e
 * embrulha a resposta num FunctionsHttpError cujo `message` é sempre a mesma
 * string genérica: "Edge Function returned a non-2xx status code". O motivo de
 * verdade — que a função devolveu no corpo, em `{ error: "..." }` — fica em
 * `err.context`, que é o Response cru e ninguém lia.
 *
 * Sem esta camada, "WhatsApp desconectado" e "cliente sem número cadastrado"
 * viram exatamente o mesmo toast indecifrável, e não dá para saber se o
 * problema é da integração ou do cadastro.
 */

const MAP: { match: string[]; message: string }[] = [
  {
    match: ['cliente sem whatsapp', 'sem whatsapp cadastrado'],
    message: 'Este cliente não tem WhatsApp cadastrado. Adicione o número no perfil dele.',
  },
  {
    match: ['não configurada', 'nao configurada', 'não configurado', 'faltam secrets'],
    message: 'A integração de WhatsApp não está configurada. Confira os secrets no Supabase.',
  },
  {
    match: ['not connected', 'disconnected', 'desconectad', 'no session', 'not logged', 'logged out', 'qrcode'],
    message: 'O WhatsApp está desconectado. Reconecte a instância na UazAPI e tente de novo.',
  },
  {
    match: ['sem client_id'],
    message: 'Não foi possível identificar o cliente. Recarregue a página e tente de novo.',
  },
  {
    match: ['apenas agências podem'],
    message: 'Sua conta não tem permissão para enviar essa notificação.',
  },
  {
    match: ['token inválido', 'não autorizado', 'nao autorizado'],
    message: 'Sua sessão expirou. Entre novamente e repita o envio.',
  },
  {
    match: ['parâmetros inválidos', 'parametros invalidos'],
    message: 'Envio inválido. Recarregue a página e tente de novo.',
  },
]

function translate(raw: string): string | null {
  const low = raw.toLowerCase()
  for (const entry of MAP) {
    if (entry.match.some(m => low.includes(m))) return entry.message
  }
  return null
}

/**
 * Lê o corpo do Response guardado em `err.context` sem consumir o original.
 * Versões diferentes do supabase-js entregam ora o Response, ora o objeto já
 * desserializado — os dois casos são tratados aqui.
 */
async function bodyOf(ctx: unknown): Promise<unknown> {
  if (!ctx) return null
  const c = ctx as any
  if (typeof c.text !== 'function') return c
  try {
    const res  = typeof c.clone === 'function' ? c.clone() : c
    const text = await res.text()
    if (!text) return null
    try { return JSON.parse(text) } catch { return { error: text } }
  } catch {
    return null
  }
}

/** Mensagem pronta para exibir num toast. */
export async function edgeErrorMessage(err: unknown, fallback = 'Erro inesperado.'): Promise<string> {
  const e    = err as any
  const body = await bodyOf(e?.context)
  const raw  = typeof body === 'string'
    ? body
    : (body as any)?.error ?? (body as any)?.message ?? ''

  if (raw) return translate(String(raw)) ?? String(raw)

  // Sem corpo legível: a mensagem genérica do supabase-js não ajuda ninguém.
  const msg = String(e?.message ?? '')
  if (!msg || /non-2xx status code/i.test(msg)) return fallback
  return translate(msg) ?? msg
}
