import { createContext, useContext, useState } from 'react'

interface ThemeCtx {
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeCtx>({ isDark: true, toggleTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('statusbrand-theme') !== 'light'
    } catch {
      return true
    }
  })

  // O atributo data-theme no <html> só é aplicado dentro do app autenticado
  // (veja Layout.tsx) — páginas públicas (landing, login, portal...) não devem
  // herdar a preferência de tema da agência; elas têm sua própria paleta fixa.

  function toggleTheme() {
    setIsDark(d => {
      const next = !d
      try { localStorage.setItem('statusbrand-theme', next ? 'dark' : 'light') } catch {}
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
