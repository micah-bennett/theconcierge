export type HopUser = {
  id: string
  email: string
  hopNumber: string
  firstName: string
  lastName: string
  phone: string
  role: 'user' | 'admin' | 'concierge'
  status: 'active' | 'disabled'
}

export type HopRequestHistoryEntry = {
  status: string
  created_at: string
  // Only present for admins — members get the status/timestamp only (see api/hop/requests.ts).
  note?: string
  staff_name?: string | null
}

export type HopRatingAggregate = { avg: number; count: number }

export type HopServiceRequest = {
  id: string
  service_type: string
  status: string
  details: string
  requested_for: string | null
  handled_by: string | null
  accepted_at: string | null
  assignee_name: string | null
  assignee_phone: string | null
  assignee_rating: HopRatingAggregate | null
  my_rating: { stars: number; comment: string } | null
  history: HopRequestHistoryEntry[]
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

export function hopLogin(data: { identifier: string; password: string }) {
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

export function hopUpdateProfile(data: { firstName: string; lastName: string; phone: string }) {
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

export function hopAdminUpdateRequest(data: { id: string; status?: string; assignedTo?: string | null; note?: string }) {
  return request<{ request: HopServiceRequest; validNextStatuses: string[] }>('/requests', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function hopAcceptRequest(id: string) {
  return request<{ request: HopServiceRequest; validNextStatuses: string[] }>('/requests', {
    method: 'PATCH',
    body: JSON.stringify({ id, accept: true }),
  })
}

export function hopRateRequest(data: { requestId: string; stars: number; comment: string }) {
  return request<{ rating: { id: string; stars: number; comment: string; created_at: string } }>(
    '/requests?action=rate',
    { method: 'POST', body: JSON.stringify(data) },
  )
}

export function hopListIntegrations() {
  return request<{ integrations: HopIntegration[] }>('/integrations/google?action=list')
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
  hop_number: string
  first_name: string
  last_name: string
  phone: string
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
  user_phone: string
  valid_next_statuses: string[]
}

export function hopAdminListRequests() {
  return request<{ requests: HopAdminRequest[] }>('/requests')
}

export type HopStaffMember = {
  id: string
  first_name: string
  last_name: string
  email: string
  role: 'admin' | 'concierge'
}

export function hopAdminListStaff() {
  return request<{ staff: HopStaffMember[] }>('/admin/users?scope=staff')
}

export type HopRideLocation = { latitude: number; longitude: number; updatedAt: string }

export function hopGetRideLocation(requestId: string) {
  return request<{ location: HopRideLocation | null }>(`/ride-location?requestId=${encodeURIComponent(requestId)}`)
}

export function hopUpdateRideLocation(requestId: string, latitude: number, longitude: number) {
  return request<{ ok: true }>('/ride-location?action=update', {
    method: 'POST',
    body: JSON.stringify({ requestId, latitude, longitude }),
  })
}

export function hopStopRideLocationSharing(requestId: string) {
  return request<{ ok: true }>('/ride-location?action=stop', {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  })
}

export type HopWellnessCheckIn = {
  id: string
  feeling: string
  desired_support: string
  note: string
  shift_protection: string | null
  created_at: string
}

export function hopCreateWellnessCheckIn(data: {
  feeling: string
  desiredSupport: string
  note: string
  shiftProtection: string | null
}) {
  return request<{ checkIn: HopWellnessCheckIn }>('/wellness', { method: 'POST', body: JSON.stringify(data) })
}

export function hopListWellnessCheckIns() {
  return request<{ checkIns: HopWellnessCheckIn[] }>('/wellness')
}

export type HopAdminWellnessCheckIn = HopWellnessCheckIn & {
  user_id: string
  first_name: string
  last_name: string
  email: string
}

export function hopAdminListWellnessCheckIns() {
  return request<{ checkIns: HopAdminWellnessCheckIn[] }>('/wellness')
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
  return request<{ integrations: HopAdminIntegration[] }>('/admin/users?scope=integrations')
}

export type HopRequestMessage = {
  id: string
  sender_id: string
  sender_name: string
  sender_role: 'user' | 'admin' | 'concierge'
  body: string
  created_at: string
}

export function hopListRequestMessages(requestId: string) {
  return request<{ messages: HopRequestMessage[] }>(
    `/request-messages?requestId=${encodeURIComponent(requestId)}`,
  )
}

export function hopSendRequestMessage(requestId: string, body: string) {
  return request<{ message: HopRequestMessage }>('/request-messages', {
    method: 'POST',
    body: JSON.stringify({ requestId, body }),
  })
}

// ── HOP ConciergeHub client functions ──────────────────────────────────────
// These call endpoints that only exist on the ConciergeHub deployment (api/hop/concierge.ts,
// api/hop/admin/concierges.ts) — not on the main consumer app, which stays at its Vercel
// Hobby function-count cap. Safe to keep here since this file is synced across both
// deployments and unused exports cost nothing.

export type HopConciergeProfile = {
  headline: string
  bio: string
  specialties: string[]
  years_experience: number | null
  photo_url: string | null
}

export function hopConciergeGetProfile() {
  return request<{ profile: HopConciergeProfile; rating: HopRatingAggregate | null }>('/concierge?action=profile')
}

export function hopConciergeUpdateProfile(data: HopConciergeProfile) {
  return request<{ profile: HopConciergeProfile }>('/concierge?action=profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function hopConciergeMyRequests() {
  return request<{ requests: HopAdminRequest[] }>('/concierge?action=my-requests')
}

export function hopConciergeGetDutyStatus() {
  return request<{ onDuty: boolean; since: string | null }>('/concierge?action=duty-status')
}

export function hopConciergeSetDutyStatus(onDuty: boolean) {
  return request<{ onDuty: boolean; since: string | null }>('/concierge?action=duty-status', {
    method: 'POST',
    body: JSON.stringify({ onDuty }),
  })
}

export type HopOnDutyStaff = {
  id: string
  first_name: string
  last_name: string
  role: 'admin' | 'concierge'
  clock_in_at: string
}

export function hopAdminListOnDuty() {
  return request<{ onDuty: HopOnDutyStaff[] }>('/admin/users?scope=on-duty')
}

export type HopConcierge = {
  id: string
  email: string
  first_name: string
  last_name: string
  status: 'active' | 'disabled'
  created_at: string
  headline: string | null
  open_assigned: number
}

export function hopAdminListConcierges() {
  return request<{ concierges: HopConcierge[] }>('/admin/concierges')
}

export function hopAdminCreateConcierge(data: { email: string; firstName: string; lastName: string }) {
  return request<{ concierge: HopConcierge; temporaryPassword: string | null; emailSent: boolean }>(
    '/admin/concierges?action=create',
    { method: 'POST', body: JSON.stringify(data) },
  )
}

export function hopAdminUpdateConciergeStatus(id: string, status: 'active' | 'disabled') {
  return request<{ concierge: HopConcierge }>('/admin/concierges', {
    method: 'PATCH',
    body: JSON.stringify({ id, status }),
  })
}

// ── Direct messaging (admin <-> member), not tied to a request ─────────────

export type HopDirectMessage = {
  id: string
  sender_id: string
  sender_name: string
  sender_role: 'user' | 'admin' | 'concierge'
  body: string
  created_at: string
}

export function hopListMyMessages() {
  return request<{ messages: HopDirectMessage[] }>('/messages')
}

export function hopSendMessage(body: string) {
  return request<{ message: HopDirectMessage }>('/messages', { method: 'POST', body: JSON.stringify({ body }) })
}

export type HopMessageThreadSummary = {
  user_id: string
  first_name: string
  last_name: string
  email: string
  last_message: string
  last_sender_id: string
  last_message_at: string
  unread_count: number
}

export function hopAdminListMessageThreads() {
  return request<{ threads: HopMessageThreadSummary[] }>('/messages?scope=admin')
}

export function hopAdminGetMessageThread(userId: string) {
  return request<{ messages: HopDirectMessage[] }>(`/messages?scope=admin&userId=${encodeURIComponent(userId)}`)
}

export function hopAdminSendMessage(userId: string, body: string) {
  return request<{ message: HopDirectMessage }>('/messages', {
    method: 'POST',
    body: JSON.stringify({ userId, body }),
  })
}

// ── Points/rewards — reduced scope this cycle: view own ledger/balance, staff manual award only.
// No redemption yet, see docs/hop/roadmap.md.

export type HopPointsLedgerEntry = {
  id: string
  delta: number
  source: 'admin_award' | 'concierge_award' | 'checkin_streak' | 'profile_complete' | 'redemption' | 'wearable_challenge'
  reason: string
  created_at: string
}

export function hopGetRewards() {
  return request<{ ledger: HopPointsLedgerEntry[]; balance: number }>('/rewards')
}

export function hopAdminAwardPoints(userId: string, delta: number, reason: string) {
  return request<{ entry: HopPointsLedgerEntry; balance: number }>('/rewards?action=award', {
    method: 'POST',
    body: JSON.stringify({ userId, delta, reason }),
  })
}
