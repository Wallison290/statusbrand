import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, UserPlus, ArrowLeft, CheckCircle2, Lock, Mail } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

// ─── Wordmark (igual ao Login) ────────────────────────────────────────────────

function Wordmark() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-md bg-[#0f0f0f] flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-[12px] select-none">SB</span>
      </div>
      <div className="text-center">
        <p
          className="font-bold text-[#0f0f0f] leading-none text-[26px]"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          Status<span style={{ fontFamily: 'inherit' }}>Brand</span>
        </p>
        <p className="text-[#a0a0a0] uppercase tracking-[0.22em] mt-1 font-light text-[10px]">
          Área do Cliente
        </p>
      </div>
    </div>
  )
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

type Step = 'form' | 'success'

interface ClientInfo {
  client_id: string
  client_name: string
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function ClientRegister() {
  const navigate = useNavigate()

  const [step, setStep]   = useState<Step>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword]       = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState<string | null>(null)
  const [clientInfo, setClientInfo]           = useState<ClientInfo | null>(null)

  const clearError = () => setError(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // ── Validações locais ────────────────────────────────────────────────────
    if (!email.trim() || !password || !confirmPassword) {
      setError('Preencha todos os campos.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()

      // ── 1. Validar e-mail contra tabela de clientes ──────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: clientRows, error: rpcError } = await (supabase as any)
        .rpc('check_client_email', { p_email: normalizedEmail })

      if (rpcError) {
        console.error('check_client_email error:', rpcError)
        throw new Error('Erro ao verificar e-mail. Tente novamente.')
      }

      if (!clientRows || clientRows.length === 0) {
        setError(
          'Não encontramos nenhum cliente cadastrado com este e-mail. ' +
          'Verifique o e-mail ou fale com a agência.'
        )
        return
      }

      const client = clientRows[0] as { client_id: string; client_name: string; has_auth_access: boolean }

      if (client.has_auth_access) {
        setError(
          'Este cliente já possui acesso ao portal. ' +
          'Faça login ou use "Esqueci minha senha" para redefinir.'
        )
        return
      }

      // ── 2. Criar usuário no Supabase Auth ────────────────────────────────
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          // Após confirmar o email, o cliente cai na tela de login
          emailRedirectTo: `${window.location.origin}/login`,
          // Metadados passados ao trigger caso ele seja atualizado futuramente
          data: {
            role: 'client',
            linked_client_id: client.client_id,
            full_name: client.client_name,
          },
        },
      })

      if (signUpError) {
        // E-mail já registrado na auth (mas sem perfil de cliente vinculado)
        if (
          signUpError.message.toLowerCase().includes('already registered') ||
          signUpError.message.toLowerCase().includes('already been registered') ||
          signUpError.message.toLowerCase().includes('user already')
        ) {
          setError(
            'Este e-mail já está registrado. ' +
            'Tente fazer login ou use "Esqueci minha senha".'
          )
        } else {
          throw signUpError
        }
        return
      }

      if (!authData.user) {
        throw new Error('Erro ao criar usuário. Tente novamente.')
      }

