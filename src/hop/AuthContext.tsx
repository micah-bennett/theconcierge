import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from './authContextCore'
import { hopLogin, hopLogout, hopMe, hopSignup, hopUpdateProfile, type HopUser } from './api'

export function HopAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<HopUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { user: current } = await hopMe()
      setUser(current)
    } catch {
      setUser(null)
    }
  }, [])

  const loadInitialSession = useCallback(async () => {
    await refresh()
    setLoading(false)
  }, [refresh])

  useEffect(() => {
    // Session bootstrap on mount necessarily sets state once the /me request settles;
    // there's no external-system subscription to defer to here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInitialSession()
  }, [loadInitialSession])

  const login = useCallback(async (email: string, password: string) => {
    const { user: signedIn } = await hopLogin({ email, password })
    setUser(signedIn)
    return signedIn
  }, [])

  const signup = useCallback(
    async (data: { email: string; password: string; firstName: string; lastName: string }) => {
      const { user: created } = await hopSignup(data)
      setUser(created)
      return created
    },
    [],
  )

  const logout = useCallback(async () => {
    await hopLogout()
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (data: { firstName: string; lastName: string; phone: string }) => {
    const { user: updated } = await hopUpdateProfile(data)
    setUser(updated)
    return updated
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, refresh, updateProfile }),
    [user, loading, login, signup, logout, refresh, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
