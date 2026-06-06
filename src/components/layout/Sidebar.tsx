import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, Calendar, CheckSquare, BookOpen,
  LogOut, ChevronLeft, ChevronRight, Wallet, NotebookPen, LayoutGrid, Sparkles, Zap, UserCheck, Instagram, HardDrive,
} from 'lucide-react'
import { cn } from '@/utils/formatters'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { useAIUsage } from '@/hooks/useAIUsage'
import { useStorageUsage } from '@/hooks/useStorageUsage'

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
  { href: '/ai',        icon: Sparkles,         label: 'IA Copilot', highlight: true },
]

// ── Initials avatar ───────────────────────────────────────────────────────────

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-[13px] font-bold select-none"
      style={{ background: 'linear-gradient(135deg, #29457a 0%, #16284d 100%)' }}
    >
      {initials}
    </div>
  )
}

// ── Brand mark ────────────────────────────────────────────────────────────────

function BrandMark({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5 flex-1 min-w-0">
      <img
        src="/logo-icon.png"
        alt="StatusMedia"
        className="flex-shrink-0 w-8 h-8 object-contain select-none"
        draggable={false}
      />
      {!collapsed && (
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          className="min-w-0"
        >
          <span className="block text-[15px] font-bold leading-none tracking-tight whitespace-nowrap text-white">
            Status<span className="text-[#6f93c9]">Media</span>
          </span>
          <span className="block text-[10px] whitespace-nowrap mt-0.5 tracking-wide text-[#64748b]">
            Organize. Produza. Escale.
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
  const { data: storage }          = useStorageUsage()

  const planName  = subData?.plan.name ?? 'Free'
  const aiUsed    = usage?.requests ?? 0
  const aiLimit   = usage?.limit    ?? 50
  const aiPct     = Math.min(100, Math.round((aiUsed / aiLimit) * 100))
  const aiWarning = aiPct >= 80

  const stUsedGB  = storage?.usedGB  ?? 0
  const stLimitGB = storage?.limitGB ?? 10
  const stPct     = Math.min(100, Math.round((stUsedGB / stLimitGB) * 100))
  const stWarning = stPct >= 80
  const stLabel   = stUsedGB < 1 ? `${(stUsedGB * 1024).toFixed(0)} MB` : `${stUsedGB.toFixed(1)} GB`

  // Fecha sidebar mobile ao mudar de rota
  useEffect(() => {
    onMobileClose?.()
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.aside
      animate={{ width: collapsed ? 56 : 220 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative flex flex-col h-full overflow-hidden flex-shrink-0"
      style={{ background: '#050816' }}
    >
      {/* ── Brand header ── */}
      <div className="flex items-center h-14 px-3.5 border-b border-[#1e2535]">
        <BrandMark collapsed={collapsed} />
      </div>

      {/* ── Nav ── */}
      <nav
        className="flex-1 py-1.5 px-2 space-y-0.5 overflow-y-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {navItems.map((item) => {
          const active =
            location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href))
          const isAI = 'highlight' in item && item.highlight

          // IA Copilot — não ativo
          if (isAI && !active) {
            return (
              <Link key={item.href} to={item.href}>
                <div
                  title={collapsed ? item.label : undefined}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[13px] transition-all duration-150 group"
                  style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(29,78,216,0.10) 100%)', border: '1px solid rgba(37,99,235,0.25)' }}
                >
                  <item.icon className="w-[15px] h-[15px] flex-shrink-0 text-[#2563EB]" />
                  {!collapsed && (
                    <>
                      <span className="whitespace-nowrap text-[#60A5FA] font-medium flex-1">
                        {item.label}
                      </span>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none text-white"
                        style={{ background: 'linear-gradient(135deg, #29457a 0%, #16284d 100%)' }}
                      >
                        novo
                      </span>
                    </>
                  )}
                </div>
              </Link>
            )
          }

          // Item ativo
          if (active) {
            return (
              <Link key={item.href} to={item.href}>
                <div
                  title={collapsed ? item.label : undefined}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[13px] font-semibold transition-all duration-150"
                  style={{ background: 'linear-gradient(135deg, #29457a 0%, #16284d 100%)' }}
                >
                  <item.icon className="w-[15px] h-[15px] flex-shrink-0 text-white" />
                  {!collapsed && (
                    <span className="whitespace-nowrap text-white">{item.label}</span>
                  )}
                </div>
              </Link>
            )
          }

          // Item normal inativo
          return (
            <Link key={item.href} to={item.href}>
              <div
                title={collapsed ? item.label : undefined}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[13px] transition-all duration-150 group text-[#94a3b8] hover:text-white hover:bg-[#161b2e]"
              >
                <item.icon className="w-[15px] h-[15px] flex-shrink-0 text-[#475569] group-hover:text-white transition-colors" />
                {!collapsed && (
                  <span className="whitespace-nowrap">{item.label}</span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* ── Plano + uso de IA + Armazenamento ── */}
      <div className="px-2 pb-1 flex-shrink-0">
        <Link to="/assinatura">
          <div
            className="rounded-xl px-2.5 py-2 transition-colors hover:bg-[#161b2e]"
            style={{ background: '#111827', border: '1px solid #1e2535' }}
          >
            {!collapsed ? (
              <div className="space-y-2">
                {/* IA */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Zap className={`w-3 h-3 ${aiWarning ? 'text-amber-400' : 'text-[#6366f1]'}`} />
                      <span className={`text-[11px] font-semibold ${aiWarning ? 'text-amber-400' : 'text-white'}`}>
                        {planName}
                      </span>
                    </div>
                    <span className={`text-[10px] ${aiWarning ? 'text-amber-400' : 'text-[#64748b]'}`}>
                      {aiUsed}/{aiLimit} IA
                    </span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1e2535' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${aiPct}%`,
                        background: aiPct >= 90 ? '#ef4444' : aiPct >= 70 ? '#F5A623' : 'linear-gradient(90deg, #2563EB, #1D4ED8)',
                      }}
                    />
                  </div>
                </div>
                {/* Storage */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <HardDrive className={`w-3 h-3 ${stWarning ? 'text-amber-400' : 'text-[#60a5fa]'}`} />
                      <span className="text-[10px] text-[#64748b]">Armazenamento</span>
                    </div>
                    <span className={`text-[10px] ${stWarning ? 'text-amber-400' : 'text-[#64748b]'}`}>
                      {stLabel}/{stLimitGB} GB
                    </span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1e2535' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${stPct}%`,
                        background: stPct >= 90 ? '#ef4444' : stPct >= 70 ? '#f59e0b' : '#2563eb',
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <Zap className={`w-[15px] h-[15px] ${aiWarning ? 'text-amber-400' : 'text-[#6366f1]'}`} />
                <HardDrive className={`w-[15px] h-[15px] ${stWarning ? 'text-amber-400' : 'text-[#60a5fa]'}`} />
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* ── Sair ── */}
      <div className="px-2 pb-2 pt-1 border-t border-[#1e2535] flex-shrink-0">
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[13px] text-[#64748b] hover:bg-[#161b2e] hover:text-white transition-colors duration-150"
        >
          <LogOut className="w-[15px] h-[15px] flex-shrink-0 text-[#475569]" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>

      {/* ── Botão colapsar (oculto no mobile) ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 z-10 w-6 h-6 rounded-full hidden md:flex items-center justify-center text-[#64748b] hover:text-white transition-colors shadow-lg"
        style={{ background: '#1e2535', border: '1px solid #2d3748' }}
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  )
}
