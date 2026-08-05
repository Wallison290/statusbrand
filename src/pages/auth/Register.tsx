import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Mail, Lock, User, ArrowRight, ShieldCheck, Lock as LockIcon,
  CheckCircle2, MailCheck,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { AuthField } from '@/components/auth/AuthField'
import { traduzirErroAuth, forcaSenha, SENHA_MINIMA } from '@/lib/authErrors'

type Erros = Partial<Record<'fullName' | 'email' | 'password' | 'confirm' | 'terms', string>>

// ─── Barra de força da senha ──────────────────────────────────────────────────
function BarraForca({ senha }: { senha: string }) {
  const { score, label, color } = forcaSenha(senha)
  if (!senha) return null
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3].map(n => (
          <span
            key={n}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{ background: n <= score ? color : '#e8e8e8' }}
          />
        ))}
      </div>
      <p className="text-[11px] mt-1" style={{ color }}>{label}</p>
    </div>
  )
}

// ─── Tela de "confirme seu email" ─────────────────────────────────────────────
// Antes o cadastro terminava com um toast e um redirect para /login. O toast
// some em segundos e o usuário ficava sem saber que precisava abrir o email.
function ConfirmeEmail({ email }: { email: string }) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#eaf0f8] flex items-center justify-center mx-auto mb-5">
        <MailCheck className="w-7 h-7 text-[#29457a]" />
      </div>
      <h2 className="text-[22px] font-bold text-[#0f0f0f]">Confirme seu email</h2>
      <p className="text-[13px] text-[#6b7280] mt-2 leading-relaxed">
        Enviamos um link de confirmação para
      </p>
      <p className="text-[13.5px] font-semibold text-[#0f0f0f] mt-1 break-all">{email}</p>
      <p className="text-[12.5px] text-[#a0a0a0] mt-4 leading-relaxed">
        Abra a mensagem e clique no link para ativar sua conta. Se não achar,
        confira o spam ou a aba de promoções.
      </p>
      <Link
        to="/login"
        className="mt-6 w-full h-11 rounded-xl text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-95"
        style={{ background: 'linear-gradient(135deg, #29457a 0%, #16284d 100%)' }}
      >
        Ir para o login <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────
