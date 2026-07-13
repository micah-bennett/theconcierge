export type HopUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'user' | 'admin'
  status: 'active' | 'disabled'
}

export type HopServiceRequest = {
  id: string
  service_type: string
  status: string
  details: string
  requested_for: string | null
  created_at: string
  updated_at: string
}

export type HopIntegration = {
  provider: string
  status: string
  external_account_email: string
  connected_at: string | null
  last_synced_at: string | null
}

export type HopCalendarEvent = { id: string; summary: string; start: string | null; end: string | null }

class HopApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/hop${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null
  if (!response.ok) {
    throw new HopApiError(body?.error || 'Something went wrong. Please try again.')
  }
  return body as T
}

export function hopSignup(data: { email: string; password: string; firstName: string; lastName: string }) {
  return request<{ user: HopUser }>('/auth?action=signup', { method: 'POST', body: JSON.stringify(data) })
}

export function hopLogin(data: { email: string; password: string }) {
  return request<{ user: HopUser }>('/auth?action=login', { method: 'POST', body: JSON.stringify(data) })
}

export function hopLogout() {
  return request<{ ok: true }>('/auth?action=logout', { method: 'POST' })
}

export function hopMe() {
  return request<{ user: HopUser }>('/auth?action=me')
}

export function hopForgotPassword(email: string) {
  return request<{ message: string }>('/auth?action=forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function hopResetPassword(token: string, password: string) {
  return request<{ ok: true }>('/auth?action=reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export function hopUpdateProfile(data: { firstName: string; lastName: string }) {
  return request<{ user: HopUser }>('/auth?action=update-profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function hopListRequests() {
  return request<{ requests: HopServiceRequest[] }>('/requests')
}

export function hopCreateRequest(data: { serviceType: string; details: string; requestedFor: string | null }) {
  return request<{ request: HopServiceRequest }>('/requests', { method: 'POST', body: JSON.stringify(data) })
}

export function hopUpdateRequestStatus(id: string, status: string) {
  return request<{ request: HopServiceRequest }>('/requests', {
    method: 'PATCH',
    body: JSON.stringify({ id, status }),
  })
}

export function hopListIntegrations() {
  return request<{ integrations: HopIntegration[] }>('/integrations')
}

export function hopDisconnectGoogleCalendar() {
  return request<{ ok: true }>('/integrations/google?action=disconnect', { method: 'POST' })
}

export function hopGoogleCalendarEvents() {
  return request<{ connected: boolean; events: HopCalendarEvent[] }>('/integrations/google?action=events')
}

export type HopAdminUser = {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  status: string
  created_at: string
  connected_integrations: number
}

export function hopAdminListUsers() {
  return request<{ users: HopAdminUser[] }>('/admin/users')
}

export function hopAdminUpdateUserStatus(id: string, status: 'active' | 'disabled') {
  return request<{ user: HopAdminUser }>('/admin/users', { method: 'PATCH', body: JSON.stringify({ id, status }) })
}

export type HopAdminRequest = HopServiceRequest & {
  user_id: string
  first_name: string
  last_name: string
  email: string
}

export function hopAdminListRequests() {
  return request<{ requests: HopAdminRequest[] }>('/requests')
}

export type HopAdminIntegration = {
  provider: string
  status: string
  connected_at: string | null
  last_synced_at: string | null
  user_id: string
  first_name: string
  last_name: string
  email: string
}

export function hopAdminListIntegrations() {
  return request<{ integrations: HopAdminIntegration[] }>('/admin/integrations')
}
