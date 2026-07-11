import { createContext } from 'react'

export type HopTheme = 'dark' | 'light'

export type ThemeContextValue = {
  theme: HopTheme
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
