/**
 * Traduz as mensagens de erro do Supabase Auth para português.
 *
 * O Supabase responde sempre em inglês. Sem esta camada o usuário vê
 * "User already registered" no meio de um produto todo em pt-BR, o que
 * derruba a confiança justamente na hora de criar a conta.
 */

const MAP: { match: string[]; message: string }[] = [
  {
    match: ['already registered', 'already been registered', 'user already'],
    message: 'Já existe uma conta com este email. Tente entrar ou recuperar a senha.',
  },
  {
    match: ['invalid login credentials'],
    message: 'Email ou senha incorretos.',
  },
  {
    match: ['password should be at least', 'password is too short'],
    message: 'A senha é curta demais. Use pelo menos 8 caracteres.',
  },
  {
    match: ['unable to validate email', 'invalid email', 'email address is invalid'],
    message: 'Esse email não parece válido. Confira e tente de novo.',
  },
  {
    match: ['email not confirmed'],
    message: 'Confirme seu email antes de entrar. Procure a mensagem na sua caixa de entrada.',
  },
  {
    match: ['for security purposes', 'rate limit', 'too many requests'],
    message: 'Muitas tentativas seguidas. Espere alguns instantes e tente de novo.',
  },
  {
    match: ['signups not allowed', 'signup is disabled'],
    message: 'O cadastro está temporariamente indisponível. Fale com a gente.',
  },
  {
    match: ['weak password'],
    message: 'Essa senha é fraca demais. Misture letras, números e símbolos.',
  },
  {
    match: ['failed to fetch', 'network'],
    message: 'Não conseguimos falar com o servidor. Confira sua conexão e tente de novo.',
  },
]

/** Recebe o erro cru do Supabase e devolve algo que o usuário entenda. */
export function traduzirErroAuth(raw?: string | null): string {
  if (!raw) return 'Não foi possível concluir. Tente novamente.'
  const lower = raw.toLowerCase()
  const hit = MAP.find(entry => entry.match.some(m => lower.includes(m)))
  // Sem correspondência, evita vazar texto em inglês para o usuário final.
  return hit ? hit.message : 'Não foi possível concluir. Tente novamente em instantes.'
}

// ─── Força da senha ───────────────────────────────────────────────────────────

export type ForcaSenha = { score: 0 | 1 | 2 | 3; label: string; color: string }

/**
 * Pontuação simples e honesta: comprimento é o que mais pesa, porque é o que
 * mais importa de verdade. Não bloqueia o envio — só informa.
 */
export function forcaSenha(senha: string): ForcaSenha {
  if (!senha) return { score: 0, label: '', color: 'transparent' }

  let pontos = 0
  if (senha.length >= 8) pontos++
  if (senha.length >= 12) pontos++
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontos++
  if (/\d/.test(senha)) pontos++
  if (/[^A-Za-z0-9]/.test(senha)) pontos++

  if (senha.length < 8) return { score: 1, label: 'Curta demais', color: '#ef4444' }
  if (pontos <= 2) return { score: 1, label: 'Fraca', color: '#ef4444' }
  if (pontos <= 3) return { score: 2, label: 'Média', color: '#F5A623' }
  return { score: 3, label: 'Forte', color: '#22C55E' }
}

/** Mínimo aceito no cadastro. */
export const SENHA_MINIMA = 8
