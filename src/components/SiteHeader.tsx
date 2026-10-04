import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { HopBrand } from './HopMark'

/** Single source of truth for the nav row (and its mobile drop-down below 920px). */
const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/how-it-works', label: 'How HOP Works' },
  { to: '/professionals', label: 'For Professionals' },
  { to: '/organizations', label: 'For Organizations' },
  { to: '/concierge', label: 'The Concierge' },
  { to: '/portal', label: 'HOP Portal' },
] as const

/**
 * The public-site header. Sticky, so nothing below needs to know its height.
 * Below 920px the nav collapses into a drop-down panel toggled by the ☰ button.
 */
export function SiteHeader() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)

  // Close the menu on any navigation, including browser Back. "Adjust state
  // during render" rather than an effect, so it resolves before paint.
  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setMenuOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      toggleRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <header className="hs-header">
      <div className="hs-container hs-nav">
        <Link className="hs-brand" to="/" aria-label="HOP Home">
          <HopBrand />
        </Link>
        <button
          ref={toggleRef}
          type="button"
          className="hs-nav__toggle"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          aria-controls="hs-nav-links"
          onClick={() => setMenuOpen((open) => !open)}
        >
          ☰
        </button>
        <nav
          id="hs-nav-links"
          className={`hs-nav__links${menuOpen ? ' hs-nav__links--open' : ''}`}
          aria-label="Main navigation"
        >
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : undefined}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Link className="hs-btn hs-btn--primary hs-btn--small hs-header__cta" to="/contact">
          Start a Conversation
        </Link>
      </div>
    </header>
  )
}
