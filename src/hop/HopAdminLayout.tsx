import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useHopAuth } from './useHopAuth'
import { useHopTheme } from './useHopTheme'

const NAV_ITEMS = [
  { to: '/hop/admin', label: 'Overview', end: true },
  { to: '/hop/admin/users', label: 'Users', end: false },
  { to: '/hop/admin/requests', label: 'Requests', end: false },
  { to: '/hop/admin/integrations', label: 'Integrations', end: false },
] as const

export function HopAdminLayout() {
  const { user, logout } = useHopAuth()
  const { theme, toggleTheme } = useHopTheme()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/hop/admin/login', { replace: true })
  }

  return (
    <div className="hop-shell hop-shell--admin">
      <aside className="hop-shell__sidebar">
        <div className="hop-shell__brand">HOP admin</div>
        <nav className="hop-shell__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `hop-shell__nav-link${isActive ? ' hop-shell__nav-link--active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hop-shell__user">
          <span className="hop-shell__user-name">
            {user?.firstName} {user?.lastName}
          </span>
          <button
            type="button"
            className="hop-shell__theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
          </button>
          <button type="button" className="hop-shell__logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="hop-shell__content">
        <Outlet />
      </main>
    </div>
  )
}
