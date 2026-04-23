import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, Sparkles, Calendar, CheckSquare, BookOpen,
  LogOut, ChevronLeft, ChevronRight, History, Wallet,
} from 'lucide-react'
import { cn } from '@/utils/formatters'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { href: '/',          icon: LayoutDashboard, label: 'Dashboard'       },
  { href: '/clients',   icon: Users,            label: 'Clientes'        },
  { href: '/content',   icon: Sparkles,         label: 'Gerar Conteúdo'  },
  { href: '/history',   icon: History,          label: 'Histórico'       },
  { href: '/planner',   icon: Calendar,         label: 'Planejamento'    },
  { href: '/tasks',     icon: CheckSquare,      label: 'Tarefas'         },
  { href: '/library',   icon: BookOpen,         label: 'Biblioteca'      },
  { href: '/financial', icon: Wallet,           label: 'Financeiro'      },
]

// ── StatusBrand logo mark ─────────────────────────────────────────────────────

function BrandMark({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5 flex-1 min-w-0">
      <div className="flex-shrink-0 w-7 h-7 rounded-md bg-[#0f0f0f] flex items-center justify-center">
        <span className="text-white font-bold text-[11px] tracking-tight select-none">SB</span>
      </div>

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
            Status<span style={{ fontFamily: 'inherit', fontWeight: 700 }}>Brand</span>
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
  const { signOut, profile } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

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
      <nav className="flex-1 py-2.5 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active =
            location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href))

          return (
            <Link key={item.href} to={item.href}>
              <div
                title={collapsed ? item.label : undefined}
                style={active ? { color: '#ffffff' } : undefined}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-100 group sb-invert',
                  active
                    ? 'bg-[#0f0f0f] text-white'
                    : 'text-[#737373] hover:bg-[#f0f0f0] hover:text-[#0f0f0f]'
                )}
              >
                <item.icon
                  style={active ? { color: '#ffffff' } : undefined}
                  className={cn(
                    'w-[15px] h-[15px] flex-shrink-0 transition-colors',
                    active ? 'text-white' : 'text-[#a0a0a0] group-hover:text-[#0f0f0f]'
                  )}
                />
                {!collapsed && (
                  <span
                    style={active ? { color: '#ffffff' } : undefined}
                    className="whitespace-nowrap font-normal"
                  >
                    {item.label}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Profile + sign out */}
      <div className="p-2 border-t border-[#e8e8e8] space-y-0.5">
        {!collapsed && profile && (
          <div className="px-2.5 py-2 mb-0.5">
            <p className="text-[12px] font-medium text-[#0f0f0f] truncate">
              {profile.full_name || 'Usuário'}
            </p>
            <p className="text-[11px] text-[#a0a0a0] truncate">{profile.email}</p>
          </div>
        )}
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-[#a0a0a0] hover:bg-[#f0f0f0] hover:text-[#0f0f0f] transition-colors duration-100"
        >
          <LogOut className="w-[15px] h-[15px] flex-shrink-0" />
          {!collapsed && <span className="font-normal">Sair</span>}
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
