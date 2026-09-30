import { useCallback, useEffect, useRef, useState, type Ref } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const LOGO_IMAGE = '/logo-mark-white.png?v=1'

/** Single source of truth for both the desktop tab row and the mobile drawer. */
const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/personal-services', label: 'Personal services' },
  { to: '/hop', label: 'HOP' },
  { to: '/plans', label: 'Plans' },
  { to: '/contact', label: 'Contact' },
] as const

const FOCUSABLE = 'a[href], button:not([disabled])'

/**
 * The site header.
 *
 * `ref` must land on the <header> element itself — App.tsx keeps a
 * ResizeObserver on it and publishes its height as `--site-header-h`, which
 * `.slides` padding-top, html's scroll-padding-top and several
 * scroll-margin-top rules all depend on.
 *
 * Two consequences, both load-bearing:
 *  1. The drawer is a SIBLING of <header>, not a child, and is position:fixed —
 *     if it rendered inside, opening it would inflate the measured height and
 *     shove the whole page down.
 *  2. The scrolled/unscrolled states differ only in background, border and
 *     shadow — never height or padding — so the observer never re-fires
 *     mid-scroll.
 */
export function SiteHeader({ ref }: { ref?: Ref<HTMLElement> }) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  // Only the homepage has a full-bleed hero for the header to float over.
  // Everywhere else it stays solid from the start.
  const overHero = location.pathname === '/'

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  // Close the drawer on any navigation — including a browser Back press while
  // it's open, which the links' own onClick can't catch and which would
  // otherwise strand the user behind a locked-scroll overlay. This is React's
  // "adjust state during render" pattern rather than an effect, so it resolves
  // before paint instead of causing a second render.
  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setMenuOpen(false)
  }

  useEffect(() => {
    // Off the homepage the header is always solid, so there's nothing to track
    // and `scrolled` is never read (see headerClass below).
    if (!overHero) return

    let frame = 0
    const update = () => {
      frame = 0
      setScrolled(window.scrollY > 80)
    }
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    // Via rAF rather than a direct call, so the initial sync doesn't set state
    // synchronously inside the effect body.
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.cancelAnimationFrame(frame)
    }
  }, [overHero])

  // Drawer: scroll lock, Escape to close, and a focus trap.
  useEffect(() => {
    if (!menuOpen) return

    const { body } = document
    const previousOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        toggleRef.current?.focus()
        return
      }
      if (event.key !== 'Tab') return

      const items = drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!items?.length) return

      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      body.style.overflow = previousOverflow
    }
  }, [menuOpen])

  const headerClass = [
    'site-header',
    overHero ? 'site-header--over-hero' : '',
    scrolled || !overHero ? 'site-header--solid' : '',
    menuOpen ? 'site-header--menu-open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <header ref={ref} className={headerClass}>
        <Link className="site-header__brand" to="/" aria-label="The Concierge — home">
          <img
            className="site-header__brand-logo"
            src={LOGO_IMAGE}
            alt=""
            width={80}
            height={80}
            decoding="async"
          />
          <span className="site-header__brand-text">
            <span className="site-header__brand-name">The Concierge</span>
            <span className="site-header__brand-tag">People · Support · A Better Tomorrow</span>
          </span>
        </Link>

        <nav className="site-header__nav site-header__nav--tabs" aria-label="Primary">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : undefined}
              className={({ isActive }) =>
                `site-header__nav-tab${isActive ? ' site-header__nav-tab--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="site-header__actions">
          <NavLink
            to="/request"
            className={({ isActive }) =>
              `site-header__request${isActive ? ' site-header__request--active' : ''}`
            }
          >
            Request Service
          </NavLink>
          <button
            ref={toggleRef}
            type="button"
            className="site-header__burger"
            aria-expanded={menuOpen}
            aria-controls="site-nav-drawer"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          </button>
        </div>
      </header>

      {/* Sibling of <header> on purpose — see the note on this component. */}
      <div
        id="site-nav-drawer"
        ref={drawerRef}
        className={`site-drawer${menuOpen ? ' site-drawer--open' : ''}`}
        hidden={!menuOpen}
      >
        <nav className="site-drawer__nav" aria-label="Mobile">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : undefined}
              className={({ isActive }) =>
                `site-drawer__link${isActive ? ' site-drawer__link--active' : ''}`
              }
              onClick={closeMenu}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Link className="site-drawer__cta" to="/request" onClick={closeMenu}>
          Request Service
        </Link>
      </div>
    </>
  )
}
