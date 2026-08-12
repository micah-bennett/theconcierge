import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { hopConciergeGetDutyStatus, hopConciergeSetDutyStatus } from './api'
import { OnboardingTour, type TourStep } from './OnboardingTour'
import { useTourVisibility } from './useTourVisibility'
import { useHopAuth } from './useHopAuth'
import { useHopTheme } from './useHopTheme'
import { HopToastProvider } from './ToastContext'

// Self-toggle on/off duty — feeds the admin's "working today" roster. See hop_duty_log in
// db/schema.sql and docs/hop/architecture.md ("Phase 1 quick wins").
function DutyToggle() {
  const [onDuty, setOnDuty] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    hopConciergeGetDutyStatus()
      .then((result) => setOnDuty(result.onDuty))
      .catch(() => setOnDuty(null))
  }, [])

  async function toggle() {
    if (onDuty === null) return
    setBusy(true)
    try {
      const result = await hopConciergeSetDutyStatus(!onDuty)
      setOnDuty(result.onDuty)
    } finally {
      setBusy(false)
    }
  }

  if (onDuty === null) return null

  return (
    <button
      type="button"
      className={`hop-duty-badge ${onDuty ? 'hop-duty-badge--on' : 'hop-duty-badge--off'}`}
      onClick={toggle}
      disabled={busy}
    >
      {onDuty ? 'On duty' : 'Off duty'}
    </button>
  )
}

const NAV_ITEMS = [
  { to: '/hop/concierge', label: 'Overview', end: true, icon: '📊' },
  { to: '/hop/concierge/requests', label: 'My requests', end: false, icon: '📋' },
  { to: '/hop/concierge/calendar', label: 'Calendar', end: false, icon: '📅' },
  { to: '/hop/concierge/profile', label: 'Profile', end: false, icon: '👤' },
] as const

const CONCIERGE_TOUR_STEPS: TourStep[] = [
  {
    icon: '👋',
    title: 'Welcome to ConciergeHub',
    body: 'Every request assigned to you lives here, from a first "Accept" to closing it out — nothing to chase, it all shows up in one place.',
  },
  {
    icon: '✅',
    title: 'Accept, then work the request',
    body: 'When something new lands, accept it first — that\'s your acknowledgment that you\'ve got it. Then move it through status and add dispatch notes as you go.',
  },
  {
    icon: '📞',
    title: 'Reach clients fast',
    body: 'Click a client\'s name on any request card for one-tap call, text, or email. Use "Call the office" up top to ring dispatch directly.',
  },
  {
    icon: '📅',
    title: 'Calendar & your profile',
    body: 'Calendar shows your upcoming and past requests. Your Profile is your showcase — headline, bio, specialties, and your rating from clients.',
  },
  {
    icon: '🟢',
    title: 'On/off duty',
    body: 'Toggle your duty status in the sidebar so admin knows you\'re working right now — it feeds the "working today" list they see.',
  },
]

export function HopConciergeLayout() {
  const { user, logout } = useHopAuth()
  const { theme, toggleTheme } = useHopTheme()
  const navigate = useNavigate()
  const tour = useTourVisibility('hop-tour-concierge')

  async function handleLogout() {
    await logout()
    navigate('/hop/admin/login', { replace: true })
  }

  return (
    <HopToastProvider>
      <div className="hop-shell hop-shell--concierge">
        <aside className="hop-shell__sidebar">
          <div className="hop-shell__brand">
            <span className="hop-shell__brand-mark">✦</span>
            <span>HOP ConciergeHub</span>
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
            <DutyToggle />
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
        <OnboardingTour open={tour.open} onClose={tour.close} steps={CONCIERGE_TOUR_STEPS} />
      </div>
    </HopToastProvider>
  )
}
