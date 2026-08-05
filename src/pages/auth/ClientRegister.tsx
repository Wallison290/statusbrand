import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  UserPlus, ArrowLeft, Lock, Mail, MailCheck, ShieldCheck, CheckCircle2,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { AuthField } from '@/components/auth/AuthField'
import { traduzirErroAuth, forcaSenha, SENHA_MINIMA } from '@/lib/authErrors'

// ─── Wordmark ─────────────────────────────────────────────────────────────────
// Mesma identidade do login: logo real + "StatusMedia" com o navy da marca.
// Antes esta era a única tela do app com outra marca, em Georgia serif e com um
// quadrado "SB" — sobra de antes do rebrand. Numa página onde o cliente da
// agência cria senha, marca divergente lê como página falsa.

function Wordmark() {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <picture>
        <source srcSet="/logo-icon.avif" type="image/avif" />
        <source srcSet="/logo-icon.webp" type="image/webp" />
        <img
          src="/logo-icon.png"
          alt="StatusMedia"
          width={56}
          height={56}
          className="w-14 h-14 object-contain select-none"
          draggable={false}
        />
      </picture>
      <div className="text-center">
        <p className="font-bold text-[#0f0f0f] leading-none text-[24px]">
          Status<span className="text-[#29457a]">Media</span>
        </p>
        <p className="text-[#a0a0a0] uppercase tracking-[0.22em] mt-1.5 font-medium text-[10px]">
          Área do Cliente
        </p>
      </div>
    </div>
  )
}

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

type Step  = 'form' | 'confirmar-email' | 'pronto'
type Erros = Partial<Record<'email' | 'password' | 'confirm' | 'terms' | 'geral', string>>

