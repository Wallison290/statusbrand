import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — fixed overlay on mobile, static on md+ */}
      <div
        className={`
          fixed md:relative inset-y-0 left-0 z-40 md:z-auto h-full
          transition-transform duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <Sidebar onMobileClose={() => setMobileOpen(false)} />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar — only visible below md */}
        <div className="flex md:hidden items-center h-12 px-4 bg-[#0f0f0f] border-b border-white/10 flex-shrink-0 gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Abrir menu"
          >
            <Menu className="w-4 h-4 text-white/70" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-white/15 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-[8px] select-none">SB</span>
            </div>
            <span
              className="text-[13px] font-semibold text-white tracking-tight"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              Status<span style={{ fontWeight: 700 }}>Brand</span>
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
