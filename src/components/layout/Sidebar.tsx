import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, Calendar, CheckSquare, BookOpen,
  LogOut, ChevronLeft, ChevronRight, Wallet, NotebookPen, LayoutGrid, Sparkles, Zap, UserCheck, Instagram,
} from 'lucide-react'
import { cn } from '@/utils/formatters'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { useAIUsage } from '@/hooks/useAIUsage'

const navItems = [
  { href: '/',          icon: LayoutDashboard, label: 'Dashboard'      },
  { href: '/clients',   icon: Users,            label: 'Clientes'       },
  { href: '/feed',      icon: LayoutGrid,       label: 'Feed do Perfil' },
  { href: '/planner',   icon: Calendar,         label: 'Planejamento'   },
  { href: '/instagram', icon: Instagram,        label: 'Instagram'      },
  { href: '/tasks',     icon: CheckSquare,      label: 'Tarefas'        },
  { href: '/notes',     icon: NotebookPen,      label: 'Notas'          },
  { href: '/library',   icon: BookOpen,         label: 'Biblioteca'     },
  { href: '/financial', icon: Wallet,           label: 'Financeiro'     },
  { href: '/equipe',    icon: UserCheck,        label: 'Equipe'         },
  { href: '/ai',        icon: Sparkles,         label: 'IA Copilot',  highlight: true },
]

// ── Kairo Hub logo mark ───────────────────────────────────────────────────────

function BrandMark({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5 flex-1 min-w-0">
      <div
        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden"
        style={{
          WebkitMaskImage: `url('/logo-icon.png')`,
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskImage: `url('/logo-icon.png')`,
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #3b82f6 100%)',
        }}
      />

      {!collapsed && (
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          className="leading-none min-w-0"
        >
          <span
            className="block text-[13px] font-semibold text-[#0f0f0f] tracking-tight whitespace-nowrap"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            Kairo<span style={{ fontFamily: 'inherit', fontWeight: 700 }}>Hub</span>
          </span>
        </motion.div>
      )}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  onMobileClose?: () => void
}

export function Sidebar({ onMobileClose }: SidebarProps) {
  const location  = useLocation()
  const { signOut, profile, user } = useAuth()
  const [collapsed, setCollapsed]  = useState(false)
  const { data: subData }          = useSubscription()
  const { data: usage }            = useAIUsage(user?.id)

  const planName   = subData?.plan.name ?? 'Free'
  const aiUsed     = usage?.requests ?? 0
  const aiLimit    = usage?.limit    ?? 50
  const aiPct      = Math.min(100, Math.round((aiUsed / aiLimit) * 100))
  const aiWarning  = aiPct >= 80

  // Close mobile sidebar on route change
  useEffect(() => {
    onMobileClose?.()
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.aside
      animate={{ width: collapsed ? 56 : 220 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative flex flex-col h-full bg-white border-r border-[#e8e8e8] overflow-hidden flex-shrink-0"
    >
      {/* Brand header */}
      <div className="flex items-center h-14 px-3.5 border-b border-[#e8e8e8]">
        <BrandMark collapsed={collapsed} />
      </div>

      {/* Nav */}
      <nav
        className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {navItems.map((item) => {
          const active =
            location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href))
          const isAI = 'highlight' in item && item.highlight

          // Estilo especial para o item de IA
          if (isAI && !active) {
            return (
              <Link key={item.href} to={item.href}>
                <div
                  title={collapsed ? item.label : undefined}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[13px] transition-all duration-150 group bg-gradient-to-r from-[#f5f3ff] to-[#ede9fe] border border-[#ddd6fe] hover:from-[#ede9fe] hover:to-[#ddd6fe]"
                >
                  <item.icon
                    className="w-[15px] h-[15px] flex-shrink-0 text-[#6366f1]"
                  />
                  {!collapsed && (
                    <span className="whitespace-nowrap text-[#4f46e5] font-medium">
                      {item.label}
                    </span>
                  )}
                  {!collapsed && (
                    <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#6366f1] leading-none" style={{ color: '#ffffff' }}>
                      novo
                    </span>
                  )}
                </div>
              </Link>
            )
          }

          return (
            <Link key={item.href} to={item.href}>
              <div
                title={collapsed ? item.label : undefined}
                style={active ? { color: '#ffffff' } : undefined}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[13px] transition-all duration-150 group',
                  active
                    ? 'bg-[#0f0f0f] font-medium'
                    : 'text-[#737373] hover:bg-[#f5f5f5] hover:text-[#0f0f0f]'
                )}
              >
                <item.icon
                  style={active ? { color: '#ffffff' } : undefined}
                  className={cn(
                    'w-[15px] h-[15px] flex-shrink-0 transition-colors',
                    active ? '' : 'text-[#b0b0b0] group-hover:text-[#737373]'
                  )}
                />
                {!collapsed && (
                  <span style={active ? { color: '#ffffff' } : undefined} className="whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Assinatura + uso da IA */}
      <div className="px-2 pb-1">
        <Link to="/assinatura">
          <div className={`rounded-xl px-2.5 py-2 transition-colors ${
            aiWarning ? 'bg-amber-50 border border-amber-200' : 'bg-[#fafafa] hover:bg-[#f5f5f5]'
          }`}>
            {!collapsed ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Zap className={`w-3 h-3 ${aiWarning ? 'text-amber-500' : 'text-[#94a3b8]'}`} />
                    <span className={`text-[11px] font-semibold ${aiWarning ? 'text-amber-700' : 'text-[#0f0f0f]'}`}>
                      {planName}
                    </span>
                  </div>
                  <span className={`text-[10px] ${aiWarning ? 'text-amber-600' : 'text-[#a0a0a0]'}`}>
                    {aiUsed}/{aiLimit} IA
                  </span>
                </div>
                <div className="h-1 rounded-full bg-[#e8e8e8] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      aiPct >= 90 ? 'bg-red-500' : aiPct >= 70 ? 'bg-amber-400' : 'bg-[#0f0f0f]'
                    }`}
                    style={{ width: `${aiPct}%` }}
                  />
                </div>
              </div>
            ) : (
              <Zap className={`w-[15px] h-[15px] mx-auto ${aiWarning ? 'text-amber-500' : 'text-[#c0c0c0]'}`} />
            )}
          </div>
        </Link>
      </div>

      {/* Profile + sign out */}
      <div className="px-2 pb-2 pt-1 border-t border-[#f0f0f0] space-y-0.5">
        {!collapsed && profile && (
          <div className="px-2.5 py-1.5 rounded-xl bg-[#fafafa]">
            <p className="text-[12px] font-medium text-[#0f0f0f] truncate">
              {profile.full_name || 'Usuário'}
            </p>
            <p className="text-[11px] text-[#a0a0a0] truncate">{profile.email}</p>
          </div>
        )}
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[13px] text-[#a0a0a0] hover:bg-[#f5f5f5] hover:text-[#0f0f0f] transition-colors duration-150"
        >
          <LogOut className="w-[15px] h-[15px] flex-shrink-0 text-[#c0c0c0]" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>

      {/* Collapse toggle — hidden on mobile since sidebar is overlay */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 z-10 w-6 h-6 rounded-full border border-[#e8e8e8] bg-white hidden md:flex items-center justify-center text-[#a0a0a0] hover:text-[#0f0f0f] hover:border-[#d0d0d0] transition-colors shadow-sm"
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  )
}
