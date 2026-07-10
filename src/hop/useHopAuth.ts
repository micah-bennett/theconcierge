import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './authContextCore'

export function useHopAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useHopAuth must be used within HopAuthProvider')
  return ctx
}
