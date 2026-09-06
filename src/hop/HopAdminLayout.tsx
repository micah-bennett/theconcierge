import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { OnboardingTour, type TourStep } from './OnboardingTour'
import { useTourVisibility } from './useTourVisibility'
import { useHopAuth } from './useHopAuth'
import { useHopTheme } from './useHopTheme'
import { HopToastProvider } from './ToastContext'

const NAV_ITEMS = [
  { to: '/hop/admin', label: 'Overview', end: true, icon: '📊' },
  { to: '/hop/admin/users', label: 'Users', end: false, icon: '👥' },
  { to: '/hop/admin/requests', label: 'Requests', end: false, icon: '📋' },
  { to: '/hop/admin/wellness', label: 'Wellness', end: false, icon: '❤️' },
  { to: '/hop/admin/integrations', label: 'Integrations', end: false, icon: '🔗' },
] as const

const ADMIN_TOUR_STEPS: TourStep[] = [
  {
    icon: '👋',
    title: 'Welcome, Admin',
    body: 'This is HOP\'s admin view — manage member accounts, dispatch service requests, and keep an eye on integrations, all from one place.',
  },
  {
    icon: '👥',
    title: 'Users',
    body: 'See every HOP member, and enable or disable an account if needed.',
  },
  {
    icon: '📋',
    title: 'Requests',
    body: 'Assign a staff member to a new request, move it through the workflow (received → assigned → in progress → completed), and log dispatch notes.',
  },
  {
    icon: '❤️',
    title: 'Wellness',
    body: 'A read-only view of voluntary staff check-ins — for triage and support, not individual performance tracking.',
  },
  {
    icon: '🔗',
    title: 'Integrations',
    body: 'See who\'s connected their Google Calendar across your HOP members.',
  },
]

export function HopAdminLayout() {
  const { user, logout } = useHopAuth()
  const { theme, toggleTheme } = useHopTheme()
  const navigate = useNavigate()
  const tour = useTourVisibility('hop-tour-admin')

  async function handleLogout() {
    await logout()
    navigate('/hop/admin/login', { replace: true })
  }

  return (
    <HopToastProvider>
      <div className="hop-shell hop-shell--admin">
        <aside className="hop-shell__sidebar">
          <div className="hop-shell__brand">
            <span className="hop-shell__brand-mark">✦</span>
            <span>HOP admin</span>
          </div>
          <nav className="hop-shell__nav">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `hop-shell__nav-link${isActive ? ' hop-shell__nav-link--active' : ''}`}
              >
                <span className="hop-shell__nav-link__icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="hop-shell__user">
            <span className="hop-shell__user-name">
              {user?.firstName} {user?.lastName}
            </span>
            <div className="hop-shell__utility-row">
              <button type="button" className="hop-shell__utility-btn" onClick={tour.reopen}>
                🧭 Quick tour
              </button>
              <button
                type="button"
                className="hop-shell__utility-btn"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
              </button>
              <button
                type="button"
                className="hop-shell__utility-btn hop-shell__logout"
                onClick={handleLogout}
              >
                🚪 Log out
              </button>
            </div>
          </div>
        </aside>
        <main className="hop-shell__content">
          <Outlet />
        </main>
        <OnboardingTour open={tour.open} onClose={tour.close} steps={ADMIN_TOUR_STEPS} />
      </div>
    </HopToastProvider>
  )
}
