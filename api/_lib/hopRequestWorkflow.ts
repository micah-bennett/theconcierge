export const ALL_STATUSES = [
  'submitted',
  'received',
  'assigned',
  'in_progress',
  'en_route',
  'arrived',
  'completed',
  'cancelled',
] as const

export type RequestStatus = (typeof ALL_STATUSES)[number]

const RIDE_SEQUENCE: readonly RequestStatus[] = [
  'submitted',
  'received',
  'assigned',
  'in_progress',
  'en_route',
  'arrived',
  'completed',
]

const STANDARD_SEQUENCE: readonly RequestStatus[] = ['submitted', 'received', 'assigned', 'in_progress', 'completed']

const TERMINAL_STATUSES: readonly RequestStatus[] = ['completed', 'cancelled']

function sequenceFor(serviceType: string): readonly RequestStatus[] {
  return serviceType === 'ride' ? RIDE_SEQUENCE : STANDARD_SEQUENCE
}

export function isValidStatus(value: string): value is RequestStatus {
  return (ALL_STATUSES as readonly string[]).includes(value)
}

export function isValidStatusTransition(serviceType: string, current: RequestStatus, next: RequestStatus): boolean {
  if (TERMINAL_STATUSES.includes(current)) return false
  if (next === 'cancelled') return true

  const sequence = sequenceFor(serviceType)
  const currentIndex = sequence.indexOf(current)
  const nextIndex = sequence.indexOf(next)
  if (currentIndex === -1 || nextIndex === -1) return false

  return nextIndex === currentIndex + 1
}

// Acceptance/acknowledgment (2026-07-23): the assigned staff member must explicitly accept a
// request before it can move past 'assigned' — see docs/hop/architecture.md ("Phase 1 quick
// wins"). Deliberately just this one gate, not a new status value, so the rest of this file's
// sequence logic is untouched; `accepted_at` lives on hop_service_requests and is checked
// alongside this in api/hop/requests.ts's PATCH.
export function requiresAcceptance(current: RequestStatus): boolean {
  return current === 'assigned'
}

// Used by the admin dispatch UI so it only ever offers statuses the server will actually accept.
export function nextValidStatuses(serviceType: string, current: RequestStatus): RequestStatus[] {
  if (TERMINAL_STATUSES.includes(current)) return []

  const sequence = sequenceFor(serviceType)
  const currentIndex = sequence.indexOf(current)
  const next: RequestStatus[] = []
  if (currentIndex !== -1 && currentIndex + 1 < sequence.length) {
    next.push(sequence[currentIndex + 1])
  }
  next.push('cancelled')
  return next
}
