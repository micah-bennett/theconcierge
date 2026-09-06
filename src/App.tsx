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
import { HopPage } from './pages/HopPage'
import { PersonalServicesPage } from './pages/PersonalServicesPage'
import { PlansPage } from './pages/PlansPage'
import { HopLoginPage } from './pages/hop/HopLoginPage'
import { HopSignupPage } from './pages/hop/HopSignupPage'
import { HopAdminLoginPage } from './pages/hop/HopAdminLoginPage'
import { HopForgotPasswordPage } from './pages/hop/HopForgotPasswordPage'
import { HopResetPasswordPage } from './pages/hop/HopResetPasswordPage'
import { HopDashboardPage } from './pages/hop/app/HopDashboardPage'
import { HopFeedPage } from './hop/feed/HopFeedPage'
import { HopRequestsPage } from './pages/hop/app/HopRequestsPage'
import { HopFamilyCarePage } from './pages/hop/app/HopFamilyCarePage'
import { HopWellnessPage } from './pages/hop/app/HopWellnessPage'
import { HopMessagesPage } from './pages/hop/app/HopMessagesPage'
import { HopIntegrationsPage } from './pages/hop/app/HopIntegrationsPage'
import { HopProfilePage } from './pages/hop/app/HopProfilePage'
import { HopAdminDashboardPage } from './pages/hop/admin/HopAdminDashboardPage'
import { HopAdminUsersPage } from './pages/hop/admin/HopAdminUsersPage'
import { HopAdminRequestsPage } from './pages/hop/admin/HopAdminRequestsPage'
import { HopAdminWellnessPage } from './pages/hop/admin/HopAdminWellnessPage'
import { HopAdminIntegrationsPage } from './pages/hop/admin/HopAdminIntegrationsPage'
import { HopAuthProvider } from './hop/AuthContext'
import { HopThemeProvider } from './hop/ThemeContext'
import { RequireAdmin, RequireAuth } from './hop/RequireAuth'
import { HopAppLayout } from './hop/HopAppLayout'
import { HopAdminLayout } from './hop/HopAdminLayout'
import { useSiteMotion } from './hooks/useSiteMotion'
import './App.css'
import './styles/hopApp.css'

const LOGO_IMAGE = '/logo-mark-white.png?v=1'

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
  useSiteMotion(location.pathname)
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

  const isHopAppRoute =
    location.pathname.startsWith('/hop/login') ||
    location.pathname.startsWith('/hop/signup') ||
    location.pathname.startsWith('/hop/admin') ||
    location.pathname.startsWith('/hop/app') ||
    location.pathname.startsWith('/hop/forgot-password') ||
    location.pathname.startsWith('/hop/reset-password')

  if (isHopAppRoute) {
    return (
      <HopThemeProvider>
        <HopAuthProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/hop/login" element={<HopLoginPage />} />
            <Route path="/hop/signup" element={<HopSignupPage />} />
            <Route path="/hop/admin/login" element={<HopAdminLoginPage />} />
            <Route path="/hop/forgot-password" element={<HopForgotPasswordPage />} />
            <Route path="/hop/reset-password" element={<HopResetPasswordPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/hop/app" element={<HopAppLayout />}>
                <Route index element={<HopDashboardPage />} />
                <Route path="feed" element={<HopFeedPage />} />
                <Route path="requests" element={<HopRequestsPage />} />
                <Route path="family-care" element={<HopFamilyCarePage />} />
                <Route path="wellness" element={<HopWellnessPage />} />
                <Route path="messages" element={<HopMessagesPage />} />
                <Route path="integrations" element={<HopIntegrationsPage />} />
                <Route path="profile" element={<HopProfilePage />} />
              </Route>
            </Route>
            <Route element={<RequireAdmin />}>
              <Route path="/hop/admin" element={<HopAdminLayout />}>
                <Route index element={<HopAdminDashboardPage />} />
                <Route path="users" element={<HopAdminUsersPage />} />
                <Route path="requests" element={<HopAdminRequestsPage />} />
                <Route path="wellness" element={<HopAdminWellnessPage />} />
                <Route path="integrations" element={<HopAdminIntegrationsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/hop/app" replace />} />
          </Routes>
        </HopAuthProvider>
      </HopThemeProvider>
    )
  }

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
            className="site-header__brand-logo"
            src={LOGO_IMAGE}
            alt="The Concierge"
            width={80}
            height={80}
            decoding="async"
          />
          <p className="site-header__brand-name">The Concierge</p>
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
            to="/hop"
            className={({ isActive }) =>
              `site-header__nav-tab${isActive ? ' site-header__nav-tab--active' : ''}`
            }
          >
            HOP
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
              <Route path="/hop" element={<HopPage />} />
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
