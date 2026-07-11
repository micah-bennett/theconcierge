import { lazy, Suspense, useLayoutEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { SiteHeader } from './components/layout/SiteHeader'
import { SiteFooter } from './components/SiteFooter'
import { ContactPage } from './pages/ContactPage'
import { HomePage } from './pages/HomePage'
import { PersonalServicesPage } from './pages/PersonalServicesPage'
import { PlansPage } from './pages/PlansPage'
import { HopLoginPage } from './pages/hop/HopLoginPage'
import { HopSignupPage } from './pages/hop/HopSignupPage'
import { HopAdminLoginPage } from './pages/hop/HopAdminLoginPage'
import { HopDashboardPage } from './pages/hop/app/HopDashboardPage'
import { HopRequestsPage } from './pages/hop/app/HopRequestsPage'
import { HopIntegrationsPage } from './pages/hop/app/HopIntegrationsPage'
import { HopProfilePage } from './pages/hop/app/HopProfilePage'
import { HopAdminDashboardPage } from './pages/hop/admin/HopAdminDashboardPage'
import { HopAdminUsersPage } from './pages/hop/admin/HopAdminUsersPage'
import { HopAdminRequestsPage } from './pages/hop/admin/HopAdminRequestsPage'
import { HopAdminIntegrationsPage } from './pages/hop/admin/HopAdminIntegrationsPage'
import { HopAuthProvider } from './hop/AuthContext'
import { RequireAdmin, RequireAuth } from './hop/RequireAuth'
import { HopAppLayout } from './hop/HopAppLayout'
import { HopAdminLayout } from './hop/HopAdminLayout'
import { useSiteMotion } from './hooks/useSiteMotion'
import './App.css'
import './styles/site.css'
import './styles/hopApp.css'

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

  useLayoutEffect(() => {
    if (location.pathname === '/' && location.hash === '#contact') {
      navigate('/contact', { replace: true })
    }
  }, [location.pathname, location.hash, navigate])

  const isHopAppRoute =
    location.pathname.startsWith('/hop/login') ||
    location.pathname.startsWith('/hop/signup') ||
    location.pathname.startsWith('/hop/admin') ||
    location.pathname.startsWith('/hop/app')

  if (isHopAppRoute) {
    return (
      <HopAuthProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/hop/login" element={<HopLoginPage />} />
          <Route path="/hop/signup" element={<HopSignupPage />} />
          <Route path="/hop/admin/login" element={<HopAdminLoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/hop/app" element={<HopAppLayout />}>
              <Route index element={<HopDashboardPage />} />
              <Route path="requests" element={<HopRequestsPage />} />
              <Route path="integrations" element={<HopIntegrationsPage />} />
              <Route path="profile" element={<HopProfilePage />} />
            </Route>
          </Route>
          <Route element={<RequireAdmin />}>
            <Route path="/hop/admin" element={<HopAdminLayout />}>
              <Route index element={<HopAdminDashboardPage />} />
              <Route path="users" element={<HopAdminUsersPage />} />
              <Route path="requests" element={<HopAdminRequestsPage />} />
              <Route path="integrations" element={<HopAdminIntegrationsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/hop/app" replace />} />
        </Routes>
      </HopAuthProvider>
    )
  }

  return (
    <div className="site">
      <ScrollToTop />
      <SiteHeader />

      <Suspense fallback={null}>
        <ConciergeChatBot open={chatOpen} onOpenChange={setChatOpen} />
      </Suspense>

      <main className="slides">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/personal-services" element={<PersonalServicesPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/hop" element={<Navigate to="/#hop" replace />} />
          <Route path="/request" element={<Navigate to="/#request" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <SiteFooter />
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
