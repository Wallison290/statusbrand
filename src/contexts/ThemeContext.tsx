import { createContext, useContext, useState, useEffect } from 'react'

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

  // Sync CSS custom properties with the DOM so all pages respond automatically
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

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
