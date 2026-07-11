import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ThemeContext, type HopTheme } from './themeContextCore'

const STORAGE_KEY = 'hop-theme'

function readStoredTheme(): HopTheme {
  if (typeof window === 'undefined') return 'dark'
  return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
}

export function HopThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<HopTheme>(readStoredTheme)

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      window.localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return (
    <ThemeContext.Provider value={value}>
      <div data-hop-theme={theme}>{children}</div>
    </ThemeContext.Provider>
  )
}
