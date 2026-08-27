import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { OnboardingTour, type TourStep } from './OnboardingTour'
import { useTourVisibility } from './useTourVisibility'
import { useHopAuth } from './useHopAuth'
import { useHopTheme } from './useHopTheme'
import { HopToastProvider } from './ToastContext'

const NAV_ITEMS = [
  { to: '/hop/facility', label: 'Overview', end: true, icon: '📊' },
  { to: '/hop/facility/heatmap', label: 'Heat map', end: false, icon: '🌡️' },
  { to: '/hop/facility/requests-stats', label: 'Request stats', end: false, icon: '📈' },
  { to: '/hop/facility/retention', label: 'Retention', end: false, icon: '💰' },
  { to: '/hop/facility/my-requests', label: 'My requests', end: false, icon: '📋' },
] as const

const FACILITY_TOUR_STEPS: TourStep[] = [
  {
    icon: '👋',
    title: 'Welcome to your Facility dashboard',
    body: 'See the results of having a concierge in the building — request volume, morale trends, and cost savings, all in one place.',
  },
  {
    icon: '🌡️',
    title: 'Heat map',
    body: 'See when stress levels rise across a shift, broken down by department where that data is available, so you can be proactive instead of reactive.',
  },
  {
    icon: '📈',
    title: 'Request stats',
    body: 'Daily, weekly, monthly, and yearly request volume — a direct signal of how much your staff are actually using HOP.',
  },
  {
    icon: '💰',
    title: 'Retention',
    body: 'Log a retention save when you believe concierge services helped keep a staff member — the running total shows the cost-savings impact.',
  },
  {
    icon: '📋',
    title: 'My requests',
    body: 'You also have your own HOP member account under this login — submit and track your own requests here without leaving the portal.',
  },
]

export function HopFacilityLayout() {
  const { user, logout } = useHopAuth()
  const { theme, toggleTheme } = useHopTheme()
  const navigate = useNavigate()
  const tour = useTourVisibility('hop-tour-facility')

  async function handleLogout() {
    await logout()
    navigate('/hop/admin/login', { replace: true })
  }

  return (
    <HopToastProvider>
      <div className="hop-shell hop-shell--facility">
        <aside className="hop-shell__sidebar">
          <div className="hop-shell__brand">
            <span className="hop-shell__brand-mark">✦</span>
            <span>HOP Facility</span>
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
        <OnboardingTour open={tour.open} onClose={tour.close} steps={FACILITY_TOUR_STEPS} />
      </div>
    </HopToastProvider>
  )
}