export function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [aceitou, setAceitou]   = useState(false)
  const [erros, setErros]       = useState<Erros>({})
  const [loading, setLoading]   = useState(false)
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null)

  const { signUp } = useAuth()
  const { toast }  = useToast()
  const navigate   = useNavigate()

  const limpar = (campo: keyof Erros) =>
    setErros(e => (e[campo] ? { ...e, [campo]: undefined } : e))

  /** Valida tudo de uma vez e devolve os erros por campo. */
  function validar(): Erros {
    const e: Erros = {}
    const nome = fullName.trim()
    const mail = email.trim().toLowerCase()

    if (nome.length < 3)            e.fullName = 'Digite seu nome completo.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) e.email = 'Digite um email válido.'
    if (password.length < SENHA_MINIMA) e.password = `Use pelo menos ${SENHA_MINIMA} caracteres.`
    if (!confirm)                   e.confirm = 'Repita a senha.'
    else if (password !== confirm)  e.confirm = 'As senhas não conferem.'
    if (!aceitou)                   e.terms = 'É preciso aceitar os termos para criar a conta.'

    return e
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()

    const e = validar()
    setErros(e)
    if (Object.keys(e).length > 0) return

    // Normaliza antes de enviar: email com espaço ou maiúscula cria conta que
    // depois não loga.
    const nome = fullName.trim()
    const mail = email.trim().toLowerCase()

    setLoading(true)
    const { data, error } = await signUp(mail, password, nome)
    setLoading(false)

    if (error) {
      const msg = traduzirErroAuth(error.message)
      toast(msg, 'error')
      if (/já existe uma conta/i.test(msg)) setErros({ email: msg })
      return
    }

    // Sem sessão = o Supabase está exigindo confirmação por email.
    if (!data?.session) {
      setEnviadoPara(mail)
      return
    }

    toast('Conta criada! Bem-vindo à StatusMedia.', 'success')
    navigate('/')
  }

  return (
    <div className="h-screen flex overflow-hidden">

      {/* ── Painel esquerdo — mesma moldura do login ──────────────────────────── */}
      <div className="hidden lg:block lg:w-[45%] relative overflow-hidden bg-[#0a1020]">
        <picture>
          <source srcSet="/planer.avif" type="image/avif" />
          <source srcSet="/planer.webp" type="image/webp" />
          <img
            src="/planer.png"
            alt="StatusMedia"
            className="absolute inset-0 w-full h-full object-cover object-center select-none"
            draggable={false}
          />
        </picture>
      </div>

      {/* ── Painel direito — formulário ───────────────────────────────────────── */}
      <div className="flex-1 bg-[#f4f4f8] overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="min-h-full w-full max-w-sm mx-auto flex flex-col justify-center p-5"
        >
          <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm p-6">
            {enviadoPara ? (
              <ConfirmeEmail email={enviadoPara} />
            ) : (
              <>
                <div className="flex justify-center mb-1">
                  <picture>
                    <source srcSet="/logo-icon.avif" type="image/avif" />
                    <source srcSet="/logo-icon.webp" type="image/webp" />
                    <img src="/logo-icon.png" alt="StatusMedia" width={64} height={64} className="w-16 h-16 object-contain" />
                  </picture>
                </div>

                <div className="mb-4">
                  <h2 className="text-[22px] font-bold text-[#0f0f0f]">Criar conta</h2>
                  <p className="text-[13px] text-[#a0a0a0] mt-1">
                    3 dias de teste. Cancele quando quiser.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                  <AuthField
                    label="Nome completo"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={e => { setFullName(e.target.value); limpar('fullName') }}
                    icon={<User className="w-4 h-4" />}
                    error={erros.fullName}
                    autoComplete="name"
                    required
                  />

                  <AuthField
                    label="Email"
                    type="email"
                    placeholder="voce@suaagencia.com.br"
                    value={email}
                    onChange={e => { setEmail(e.target.value); limpar('email') }}
                    icon={<Mail className="w-4 h-4" />}
                    error={erros.email}
                    autoComplete="email"
                    inputMode="email"
                    required
                  />

                  <AuthField
                    label="Senha"
                    placeholder={`Mínimo ${SENHA_MINIMA} caracteres`}
                    value={password}
                    onChange={e => { setPassword(e.target.value); limpar('password') }}
                    icon={<Lock className="w-4 h-4" />}
                    error={erros.password}
                    togglePassword
                    autoComplete="new-password"
                    hint={<BarraForca senha={password} />}
                    required
                  />

                  <AuthField
                    label="Confirmar senha"
                    placeholder="Repita a senha"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); limpar('confirm') }}
                    icon={<Lock className="w-4 h-4" />}
                    error={erros.confirm}
                    togglePassword
                    autoComplete="new-password"
                    required
                  />

                  {/* Aceite explícito — antes ninguém aceitava nada ao criar conta. */}
                  <div className="pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aceitou}
                        onChange={e => { setAceitou(e.target.checked); limpar('terms') }}
                        aria-invalid={!!erros.terms}
                        className="mt-0.5 w-4 h-4 rounded border-[#c8c8c8] text-[#29457a] accent-[#29457a] cursor-pointer flex-shrink-0"
                      />
                      <span className="text-[12px] text-[#6b7280] leading-relaxed">
                        Li e aceito os{' '}
                        <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-[#29457a] font-semibold hover:underline">
                          Termos de uso
                        </Link>{' '}
                        e a{' '}
                        <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#29457a] font-semibold hover:underline">
                          Política de privacidade
                        </Link>
                        .
                      </span>
                    </label>
                    {erros.terms && <p className="mt-1.5 text-[11.5px] text-[#ef4444]">{erros.terms}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#29457a]/25"
                    style={{ background: 'linear-gradient(135deg, #29457a 0%, #16284d 100%)' }}
                  >
                    {loading
                      ? 'Criando conta...'
                      : <><span>Criar conta</span><ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>

                {/* Sinais de confiança — o cadastro é o ponto de maior ansiedade
                    da jornada, e antes não repetia nada do que a landing promete. */}
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-5 pt-4 border-t border-[#f0f0f0]">
                  <span className="flex items-center gap-1.5 text-[11px] text-[#a0a0a0]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" /> 3 dias de teste
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-[#a0a0a0]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" /> Sem fidelidade
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-[#a0a0a0]">
                    <LockIcon className="w-3.5 h-3.5 text-[#22C55E]" /> SSL criptografado
                  </span>
                </div>

                <p className="text-center text-[12px] text-[#a0a0a0] mt-4">
                  Já tem conta?{' '}
                  <Link to="/login" className="text-[#29457a] font-semibold hover:text-[#16284d] transition-colors">
                    Fazer login
                  </Link>
                </p>
              </>
            )}
          </div>

          <p className="text-center text-[11px] text-[#c0c0c0] mt-3">
            © {new Date().getFullYear()} StatusMedia. Todos os direitos reservados.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
