import { useContext } from 'react'
import { ThemeContext, type ThemeContextValue } from './themeContextCore'

export function useHopTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useHopTheme must be used within HopThemeProvider')
  return ctx
}