      // ── 3. Configurar perfil como 'client' + vincular ao cliente ─────────
      // Chamamos a função SECURITY DEFINER que bypassa RLS.
      // Funciona tanto com confirmação de e-mail ativada quanto desativada.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: profileError } = await (supabase as any).rpc('setup_client_profile', {
        p_user_id:     authData.user.id,
        p_client_id:   client.client_id,
        p_client_name: client.client_name,
        p_email:       normalizedEmail,
      })

      if (profileError) {
        console.error('setup_client_profile error:', profileError)
        // Não bloqueia — o login ainda pode funcionar se o trigger criou o perfil
        // corretamente; logamos o erro mas continuamos o fluxo.
      }

      setClientInfo({ client_id: client.client_id, client_name: client.client_name })
      setStep('success')

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Tela de sucesso ──────────────────────────────────────────────────────────

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="mb-10 flex justify-center">
            <Wordmark />
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>

            <h1 className="text-[20px] font-semibold text-[#0f0f0f] mb-2">
              Acesso criado!
            </h1>
            <p className="text-[13px] text-[#737373] leading-relaxed mb-6">
              {clientInfo?.client_name
                ? <><span className="font-medium text-[#0f0f0f]">{clientInfo.client_name}</span>, o seu acesso foi criado com sucesso.</>
                : 'Seu acesso foi criado com sucesso.'
              }
              {' '}Agora você pode entrar na sua área do cliente.
            </p>

            <button
              onClick={() => navigate('/login')}
              className="w-full h-10 rounded-xl text-[13px] font-medium transition-colors hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: '#0f0f0f', color: '#ffffff' }}
            >
              Ir para o login
            </button>
          </div>

          <p className="text-center text-[11px] text-[#c0c0c0] mt-5">
            © {new Date().getFullYear()} Kairo Hub. Todos os direitos reservados.
          </p>
        </motion.div>
      </div>
    )
  }

  // ── Formulário ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex">

      {/* Left panel — imagem (igual ao Login) */}
      <div className="hidden lg:block lg:w-[45%] relative overflow-hidden bg-[#0a1020]">
        <img
          src="/planer.png"
          alt="Kairo Hub"
          className="absolute inset-0 w-full h-full object-cover object-center select-none"
          draggable={false}
        />
      </div>

      {/* Right panel — formulário */}
      <div className="flex-1 bg-[#f7f7f7] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 flex justify-center">
            <Wordmark />
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm p-8">
            <div className="mb-7">
              <h2 className="text-[20px] font-semibold text-[#0f0f0f]">Criar acesso</h2>
              <p className="text-[13px] text-[#a0a0a0] mt-1">
                Use o e-mail que a agência cadastrou para você.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* E-mail */}
              <div>
                <label className="block text-[12px] font-medium text-[#374151] mb-1.5">
                  E-mail cadastrado pela agência
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a0] pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearError() }}
                    placeholder="seu@email.com"
                    required
                    autoComplete="email"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#e8e8e8] bg-white text-[13px] text-[#0f0f0f] placeholder:text-[#a0a0a0] focus:outline-none focus:border-[#0f0f0f] focus:ring-1 focus:ring-[#0f0f0f]/10 transition-colors"
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-[12px] font-medium text-[#374151] mb-1.5">
                  Nova senha
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a0] pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearError() }}
                    placeholder="Mínimo 6 caracteres"
                    required
                    autoComplete="new-password"
                    className="w-full h-10 pl-9 pr-10 rounded-xl border border-[#e8e8e8] bg-white text-[13px] text-[#0f0f0f] placeholder:text-[#a0a0a0] focus:outline-none focus:border-[#0f0f0f] focus:ring-1 focus:ring-[#0f0f0f]/10 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0a0] hover:text-[#0f0f0f] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar senha */}
              <div>
                <label className="block text-[12px] font-medium text-[#374151] mb-1.5">
                  Confirmar senha
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a0] pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); clearError() }}
                    placeholder="Repita a senha"
                    required
                    autoComplete="new-password"
                    className="w-full h-10 pl-9 pr-10 rounded-xl border border-[#e8e8e8] bg-white text-[13px] text-[#0f0f0f] placeholder:text-[#a0a0a0] focus:outline-none focus:border-[#0f0f0f] focus:ring-1 focus:ring-[#0f0f0f]/10 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0a0] hover:text-[#0f0f0f] transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Mensagem de erro */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-[12px] text-red-700 leading-relaxed">{error}</p>
                </div>
              )}

              {/* Botão */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-xl text-[13px] font-medium transition-colors hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                style={{ background: '#0f0f0f', color: '#ffffff' }}
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><UserPlus className="w-4 h-4" /> Criar acesso</>
                }
              </button>
            </form>

            {/* Links inferiores */}
            <div className="mt-6 space-y-2 text-center">
              <p className="text-[12px] text-[#a0a0a0]">
                Já tem acesso?{' '}
                <Link to="/login" className="text-[#0f0f0f] font-medium hover:underline">
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

          {/* Back link */}
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
            © {new Date().getFullYear()} Kairo Hub. Todos os direitos reservados.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
