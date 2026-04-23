import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'

// ── StatusBrand wordmark ───────────────────────────────────────────────────────

function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm:  { mark: 'text-[10px] w-6 h-6 rounded', status: 'text-[18px]', brand: 'text-[10px]' },
    md:  { mark: 'text-[12px] w-8 h-8 rounded-md', status: 'text-[26px]', brand: 'text-[12px]' },
    lg:  { mark: 'text-[14px] w-10 h-10 rounded-lg', status: 'text-[32px]', brand: 'text-[14px]' },
  }
  const s = sizes[size]

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`bg-[#0f0f0f] flex items-center justify-center flex-shrink-0 ${s.mark}`}>
        <span className="text-white font-bold select-none">SB</span>
      </div>
      <div className="text-center">
        <p className={`font-bold text-[#0f0f0f] leading-none ${s.status}`}
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
          Status<span style={{ fontFamily: 'inherit' }}>Brand</span>
        </p>
        <p className={`text-[#a0a0a0] uppercase tracking-[0.22em] mt-1 font-light ${s.brand}`}>
          Agency Platform
        </p>
      </div>
    </div>
  )
}

// ── Login page ─────────────────────────────────────────────────────────────────

export function Login() {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]       = useState(false)
  const { signIn }  = useAuth()
  const { toast }   = useToast()
  const navigate    = useNavigate()

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

      {/* Left panel — brand identity */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#0f0f0f] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Subtle texture */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '28px 28px' }} />

        {/* Company logo */}
        <div className="relative z-10 flex items-center justify-center w-full">
          <img
            src="/logo.png"
            alt="StatusBrand"
            className="w-full max-w-[320px] object-contain select-none"
            draggable={false}
            onError={e => {
              const img = e.currentTarget
              if (!img.src.endsWith('/logo.svg')) img.src = '/logo.svg'
            }}
          />
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 bg-[#f7f7f7] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 flex justify-center">
            <Wordmark size="md" />
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm p-8">
            <div className="mb-7">
              <h2 className="text-[20px] font-semibold text-[#0f0f0f]">Entrar</h2>
              <p className="text-[13px] text-[#a0a0a0] mt-1">Bem-vindo de volta.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="voce@statusbrand.com"
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
                  className="absolute right-3 top-[34px] text-[#a0a0a0] hover:text-[#0f0f0f] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex justify-end">
                <Link to="/forgot-password"
                  className="text-[12px] text-[#737373] hover:text-[#0f0f0f] transition-colors">
                  Esqueci minha senha
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-xl bg-[#0f0f0f] text-white text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-[#2a2a2a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed sb-invert"
              >
                {loading ? 'Entrando...' : <><span>Entrar</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <p className="text-center text-[12px] text-[#a0a0a0] mt-6">
              Não tem conta?{' '}
              <Link to="/register" className="text-[#0f0f0f] font-medium hover:underline">
                Criar conta
              </Link>
            </p>
          </div>

          {/* Footer note */}
          <p className="text-center text-[11px] text-[#c0c0c0] mt-5">
            © {new Date().getFullYear()} StatusBrand. Todos os direitos reservados.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
