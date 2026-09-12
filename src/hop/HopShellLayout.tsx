import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { OnboardingTour, type TourStep } from './OnboardingTour'
import { useTourVisibility } from './useTourVisibility'
import { useHopAuth } from './useHopAuth'
import { useHopTheme } from './useHopTheme'
import { HopToastProvider } from './ToastContext'
import { HopIcon, type HopIconKey } from './icons'

export type HopNavItem = { to: string; label: string; end?: boolean; icon: HopIconKey }
export type HopNavGroup = { label?: string; items: readonly HopNavItem[] }

type Props = {
  /** Wordmark text next to the brand mark, e.g. "HOP" / "HOP admin". */
  brandLabel: string
  navGroups: readonly HopNavGroup[]
  tourSteps: readonly TourStep[]
  /** Per-role localStorage key for the onboarding tour — see useTourVisibility.ts. */
  tourKey: string
  /** Where "Log out" sends the user, e.g. '/hop/login' vs '/hop/admin/login'. */
  loginRedirect: string
  /** Modifier class for per-role accent theming, e.g. 'hop-shell--admin'. */
  roleClass?: string
  /** Extra content rendered in the sidebar between nav and the user/utility row (e.g. a duty toggle). */
  extraSidebarSlot?: ReactNode
  /** Extra content rendered at the shell's top level, outside <main> (e.g. the member AI widget). */
  afterContent?: ReactNode
}

// Shared shell for every HOP role (member today; admin, concierge, and facility on top of this
// same component as of the redesign — see docs/hop/architecture.md). Previously each role had its
// own near-identical copy of this file (sidebar/nav/user-row/content/tour) — this is the single
// place that markup now lives, parameterized by nav content and a few per-role bits. Also owns the
// mobile off-canvas drawer: below 720px the sidebar becomes a slide-in overlay instead of the old
// pure-CSS reflow-to-top-bar, so it needed real open/close state, which lives here.
export function HopShellLayout({
  brandLabel,
  navGroups,
  tourSteps,
  tourKey,
  loginRedirect,
  roleClass,
  extraSidebarSlot,
  afterContent,
}: Props) {
  const { user, logout } = useHopAuth()
  const { theme, toggleTheme } = useHopTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const tour = useTourVisibility(tourKey)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Close the drawer whenever the route changes (a nav click) rather than requiring a second tap.
  // Adjusted during render (React's recommended pattern for "state that depends on a prop
  // changing"), not in a useEffect — an effect here would fire *after* the new route has already
  // painted once with the drawer still open, then trigger a second render to close it.
  const [lastPathname, setLastPathname] = useState(location.pathname)
  if (location.pathname !== lastPathname) {
    setLastPathname(location.pathname)
    if (mobileNavOpen) setMobileNavOpen(false)
  }

  // Prevent the page behind the drawer from scrolling while it's open.
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileNavOpen])

  async function handleLogout() {
    await logout()
    navigate(loginRedirect, { replace: true })
  }

  return (
    <HopToastProvider>
      <div className={`hop-shell${roleClass ? ` ${roleClass}` : ''}`}>
        <header className="hop-shell__mobile-bar">
          <button
            type="button"
            className="hop-shell__mobile-menu-btn"
            aria-label="Open menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <HopIcon name="menu" size={22} />
          </button>
          <div className="hop-shell__brand">
            <span className="hop-shell__brand-mark">✦</span>
            <span>{brandLabel}</span>
          </div>
        </header>

        {mobileNavOpen && (
          <div
            className="hop-shell__backdrop"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside
          className={`hop-shell__sidebar${mobileNavOpen ? ' hop-shell__sidebar--open' : ''}`}
        >
          <div className="hop-shell__sidebar-head">
            <div className="hop-shell__brand">
              <span className="hop-shell__brand-mark">✦</span>
              <span>{brandLabel}</span>
            </div>
            <button
              type="button"
              className="hop-shell__mobile-close"
              aria-label="Close menu"
              onClick={() => setMobileNavOpen(false)}
            >
              <HopIcon name="close" size={20} />
            </button>
          </div>
          <nav className="hop-shell__nav">
            {navGroups.map((group) => (
              <div className="hop-shell__nav-group" key={group.label ?? group.items[0]?.to}>
                {group.label && <span className="hop-shell__nav-group-label">{group.label}</span>}
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `hop-shell__nav-link${isActive ? ' hop-shell__nav-link--active' : ''}`
                    }
                  >
                    <span className="hop-shell__nav-link__icon" aria-hidden="true">
                      <HopIcon name={item.icon} size={18} />
                    </span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
          {extraSidebarSlot}
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
        <OnboardingTour open={tour.open} onClose={tour.close} steps={tourSteps} />
        {afterContent}
      </div>
    </HopToastProvider>
  )
}
