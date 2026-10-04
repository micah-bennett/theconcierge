import { useLayoutEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import { ConciergePage } from './pages/site/ConciergePage'
import { ContactPage } from './pages/site/ContactPage'
import { HomePage } from './pages/site/HomePage'
import { HowItWorksPage } from './pages/site/HowItWorksPage'
import { OrganizationsPage } from './pages/site/OrganizationsPage'
import { PortalPage } from './pages/site/PortalPage'
import { ProfessionalsPage } from './pages/site/ProfessionalsPage'
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
import { usePageTitle } from './hooks/usePageTitle'
import './App.css'
import './styles/hopApp.css'
import './styles/hopSite.css'

function ScrollToTop() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function AppRoutes() {
  const location = useLocation()
  usePageTitle(location.pathname)

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

  // Public site — rebuilt 2026-10 from the leadership HOP mockup. Old URLs
  // redirect to their nearest new page so existing links keep working.
  return (
    <div className="hs">
      <ScrollToTop />
      <SiteHeader />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/professionals" element={<ProfessionalsPage />} />
          <Route path="/organizations" element={<OrganizationsPage />} />
          <Route path="/concierge" element={<ConciergePage />} />
          <Route path="/portal" element={<PortalPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/personal-services" element={<Navigate to="/concierge" replace />} />
          <Route path="/hop" element={<Navigate to="/" replace />} />
          <Route path="/plans" element={<Navigate to="/organizations" replace />} />
          <Route path="/request" element={<Navigate to="/contact" replace />} />
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
