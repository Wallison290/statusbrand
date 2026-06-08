import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/components/ui/toast'

export function ClientSetup() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [checking, setChecking]       = useState(true)
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPass, setShowPass]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [done, setDone]               = useState(false)

  useEffect(() => {
    let settled = false

    // Resolve positivo (sessão encontrada) ou negativo (sem sessão após timeout)
    const resolveWith = (session: import('@supabase/supabase-js').Session | null) => {
      if (settled) return
      settled = true
      if (session?.user) {
        setEmail(session.user.email ?? '')
        setChecking(false)
      } else {
        navigate('/login', { replace: true })
      }
    }

    // 1. Ouve mudanças de auth
    //    IMPORTANTE: o Supabase v2 dispara INITIAL_SESSION imediatamente com null
    //    enquanto o hash da URL ainda está sendo trocado por token (async).
    //    Por isso ignoramos INITIAL_SESSION sem sessão — só navegamos para login
    //    pelo fallback após o timeout, garantindo tempo para o token chegar.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' && !session) return  // aguarda o hash ser processado
      resolveWith(session)
    })

    // 2. Verifica sessão já existente (hash pode ter sido processado antes do mount)
    //    Só resolve positivamente — o negativo fica para o fallback
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) resolveWith(session)
    })

    // 3. Fallback: se após 10s nenhuma sessão chegou, redireciona para login
    //    (token expirado, link inválido, ou usuário sem convite)
    const fallback = setTimeout(() => resolveWith(null), 10_000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(fallback)
    }
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast('A senha deve ter pelo menos 6 caracteres', 'error')
      return
    }
    if (password !== confirm) {
      toast('As senhas não coincidem', 'error')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({
      password,
      data: { needs_password_setup: false },  // marca senha como criada
    })
    setLoading(false)

    if (error) {
      toast(error.message, 'error')
      return
    }

    setDone(true)
    setTimeout(() => navigate('/portal', { replace: true }), 2000)
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5 bg-[#1a1a1a] border border-white/10 rounded-xl px-5 py-3">
            <img src="/logo-icon.png" alt="StatusMedia" className="w-6 h-6 object-contain" />
            <span className="text-white font-bold text-lg tracking-tight">
              Kairo<span className="text-[#a78bfa]">Hub</span>
            </span>
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8">

          {done ? (
            /* Sucesso */
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-white text-xl font-semibold mb-2">Acesso criado!</h2>
              <p className="text-gray-400 text-sm">Redirecionando para o portal…</p>
            </div>
          ) : (
            /* Formulário */
            <>
              <div className="flex justify-center mb-6">
                <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center">
                  <KeyRound className="w-7 h-7 text-green-400" />
                </div>
              </div>

              <h1 className="text-white text-xl font-semibold text-center mb-1">
                Criar sua senha
              </h1>
              <p className="text-gray-400 text-sm text-center mb-6">
                Olá! Defina uma senha para acessar o portal com{' '}
                <span className="text-white font-medium">{email}</span>
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Senha */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Nova senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar senha */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Confirmar senha
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      required
                      placeholder="Repita a senha"
                      className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-semibold py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? 'Criando acesso…' : 'Finalizar cadastro'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          © 2025 StatusMedia — Organize. Produza. Escale.
        </p>
      </div>
    </div>
  )
}
