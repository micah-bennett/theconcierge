import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HopAdminLoginPage } from './pages/hop/HopAdminLoginPage'
import { HopForgotPasswordPage } from './pages/hop/HopForgotPasswordPage'
import { HopResetPasswordPage } from './pages/hop/HopResetPasswordPage'
import { HopAdminDashboardPage } from './pages/hop/admin/HopAdminDashboardPage'
import { HopAdminUsersPage } from './pages/hop/admin/HopAdminUsersPage'
import { HopAdminRequestsPage } from './pages/hop/admin/HopAdminRequestsPage'
import { HopAdminWellnessPage } from './pages/hop/admin/HopAdminWellnessPage'
import { HopAdminIntegrationsPage } from './pages/hop/admin/HopAdminIntegrationsPage'
import { HopAdminConciergesPage } from './pages/hop/admin/HopAdminConciergesPage'
import { HopConciergeDashboardPage } from './pages/hop/concierge/HopConciergeDashboardPage'
import { HopConciergeRequestsPage } from './pages/hop/concierge/HopConciergeRequestsPage'
import { HopConciergeCalendarPage } from './pages/hop/concierge/HopConciergeCalendarPage'
import { HopConciergeProfilePage } from './pages/hop/concierge/HopConciergeProfilePage'
import { HopAuthProvider } from './hop/AuthContext'
import { HopThemeProvider } from './hop/ThemeContext'
import { RequireAdmin, RequireConcierge } from './hop/RequireAuth'
import { HopAdminLayout } from './hop/HopAdminLayout'
import { HopConciergeLayout } from './hop/HopConciergeLayout'
import './styles/hopApp.css'

// This is HOP ConciergeHub — a separate Vercel deployment from the main consumer app, trimmed
// to admin + concierge routes only. See docs/hop/architecture.md ("ConciergeHub" / "Deployments")
// before adding any consumer-facing (/hop/app/*) route here; that tree belongs on `main`.
function AppRoutes() {
  return (
    <div className="hop-shell--concierge-hub">
      <HopThemeProvider>
        <HopAuthProvider>
          <Routes>
            <Route path="/hop/admin/login" element={<HopAdminLoginPage />} />
            <Route path="/hop/forgot-password" element={<HopForgotPasswordPage />} />
            <Route path="/hop/reset-password" element={<HopResetPasswordPage />} />
            <Route element={<RequireAdmin />}>
              <Route path="/hop/admin" element={<HopAdminLayout />}>
                <Route index element={<HopAdminDashboardPage />} />
                <Route path="users" element={<HopAdminUsersPage />} />
                <Route path="concierges" element={<HopAdminConciergesPage />} />
                <Route path="requests" element={<HopAdminRequestsPage />} />
                <Route path="wellness" element={<HopAdminWellnessPage />} />
                <Route path="integrations" element={<HopAdminIntegrationsPage />} />
              </Route>
            </Route>
            <Route element={<RequireConcierge />}>
              <Route path="/hop/concierge" element={<HopConciergeLayout />}>
                <Route index element={<HopConciergeDashboardPage />} />
                <Route path="requests" element={<HopConciergeRequestsPage />} />
                <Route path="calendar" element={<HopConciergeCalendarPage />} />
                <Route path="profile" element={<HopConciergeProfilePage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/hop/admin/login" replace />} />
          </Routes>
        </HopAuthProvider>
      </HopThemeProvider>
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
