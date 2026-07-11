import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useHopAuth } from './useHopAuth'
import { useHopTheme } from './useHopTheme'

const NAV_ITEMS = [
  { to: '/hop/app', label: 'Dashboard', end: true },
  { to: '/hop/app/requests', label: 'Requests', end: false },
  { to: '/hop/app/integrations', label: 'Integrations', end: false },
  { to: '/hop/app/profile', label: 'Profile', end: false },
] as const

export function HopAppLayout() {
  const { user, logout } = useHopAuth()
  const { theme, toggleTheme } = useHopTheme()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/hop/login', { replace: true })
  }

  return (
    <div className="hop-shell">
      <aside className="hop-shell__sidebar">
        <div className="hop-shell__brand">HOP</div>
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
