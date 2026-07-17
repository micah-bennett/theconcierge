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
