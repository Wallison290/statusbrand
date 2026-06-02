import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, UserCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'

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

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — imagem ──────────────────────────────────────────────── */}
      <div className="hidden lg:block lg:w-[45%] relative overflow-hidden">
        <img
          src="/planer.png"
          alt="Kairo Hub"
          className="absolute inset-0 w-full h-full object-cover object-center select-none"
          draggable={false}
        />
      </div>

      {/* ── Right panel — formulário ─────────────────────────────────────────── */}
      <div className="flex-1 bg-[#f4f4f8] flex items-center justify-center p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >

          {/* Mobile: logo no topo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <img src="/logo.png" alt="Kairo Hub" className="h-10 object-contain" />
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm p-8">

            {/* Ícone no topo do card */}
            <div className="flex justify-center mb-5">
              <img src="/logo-icon.png" alt="Kairo Hub" className="w-14 h-14 object-contain" />
            </div>

            <div className="mb-6">
              <h2 className="text-[22px] font-bold text-[#0f0f0f]">Entrar</h2>
              <p className="text-[13px] text-[#a0a0a0] mt-1">Bem-vindo de volta.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="voce@kairohub.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
                autoComplete="email"
              />

              <div className="relative">
                <Input
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
                  className="absolute right-3 top-[34px] text-[#a0a0a0] hover:text-[#6366f1] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-[12px] text-[#6366f1] hover:text-[#4f46e5] transition-colors"
                >
                  Esqueci minha senha
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
              >
                {loading
                  ? 'Entrando...'
                  : <><span>Entrar</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <p className="text-center text-[12px] text-[#a0a0a0] mt-6">
              Não tem conta?{' '}
              <Link to="/register" className="text-[#6366f1] font-semibold hover:text-[#4f46e5] transition-colors">
                Criar conta
              </Link>
            </p>
          </div>

          {/* Cliente da agência */}
          <div className="mt-4 bg-white rounded-2xl border border-[#e8e8e8] shadow-sm px-5 py-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-[#f0f0ff] flex items-center justify-center flex-shrink-0">
              <UserCircle2 style={{ width: 18, height: 18, color: '#6366f1' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-[#0f0f0f] leading-tight">É cliente da agência?</p>
              <p className="text-[11px] text-[#a0a0a0] mt-0.5 leading-tight">Crie seu acesso ao portal do cliente</p>
            </div>
            <Link
              to="/client-register"
              className="flex-shrink-0 text-[12px] font-semibold text-[#6366f1] border border-[#c7d2fe] rounded-lg px-3 py-1.5 hover:bg-[#6366f1] hover:text-white hover:border-[#6366f1] transition-all"
            >
              Criar acesso
            </Link>
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] text-[#c0c0c0] mt-5">
            © {new Date().getFullYear()} Kairo Hub. Todos os direitos reservados.
          </p>

        </motion.div>
      </div>
    </div>
  )
}
