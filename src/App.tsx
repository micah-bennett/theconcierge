import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HopAdminLoginPage } from './pages/hop/HopAdminLoginPage'
import { HopForgotPasswordPage } from './pages/hop/HopForgotPasswordPage'
import { HopResetPasswordPage } from './pages/hop/HopResetPasswordPage'
import { HopAdminDashboardPage } from './pages/hop/admin/HopAdminDashboardPage'
import { HopAdminUsersPage } from './pages/hop/admin/HopAdminUsersPage'
import { HopAdminRequestsPage } from './pages/hop/admin/HopAdminRequestsPage'
import { HopAdminIntegrationsPage } from './pages/hop/admin/HopAdminIntegrationsPage'
import { HopAuthProvider } from './hop/AuthContext'
import { HopThemeProvider } from './hop/ThemeContext'
import { RequireAdmin } from './hop/RequireAuth'
import { HopAdminLayout } from './hop/HopAdminLayout'
import './styles/hopApp.css'
import './styles/hopDashboard.css'

function AppRoutes() {
  return (
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
              <Route path="requests" element={<HopAdminRequestsPage />} />
              <Route path="integrations" element={<HopAdminIntegrationsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/hop/admin/login" replace />} />
        </Routes>
      </HopAuthProvider>
    </HopThemeProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
