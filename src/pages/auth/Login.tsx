import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, UserCircle2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'

// Borda com gradiente girando nas cores da marca (só decorativa, sem neon —
// tons de azul da própria identidade visual). Usada atrás do card de login
// no desktop, visível por trás do recorte arredondado do card.
function RotatingBorder() {
  return (
    <div className="absolute -inset-px rounded-2xl overflow-hidden pointer-events-none">
      <div
        className="absolute inset-[-60%] animate-[spin_7s_linear_infinite] opacity-70 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0deg, #29457a 40deg, #5b7fb8 70deg, transparent 110deg, transparent 250deg, #16284d 290deg, #29457a 320deg, transparent 360deg)',
        }}
      />
    </div>
  )
}

// Input claro local (tema de login não usa o Input dark global)
function LightField({
  label, icon, ...props
}: { label: string; icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="w-full">
      <label className="block text-[12px] font-medium text-[#6b7280] mb-1.5">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none">{icon}</div>
        <input
          {...props}
          className="flex h-11 w-full rounded-xl border border-[#e3e3e3] bg-[#f7f8fa] pl-10 pr-3 text-[13px] text-[#0f0f0f] placeholder:text-[#a0a0a0] focus:outline-none focus:ring-2 focus:ring-[#29457a]/20 focus:border-[#29457a]/60 transition-colors"
        />
      </div>
    </div>
  )
}

// Conteúdo do card de login (logo, título e formulário) — reaproveitado
// tanto na versão mobile (sempre visível) quanto na versão desktop
// (recolhida, expande no hover).
function LoginFormCard({
  email, setEmail, password, setPassword,
  showPassword, setShowPassword, loading, onSubmit,
}: {
  email: string
  setEmail: (v: string) => void
  password: string
  setPassword: (v: string) => void
  showPassword: boolean
  setShowPassword: (v: boolean) => void
  loading: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <>
      {/* Ícone no topo do card */}
      <div className="flex justify-center mb-1">
        <img src="/logo-icon.png" alt="StatusMedia" className="w-16 h-16 object-contain" />
      </div>

      <div className="mb-4">
        <h2 className="text-[22px] font-bold text-[#0f0f0f]">Entrar</h2>
        <p className="text-[13px] text-[#a0a0a0] mt-1">Bem-vindo de volta.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3.5">
        <LightField
          label="Email"
          type="email"
          placeholder="voce@statusmedia.com.br"
          value={email}
          onChange={e => setEmail(e.target.value)}
          icon={<Mail className="w-4 h-4" />}
          required
          autoComplete="email"
        />

        <div className="relative">
          <LightField
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[36px] text-[#a0a0a0] hover:text-[#29457a] transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

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
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const { signIn } = useAuth()
  const { toast }  = useToast()
  const navigate   = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      toast(
        error.message === 'Invalid login credentials'
          ? 'Email ou senha incorretos.'
          : error.message,
        'error'
      )
    } else {
      navigate('/')
    }
  }

  const formCardProps = { email, setEmail, password, setPassword, showPassword, setShowPassword, loading, onSubmit: handleSubmit }

  return (
    <div className="h-screen flex overflow-hidden">

      {/* ── Left panel — imagem ──────────────────────────────────────────────── */}
      <div className="hidden lg:block lg:w-[45%] relative overflow-hidden bg-[#0a1020]">
        <img
          src="/planer.png"
          alt="StatusMedia"
          className="absolute inset-0 w-full h-full object-cover object-center select-none"
          draggable={false}
        />
      </div>

      {/* ── Right panel — formulário (rola só se a tela for muito baixa) ──────── */}
      <div className="flex-1 bg-[#f4f4f8] overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="min-h-full w-full max-w-sm mx-auto flex flex-col justify-center p-5"
        >

          {/* Card — mobile/tablet: sempre visível, sem efeito de hover (não existe em touch) */}
          <div className="lg:hidden bg-white rounded-2xl border border-[#e8e8e8] shadow-sm p-6">
            <LoginFormCard {...formCardProps} />
          </div>

          {/* Card — desktop: recolhido num pill, expande no hover revelando o formulário */}
          <div className="hidden lg:block relative group cursor-pointer">
            <RotatingBorder />
            <div className="relative bg-white rounded-2xl m-px overflow-hidden shadow-sm">
              {/* Pill recolhido — some assim que o hover começa */}
              <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-100 group-hover:opacity-0 transition-opacity duration-200 pointer-events-none">
                <Lock className="w-3.5 h-3.5 text-[#29457a]" />
                <span className="text-[13px] font-semibold tracking-wide text-[#29457a] uppercase">Entrar</span>
              </div>

              {/* Conteúdo completo — 0 de altura até o hover, expande suavemente */}
              <div className="max-h-14 group-hover:max-h-[640px] transition-[max-height] duration-500 ease-in-out overflow-hidden">
                <div className="p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-150">
                  <LoginFormCard {...formCardProps} />
                </div>
              </div>
            </div>
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
