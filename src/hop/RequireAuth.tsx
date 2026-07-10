import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useHopAuth } from './useHopAuth'

export function RequireAuth() {
  const { user, loading } = useHopAuth()
  const location = useLocation()

  if (loading) return <div className="hop-app-loading">Loading…</div>
  if (!user) return <Navigate to="/hop/login" replace state={{ from: location.pathname }} />

  return <Outlet />
}

export function RequireAdmin() {
  const { user, loading } = useHopAuth()
  const location = useLocation()

  if (loading) return <div className="hop-app-loading">Loading…</div>
  if (!user) return <Navigate to="/hop/admin/login" replace state={{ from: location.pathname }} />
  if (user.role !== 'admin') return <Navigate to="/hop/app" replace />

  return <Outlet />
}
