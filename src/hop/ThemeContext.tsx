import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ThemeContext, type HopTheme } from './themeContextCore'

// '-v2' since the 2026-10 HOP rebrand made light (the public site's look) the default. The old
// key's saved 'dark' choices predate the rebrand, so they're deliberately not carried over —
// everyone lands on light once and can still switch to the (now navy) dark theme.
const STORAGE_KEY = 'hop-theme-v2'

function readStoredTheme(): HopTheme {
  if (typeof window === 'undefined') return 'light'
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
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
