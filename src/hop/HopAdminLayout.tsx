import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { OnboardingTour, type TourStep } from './OnboardingTour'
import { useTourVisibility } from './useTourVisibility'
import { useHopAuth } from './useHopAuth'
import { useHopTheme } from './useHopTheme'
import { HopToastProvider } from './ToastContext'

const NAV_ITEMS = [
  { to: '/hop/admin', label: 'Overview', end: true, icon: '📊' },
  { to: '/hop/admin/feed', label: 'Feed', end: false, icon: '📣' },
  { to: '/hop/admin/accounts', label: 'Accounts', end: false, icon: '🧑‍💼' },
  { to: '/hop/admin/requests', label: 'Requests', end: false, icon: '📋' },
  { to: '/hop/admin/messages', label: 'Messages', end: false, icon: '💬' },
  { to: '/hop/admin/wellness', label: 'Wellness', end: false, icon: '❤️' },
  { to: '/hop/admin/integrations', label: 'Integrations', end: false, icon: '🔗' },
] as const

const ADMIN_TOUR_STEPS: TourStep[] = [
  {
    icon: '👋',
    title: 'Welcome to ConciergeHub Admin',
    body: 'Run dispatch from here: see who\'s working today, create concierge or member accounts, assign requests, and message members directly.',
  },
  {
    icon: '📣',
    title: 'The Feed',
    body: 'A shared feed with every role — members, concierges, and other admins all post and react here. A good place to check what\'s going on across the team.',
  },
  {
    icon: '🧑‍💼',
    title: 'Accounts',
    body: 'Create concierge, member, or Facility Admin accounts in one place — each gets an emailed invite with a permanent HOP number and a set-password link. Filter by role and enable or disable anyone from the same list.',
  },
  {
    icon: '📋',
    title: 'Requests',
    body: 'Assign a request to any admin or concierge, move it through the workflow, and log dispatch notes. Requester contact info and the assignee\'s rating both show right on the card.',
  },
  {
    icon: '💬',
    title: 'Messages',
    body: 'Message any HOP member directly — not tied to a specific request. Start a new conversation from a member\'s row on the Accounts page.',
  },
  {
    icon: '📊',
    title: 'Overview',
    body: 'Your dashboard shows HOP users, open requests, connected integrations, and — the "Working today" list — exactly who\'s on duty right now.',
  },
]

export function HopAdminLayout() {
  const { user, logout } = useHopAuth()
  const { theme, toggleTheme } = useHopTheme()
  const navigate = useNavigate()
  const tour = useTourVisibility('hop-tour-conciergehub-admin')

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
