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
import { usePageTitle } from './hooks/usePageTitle'
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
