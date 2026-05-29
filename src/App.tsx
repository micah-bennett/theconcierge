import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react'
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { SiteFooter } from './components/SiteFooter'
import { ContactPage } from './pages/ContactPage'
import { HomePage } from './pages/HomePage'
import { PersonalServicesPage } from './pages/PersonalServicesPage'
import { PlansPage } from './pages/PlansPage'
import './App.css'

const LOGO_IMAGE = '/logo-concierge.png'

const ConciergeRequestModal = lazy(() =>
  import('./components/ConciergeRequestModal').then((m) => ({
    default: m.ConciergeRequestModal,
  })),
)

const ConciergeChatBot = lazy(() =>
  import('./components/ConciergeChatBot').then((m) => ({ default: m.ConciergeChatBot })),
)

function ScrollToTop() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function AppRoutes() {
  const navigate = useNavigate()
  const location = useLocation()
  const [chatOpen, setChatOpen] = useState(false)
  const onRequestPage = location.pathname === '/request'
  const headerRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (location.pathname === '/' && location.hash === '#contact') {
      navigate('/contact', { replace: true })
    }
  }, [location.pathname, location.hash, navigate])

  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return

    const sync = () => {
      const h = Math.ceil(el.getBoundingClientRect().height)
      document.documentElement.style.setProperty('--site-header-h', `${h}px`)
    }

    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    window.addEventListener('resize', sync)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [])

  return (
    <div className="site">
      <ScrollToTop />
      <header ref={headerRef} className="site-header">
        <Link
          className="site-header__brand"
          to="/"
          aria-label="Hudson Valley Concierge Service — home"
        >
          <img
            className="site-header__brand-logo site-header__brand-logo--mark"
            src={LOGO_IMAGE}
            alt=""
            width={160}
            height={160}
            decoding="async"
          />
          <div className="site-header__brand-copy">
            <span className="site-header__brand-text">THE CONCIERGE</span>
            <p className="site-header__tagline">We Give You Your Time Back</p>
          </div>
        </Link>
        <nav className="site-header__nav site-header__nav--tabs" aria-label="Primary">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `site-header__nav-tab${isActive ? ' site-header__nav-tab--active' : ''}`
            }
          >
            Home
          </NavLink>
          <a
            className="site-header__nav-tab site-header__nav-tab--external"
            href="https://hvconcierge.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Part of the Hudson Valley Concierge Service network — main business site at hvconcierge.com (opens in a new tab)"
          >
            HVCS
          </a>
          <NavLink
            to="/personal-services"
            className={({ isActive }) =>
              `site-header__nav-tab site-header__nav-tab--long${isActive ? ' site-header__nav-tab--active' : ''}`
            }
          >
            Personal services
          </NavLink>
          <NavLink
            to="/plans"
            className={({ isActive }) =>
              `site-header__nav-tab${isActive ? ' site-header__nav-tab--active' : ''}`
            }
          >
            Plans
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              `site-header__nav-tab${isActive ? ' site-header__nav-tab--active' : ''}`
            }
          >
            Contact
          </NavLink>
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
        </div>
      </header>

      <Suspense fallback={null}>
        <ConciergeChatBot open={chatOpen} onOpenChange={setChatOpen} />
      </Suspense>

      {onRequestPage ? (
        <Suspense fallback={null}>
          <ConciergeRequestModal open onClose={() => navigate('/')} />
        </Suspense>
      ) : (
        <>
          <main className="slides">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/personal-services" element={<PersonalServicesPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <SiteFooter />
        </>
      )}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