// ─── Página ───────────────────────────────────────────────────────────────────
export function ClientRegister() {
  const [step, setStep]         = useState<Step>('form')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [aceitou, setAceitou]   = useState(false)
  const [erros, setErros]       = useState<Erros>({})
  const [loading, setLoading]   = useState(false)
  const [clientName, setClientName] = useState<string | null>(null)

  const limpar = (campo: keyof Erros) =>
    setErros(e => (e[campo] || e.geral ? { ...e, [campo]: undefined, geral: undefined } : e))

  function validar(): Erros {
    const e: Erros = {}
    const mail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) e.email = 'Digite um email válido.'
    if (password.length < SENHA_MINIMA) e.password = `Use pelo menos ${SENHA_MINIMA} caracteres.`
    if (!confirm) e.confirm = 'Repita a senha.'
    else if (password !== confirm) e.confirm = 'As senhas não conferem.'
    if (!aceitou) e.terms = 'É preciso aceitar os termos para criar o acesso.'
    return e
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()

    const v = validar()
    setErros(v)
    if (Object.keys(v).length > 0) return

    const mail = email.trim().toLowerCase()
    setLoading(true)

    try {
      // ── 1. O email precisa estar cadastrado pela agência ────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: clientRows, error: rpcError } = await (supabase as any)
        .rpc('check_client_email', { p_email: mail })

      if (rpcError) {
        console.error('check_client_email:', rpcError)
        setErros({ geral: 'Não conseguimos verificar seu email agora. Tente novamente em instantes.' })
        return
      }

      if (!clientRows || clientRows.length === 0) {
        setErros({ email: 'Não encontramos um cadastro com este email. Confira com a sua agência.' })
        return
      }

      const client = clientRows[0] as { client_id: string; client_name: string; has_auth_access: boolean }

      if (client.has_auth_access) {
        setErros({ email: 'Este email já tem acesso ao portal. Faça login ou use "Esqueci minha senha".' })
        return
      }

      // ── 2. Cria o usuário ───────────────────────────────────────────────────
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: mail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            role: 'client',
            linked_client_id: client.client_id,
            full_name: client.client_name,
          },
        },
      })

      if (signUpError) {
        setErros({ email: traduzirErroAuth(signUpError.message) })
        return
      }
      if (!authData.user) {
        setErros({ geral: 'Não foi possível criar o acesso. Tente novamente.' })
        return
      }

      // ── 3. Vincula o perfil ao cliente ──────────────────────────────────────
      // Antes uma falha aqui era engolida com console.error e a tela de sucesso
      // aparecia mesmo assim — o cliente entrava num portal que não sabia quem
      // ele era. Agora a falha é mostrada, com instrução do que fazer.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: profileError } = await (supabase as any).rpc('setup_client_profile', {
        p_user_id:     authData.user.id,
        p_client_id:   client.client_id,
        p_client_name: client.client_name,
        p_email:       mail,
      })

      if (profileError) {
        console.error('setup_client_profile:', profileError)
        setErros({
          geral:
            'Sua conta foi criada, mas não conseguimos ligá-la à sua agência. ' +
            'Avise a agência antes de tentar entrar — o acesso pode não funcionar.',
        })
        return
      }

      setClientName(client.client_name || null)

      // ── 4. O destino depende da confirmação de email ────────────────────────
      // Quando a confirmação está ligada no Supabase, `session` volta null e o
      // cliente NÃO consegue entrar ainda. Antes a tela dizia "já pode entrar"
      // em todos os casos, e ele batia numa porta fechada sem entender.
      setStep(authData.session ? 'pronto' : 'confirmar-email')

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      setErros({ geral: traduzirErroAuth(msg) })
    } finally {
      setLoading(false)
    }
  }

  // ── Telas finais ────────────────────────────────────────────────────────────
  if (step !== 'form') {
    const confirmando = step === 'confirmar-email'
    return (
      <div className="min-h-screen bg-[#f4f4f8] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex justify-center"><Wordmark /></div>

          <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm p-8 text-center">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5
                ${confirmando ? 'bg-[#eaf0f8]' : 'bg-emerald-50 border border-emerald-200'}`}
            >
              {confirmando
                ? <MailCheck className="w-7 h-7 text-[#29457a]" />
                : <CheckCircle2 className="w-7 h-7 text-emerald-600" />}
            </div>

            {confirmando ? (
              <>
                <h1 className="text-[20px] font-semibold text-[#0f0f0f] mb-2">
                  Falta confirmar seu email
                </h1>
                <p className="text-[13px] text-[#737373] leading-relaxed">
                  Seu acesso foi criado, mas antes de entrar você precisa confirmar o email.
                  Enviamos um link para
                </p>
                <p className="text-[13.5px] font-semibold text-[#0f0f0f] mt-2 break-all">
                  {email.trim().toLowerCase()}
                </p>
                <p className="text-[12.5px] text-[#a0a0a0] mt-4 leading-relaxed">
                  Abra a mensagem e clique no link. Se não encontrar, confira o spam
                  ou a aba de promoções.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-[20px] font-semibold text-[#0f0f0f] mb-2">Acesso criado!</h1>
                <p className="text-[13px] text-[#737373] leading-relaxed">
                  {clientName
                    ? <><span className="font-medium text-[#0f0f0f]">{clientName}</span>, seu acesso foi criado com sucesso.</>
                    : 'Seu acesso foi criado com sucesso.'}
                  {' '}Agora você já pode entrar na sua área do cliente.
                </p>
              </>
            )}

            <Link
              to="/login"
              className="mt-6 w-full h-11 rounded-xl text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-95 shadow-md shadow-[#29457a]/25"
              style={{ background: 'linear-gradient(135deg, #29457a 0%, #16284d 100%)' }}
            >
              Ir para o login
            </Link>
          </div>

          <p className="text-center text-[11px] text-[#c0c0c0] mt-5">
            © {new Date().getFullYear()} StatusMedia. Todos os direitos reservados.
          </p>
        </motion.div>
      </div>
    )
  }

  // ── Formulário ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">

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

      <div className="flex-1 bg-[#f4f4f8] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex justify-center"><Wordmark /></div>

          <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm p-7">
            <div className="mb-6">
              <h2 className="text-[20px] font-semibold text-[#0f0f0f]">Criar acesso</h2>
              <p className="text-[13px] text-[#a0a0a0] mt-1 leading-relaxed">
                Sua agência usa a StatusMedia para organizar seu conteúdo. Use o email
                que ela cadastrou para você.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
              <AuthField
                label="Email cadastrado pela agência"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); limpar('email') }}
                icon={<Mail className="w-4 h-4" />}
                error={erros.email}
                autoComplete="email"
                inputMode="email"
                required
              />

              <AuthField
                label="Nova senha"
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

              {/* Aceite explícito — antes o cliente criava acesso sem concordar
                  com nada, e ele é um terceiro cujos dados são processados. */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aceitou}
                    onChange={e => { setAceitou(e.target.checked); limpar('terms') }}
                    aria-invalid={!!erros.terms}
                    className="mt-0.5 w-4 h-4 rounded border-[#c8c8c8] accent-[#29457a] cursor-pointer flex-shrink-0"
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

              {erros.geral && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-[12px] text-red-700 leading-relaxed">{erros.geral}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl text-white text-[13px] font-semibold transition-opacity hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 shadow-md shadow-[#29457a]/25"
                style={{ background: 'linear-gradient(135deg, #29457a 0%, #16284d 100%)' }}
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><UserPlus className="w-4 h-4" /> Criar acesso</>}
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-5 pt-4 border-t border-[#f0f0f0]">
              <span className="flex items-center gap-1.5 text-[11px] text-[#a0a0a0]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" /> Acesso só ao seu conteúdo
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-[#a0a0a0]">
                <Lock className="w-3.5 h-3.5 text-[#22C55E]" /> SSL criptografado
              </span>
            </div>

            <div className="mt-5 space-y-2 text-center">
              <p className="text-[12px] text-[#a0a0a0]">
                Já tem acesso?{' '}
                <Link to="/login" className="text-[#29457a] font-semibold hover:text-[#16284d] hover:underline">
                  Entrar
                </Link>
              </p>
              <p className="text-[12px] text-[#a0a0a0]">
                <Link to="/forgot-password" className="text-[#737373] hover:text-[#0f0f0f] transition-colors">
                  Esqueci minha senha
                </Link>
              </p>
            </div>
          </div>

          <div className="text-center mt-5">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-[12px] text-[#a0a0a0] hover:text-[#0f0f0f] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar para o login
            </Link>
          </div>

          <p className="text-center text-[11px] text-[#c0c0c0] mt-3">
            © {new Date().getFullYear()} StatusMedia. Todos os direitos reservados.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
