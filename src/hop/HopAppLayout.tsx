import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { OnboardingTour, type TourStep } from './OnboardingTour'
import { useTourVisibility } from './useTourVisibility'
import { useHopAuth } from './useHopAuth'
import { useHopTheme } from './useHopTheme'

const NAV_ITEMS = [
  { to: '/hop/app', label: 'Dashboard', end: true, icon: '🏠' },
  { to: '/hop/app/requests', label: 'Requests', end: false, icon: '📋' },
  { to: '/hop/app/family-care', label: 'Family Care', end: false, icon: '👨‍👩‍👧' },
  { to: '/hop/app/wellness', label: 'Wellness', end: false, icon: '❤️' },
  { to: '/hop/app/messages', label: 'Messages', end: false, icon: '💬' },
  { to: '/hop/app/integrations', label: 'Integrations', end: false, icon: '🔗' },
  { to: '/hop/app/profile', label: 'Settings', end: false, icon: '⚙️' },
] as const

const MEMBER_TOUR_STEPS: TourStep[] = [
  {
    icon: '👋',
    title: 'Welcome to HOP',
    body: 'One place for anything you need during your shift — rides, meals, errands, wellness support, and family logistics. Ask once, a concierge takes it from there.',
  },
  {
    icon: '📋',
    title: 'Submit & track requests',
    body: 'Start a request from Dashboard or Requests. Watch it move through submitted → assigned → done in real time, and message your concierge right from the request.',
  },
  {
    icon: '❤️',
    title: 'Wellness & Family Care',
    body: 'Check in on how you’re doing on the Wellness page, or get help with childcare, eldercare, pet care, and more under Family Care.',
  },
  {
    icon: '⭐',
    title: 'Rate your concierge',
    body: 'Once a request is completed, rate the concierge who helped you. It shows on their profile and helps us pair you with great people.',
  },
  {
    icon: '⚙️',
    title: 'Messages & Settings',
    body: 'Message HOP Admin directly anytime from Messages. Add your phone number in Settings so your concierge can reach you by call or text.',
  },
]

export function HopAppLayout() {
  const { user, logout } = useHopAuth()
  const { theme, toggleTheme } = useHopTheme()
  const navigate = useNavigate()
  const tour = useTourVisibility('hop-tour-member')

  async function handleLogout() {
    await logout()
    navigate('/hop/login', { replace: true })
  }

  return (
    <div className="hop-shell">
      <aside className="hop-shell__sidebar">
        <div className="hop-shell__brand">
          <span className="hop-shell__brand-mark">✦</span>
          <span>HOP</span>
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
      <OnboardingTour open={tour.open} onClose={tour.close} steps={MEMBER_TOUR_STEPS} />
    </div>
  )
}
