import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/toast'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Layout } from '@/components/layout/Layout'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { isConfigured } from '@/integrations/supabase/client'
import { Setup } from '@/pages/Setup'

import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { ForgotPassword } from '@/pages/auth/ForgotPassword'
import { ResetPassword } from '@/pages/auth/ResetPassword'
import { ClientRegister } from '@/pages/auth/ClientRegister'
import { ClientSetup } from '@/pages/auth/ClientSetup'
import { AuthCallback } from '@/pages/auth/AuthCallback'
import { Dashboard } from '@/pages/Dashboard'
import { ClientList } from '@/pages/clients/ClientList'
import { ClientForm } from '@/pages/clients/ClientForm'
import { ClientProfile } from '@/pages/clients/ClientProfile'
import { FeedOrganizer } from '@/pages/feed/FeedOrganizer'
import { Planner } from '@/pages/planner/Planner'
import { Tasks } from '@/pages/tasks/Tasks'
import { Library } from '@/pages/library/Library'
import { Financial } from '@/pages/financial/Financial'
import { Notes } from '@/pages/notes/Notes'
import { AIPage } from '@/pages/ai/AIPage'
import { Subscription } from '@/pages/Subscription'
import { Pricing } from '@/pages/Pricing'
import { PortalDashboard } from '@/pages/portal/PortalDashboard'
import { CollaboratorPortal } from '@/pages/portal/CollaboratorPortal'
import { TeamPage } from '@/pages/team/TeamPage'
import { InstagramPage } from '@/pages/instagram/InstagramPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { TermsPage } from '@/pages/TermsPage'
import { WeeklyFormPage } from '@/pages/public/WeeklyFormPage'
import { LandingPage } from '@/pages/LandingPage'

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

// ── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center animate-pulse">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-[#94a3b8] text-sm">Carregando...</p>
      </div>
    </div>
  )
}

// ── Guards ────────────────────────────────────────────────────────────────────

/** Redireciona usuários já autenticados para a área correta */
function GuestGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (user) {
    // Cliente que ainda não criou senha vai para setup, não para o portal
    if (user.user_metadata?.needs_password_setup === true) return <Navigate to="/client-setup" replace />
    if (profile?.role === 'client') return <Navigate to="/portal" replace />
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

/** Página inicial pública: mostra a landing para visitantes,
 *  redireciona usuários autenticados para a área correta. */
function HomeGate() {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) {
    if (user.user_metadata?.needs_password_setup === true) return <Navigate to="/client-setup" replace />
    if (profile?.role === 'client') return <Navigate to="/portal" replace />
    return <Navigate to="/dashboard" replace />
  }
  return <LandingPage />
}

/** Exige autenticação. Redireciona client-role para o portal. */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (profile?.role === 'client') return <Navigate to="/portal" replace />
  return <>{children}</>
}

/** Exige assinatura ativa. Redireciona para /planos se não pago. */
function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { data: subData, isLoading, isFetched } = useSubscription()

  // Aguarda até ter uma resposta real do servidor antes de decidir qualquer coisa
  if (isLoading || !isFetched) return null

  // Só redireciona depois de ter certeza que a assinatura está inativa
  if (!subData || !subData.isActive) {
    return <Navigate to="/planos" replace />
  }

  return <>{children}</>
}

/** Se já tem assinatura PAGA ativa, vai direto para o app em vez de mostrar /planos.
 *  Usuários em trial podem acessar /planos para assinar. */
function ActivePlanRedirect({ children }: { children: React.ReactNode }) {
  const { data: subData, isLoading, isFetched } = useSubscription()
  if (isLoading || !isFetched) return null
  // Só redireciona quem já pagou (status=active). Trial não bloqueia.
  if (subData?.subscription.status === 'active') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/** Protege rotas do portal — agency role é redirecionado para / */
function PortalGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (profile && profile.role !== 'client') return <Navigate to="/dashboard" replace />
  // Se o cliente ainda não criou senha (chegou via convite), vai para setup
  if (user.user_metadata?.needs_password_setup === true) {
    return <Navigate to="/client-setup" replace />
  }
  return <>{children}</>
}

// ── Rotas ─────────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Páginas públicas sem auth */}
      <Route path="/formulario/:token" element={<WeeklyFormPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms"   element={<TermsPage />} />

      {/* Página de vendas pública — visitante vê a landing, logado vai para o app */}
      <Route path="/" element={<HomeGate />} />

      {/* Receptor de links do Supabase (convite, reset de senha, magic link) */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Públicas */}
      <Route path="/login"           element={<GuestGuard><Login /></GuestGuard>} />
      <Route path="/register"        element={<GuestGuard><Register /></GuestGuard>} />
      <Route path="/forgot-password" element={<GuestGuard><ForgotPassword /></GuestGuard>} />
      <Route path="/reset-password"  element={<ResetPassword />} />
      <Route path="/client-register" element={<GuestGuard><ClientRegister /></GuestGuard>} />
      {/* Sem GuestGuard: cliente chega aqui autenticado via link de convite */}
      <Route path="/client-setup" element={<ClientSetup />} />

      {/* Portal do cliente */}
      <Route path="/portal" element={<PortalGuard><PortalDashboard /></PortalGuard>} />

      {/* Portal do colaborador — rota pública, sem autenticação */}
      <Route path="/colaborador/:token" element={<CollaboratorPortal />} />

      {/* Página de planos — auth obrigatória; se já tem plano ativo, redireciona */}
      <Route path="/planos" element={<AuthGuard><ActivePlanRedirect><Pricing /></ActivePlanRedirect></AuthGuard>} />

      {/* App da agência — auth + assinatura ativa obrigatórias */}
      <Route element={<AuthGuard><SubscriptionGuard><Layout /></SubscriptionGuard></AuthGuard>}>
        <Route path="/dashboard"     element={<Dashboard />} />
        <Route path="/clients"       element={<ClientList />} />
        <Route path="/clients/new"   element={<ClientForm />} />
        <Route path="/clients/:id"   element={<ClientProfile />} />
        <Route path="/clients/:id/edit" element={<ClientForm />} />
        <Route path="/feed"          element={<FeedOrganizer />} />
        <Route path="/content"       element={<Navigate to="/dashboard" replace />} />
        <Route path="/history"       element={<Navigate to="/dashboard" replace />} />
        <Route path="/history/:id"   element={<Navigate to="/dashboard" replace />} />
        <Route path="/planner"       element={<Planner />} />
        <Route path="/tasks"         element={<Tasks />} />
        <Route path="/notes"         element={<Notes />} />
        <Route path="/library"       element={<Library />} />
        <Route path="/financial"     element={<Financial />} />
        <Route path="/ai"            element={<AIPage />} />
        <Route path="/equipe"        element={<TeamPage />} />
        <Route path="/instagram"     element={<InstagramPage />} />
        <Route path="/assinatura"    element={<Subscription />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  if (!isConfigured) return <Setup />

  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
