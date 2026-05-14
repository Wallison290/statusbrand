import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/toast'
import { Layout } from '@/components/layout/Layout'
import { useAuth } from '@/hooks/useAuth'
import { isConfigured } from '@/integrations/supabase/client'
import { Setup } from '@/pages/Setup'

import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { ForgotPassword } from '@/pages/auth/ForgotPassword'
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
import { PortalDashboard } from '@/pages/portal/PortalDashboard'

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0a0c11] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-pulse">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">Carregando...</p>
      </div>
    </div>
  )
}

// Redireciona usuários autenticados para a área correta conforme role
function GuestGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (user) {
    if (profile?.role === 'client') return <Navigate to="/portal" replace />
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

// Protege rotas da agência — client role é redirecionado para /portal
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (profile?.role === 'client') return <Navigate to="/portal" replace />
  return <>{children}</>
}

// Protege rotas do portal — agency role é redirecionado para /
function PortalGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (profile && profile.role !== 'client') return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<GuestGuard><Login /></GuestGuard>} />
      <Route path="/register" element={<GuestGuard><Register /></GuestGuard>} />
      <Route path="/forgot-password" element={<GuestGuard><ForgotPassword /></GuestGuard>} />

      {/* Portal do Cliente */}
      <Route path="/portal" element={<PortalGuard><PortalDashboard /></PortalGuard>} />

      {/* App da Agência */}
      <Route element={<AuthGuard><Layout /></AuthGuard>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<ClientList />} />
        <Route path="/clients/new" element={<ClientForm />} />
        <Route path="/clients/:id" element={<ClientProfile />} />
        <Route path="/clients/:id/edit" element={<ClientForm />} />
        <Route path="/feed" element={<FeedOrganizer />} />
        <Route path="/content" element={<Navigate to="/" replace />} />
        <Route path="/history" element={<Navigate to="/" replace />} />
        <Route path="/history/:id" element={<Navigate to="/" replace />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/library" element={<Library />} />
        <Route path="/financial" element={<Financial />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  if (!isConfigured) {
    return <Setup />
  }

  return (
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
