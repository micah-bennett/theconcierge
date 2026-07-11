import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ServicesMegaMenu } from './ServicesMegaMenu'
import { MobileNavDrawer } from './MobileNavDrawer'

const LOGO_IMAGE = '/logo-mark-white.png?v=1'

export function SiteHeader() {
  const [servicesOpen, setServicesOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setServicesOpen(false)
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setServicesOpen(false)
        setDrawerOpen(false)
      }
    }
    document.addEventListener('click', onOutsideClick)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('click', onOutsideClick)
      document.removeEventListener('keydown', onEscape)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  return (
    <>
      <header className="mkt-nav">
        <Link className="mkt-nav__brand" to="/" aria-label="The Concierge — home">
          <img
            className="mkt-nav__brand-logo"
            src={LOGO_IMAGE}
            alt="The Concierge"
            width={68}
            height={68}
            decoding="async"
          />
          <span className="mkt-nav__brand-text">
            <span className="mkt-nav__brand-name">THE CONCIERGE</span>
            <span className="mkt-nav__brand-tag">Hudson Valley · NYC Metro</span>
          </span>
        </Link>

        <nav className="mkt-nav__links" aria-label="Primary">
          <a className="mkt-nav__link" href="/#problem">
            The Problem
          </a>
          <a className="mkt-nav__link" href="/#how">
            How It Works
          </a>

          <div className="mkt-nav__dropdown" ref={dropdownRef}>
            <button
              type="button"
              className="mkt-nav__link"
              aria-haspopup="true"
              aria-expanded={servicesOpen}
              onClick={() => setServicesOpen((v) => !v)}
            >
              Services
              <svg className="mkt-nav__caret" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
            <ServicesMegaMenu open={servicesOpen} onItemClick={() => setServicesOpen(false)} />
          </div>

          <NavLink
            className={({ isActive }) => `mkt-nav__link${isActive ? ' mkt-nav__link--active' : ''}`}
            to="/personal-services"
          >
            Personal Services
          </NavLink>
          <NavLink className={({ isActive }) => `mkt-nav__link${isActive ? ' mkt-nav__link--active' : ''}`} to="/plans">
            Plans
          </NavLink>
          <NavLink
            className={({ isActive }) => `mkt-nav__link${isActive ? ' mkt-nav__link--active' : ''}`}
            to="/contact"
          >
            Contact
          </NavLink>

          <Link className="mkt-nav__hop-pill" to="/hop/login">
            HOP
          </Link>
        </nav>

        <div className="mkt-nav__actions">
          <a className="mkt-btn mkt-btn-outline-cyan" href="/#request">
            Place a Request
          </a>
          <a className="mkt-btn mkt-btn-primary" href="/#relief">
            Book a Relief Call
          </a>
        </div>

        <button
          type="button"
          className="mkt-nav__toggle"
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
