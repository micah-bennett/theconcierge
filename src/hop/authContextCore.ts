import { createContext } from 'react'
import type { HopUser } from './api'

export type AuthContextValue = {
  user: HopUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<HopUser>
  signup: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<HopUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
