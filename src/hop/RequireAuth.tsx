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

export function RequireConcierge() {
  const { user, loading } = useHopAuth()
  const location = useLocation()

  if (loading) return <div className="hop-app-loading">Loading…</div>
  if (!user) return <Navigate to="/hop/admin/login" replace state={{ from: location.pathname }} />
  if (user.role !== 'concierge') return <Navigate to="/hop/admin" replace />

  return <Outlet />
}

export function RequireFacility() {
  const { user, loading } = useHopAuth()
  const location = useLocation()

  if (loading) return <div className="hop-app-loading">Loading…</div>
  if (!user) return <Navigate to="/hop/admin/login" replace state={{ from: location.pathname }} />
  if (user.role !== 'facility') return <Navigate to="/hop/admin" replace />

  return <Outlet />
}

// Admin or concierge — for surfaces both ConciergeHub roles can see (e.g. request messaging).
export function RequireStaff() {
  const { user, loading } = useHopAuth()
  const location = useLocation()

  if (loading) return <div className="hop-app-loading">Loading…</div>
  if (!user) return <Navigate to="/hop/admin/login" replace state={{ from: location.pathname }} />
  if (user.role !== 'admin' && user.role !== 'concierge') return <Navigate to="/hop/login" replace />

  return <Outlet />
}
