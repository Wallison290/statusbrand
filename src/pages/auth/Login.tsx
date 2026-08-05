import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, UserCircle2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { AuthField } from '@/components/auth/AuthField'
import { traduzirErroAuth } from '@/lib/authErrors'

// Conteúdo do card de login (logo, título e formulário).
function LoginFormCard({
  email, setEmail, password, setPassword, loading, onSubmit,
}: {
  email: string
  setEmail: (v: string) => void
  password: string
  setPassword: (v: string) => void
  loading: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <>
      {/* Ícone no topo do card */}
      <div className="flex justify-center mb-1">
        <picture>
          <source srcSet="/logo-icon.avif" type="image/avif" />
          <source srcSet="/logo-icon.webp" type="image/webp" />
          <img src="/logo-icon.png" alt="StatusMedia" width={64} height={64} className="w-16 h-16 object-contain" />
        </picture>
      </div>

      <div className="mb-4">
        <h2 className="text-[22px] font-bold text-[#0f0f0f]">Entrar</h2>
        <p className="text-[13px] text-[#a0a0a0] mt-1">Bem-vindo de volta.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3.5">
        <AuthField
          label="Email"
          type="email"
          placeholder="voce@suaagencia.com.br"
          value={email}
          onChange={e => setEmail(e.target.value)}
          icon={<Mail className="w-4 h-4" />}
          required
          autoComplete="email"
        />

        <AuthField
          label="Senha"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          icon={<Lock className="w-4 h-4" />}
          togglePassword
          required
          autoComplete="current-password"
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-[12px] text-[#29457a] hover:text-[#16284d] font-medium transition-colors"
          >
            Esqueci minha senha
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#29457a]/25"
          style={{ background: 'linear-gradient(135deg, #29457a 0%, #16284d 100%)' }}
        >
          {loading
            ? 'Entrando...'
            : <><span>Entrar</span><ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>

      <p className="text-center text-[12px] text-[#a0a0a0] mt-4">
        Não tem conta?{' '}
        <Link to="/register" className="text-[#29457a] font-semibold hover:text-[#16284d] transition-colors">
          Criar conta
        </Link>
      </p>
    </>
  )
}

// ── Login page ─────────────────────────────────────────────────────────────────

export function Login() {
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [loading, setLoading]           = useState(false)
  const { signIn } = useAuth()
  const { toast }  = useToast()
  const navigate   = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email.trim().toLowerCase(), password)
    setLoading(false)
    if (error) {
      // Antes só "Invalid login credentials" era traduzido; o resto vazava
      // em inglês para o usuário.
      toast(traduzirErroAuth(error.message), 'error')
    } else {
      navigate('/')
    }
  }

  const formCardProps = { email, setEmail, password, setPassword, loading, onSubmit: handleSubmit }

  return (
    <div className="h-screen flex overflow-hidden">

      {/* ── Left panel — imagem ──────────────────────────────────────────────── */}
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

      {/* ── Right panel — formulário (rola só se a tela for muito baixa) ──────── */}
      <div className="flex-1 bg-[#f4f4f8] overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="min-h-full w-full max-w-sm mx-auto flex flex-col justify-center p-5"
        >

          {/* Card de login — sempre visível, em qualquer tamanho de tela */}
          <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm p-6">
            <LoginFormCard {...formCardProps} />
          </div>

          {/* Cliente da agência */}
          <div className="mt-3 bg-white rounded-2xl border border-[#e8e8e8] shadow-sm px-5 py-3.5 flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-[#eaf0f8] flex items-center justify-center flex-shrink-0">
              <UserCircle2 style={{ width: 18, height: 18, color: '#29457a' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-[#0f0f0f] leading-tight">É cliente da agência?</p>
              <p className="text-[11px] text-[#a0a0a0] mt-0.5 leading-tight">Crie seu acesso ao portal do cliente</p>
            </div>
            <Link
              to="/client-register"
              className="flex-shrink-0 text-[12px] font-semibold text-[#29457a] border border-[#bcd0ea] rounded-lg px-3 py-1.5 hover:bg-[#29457a] hover:text-white hover:border-[#29457a] transition-all"
            >
              Criar acesso
            </Link>
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] text-[#c0c0c0] mt-3">
            © {new Date().getFullYear()} StatusMedia. Todos os direitos reservados.
          </p>

        </motion.div>
      </div>
    </div>
  )
}
