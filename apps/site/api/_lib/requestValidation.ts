import {
  CONCIERGE_REQUEST_TYPES,
  FLIGHT_REQUEST_TYPES,
  HEAR_ABOUT_US,
} from '../../src/site/conciergeRequest.js'

/**
 * Server-side checks for the public instant-request form (api/request.ts).
 *
 * Mirrors packages/shared/src/validate.ts `conciergeDetailsSchema` and the ConciergeDetails /
 * StaffRequest types in packages/shared/src/types.ts. The site's API can't import @hop/shared
 * (or zod), so the rules are restated here. Keep the two in step.
 */

export class RequestValidationError extends Error {
  name = 'RequestValidationError'
}

export type PaymentMethod = '' | 'card' | 'phone' | 'invoice' | 'other'
export type FlightDirection = '' | 'departure' | 'arrival'

export type InstantAddress = { line1: string; line2: string; city: string; state: string; zip: string }
export type InstantFlight = {
  airline: string
  flightNumber: string
  airport: string
  direction: FlightDirection
  time: string
  passengers: string
  bags: string
}
export type InstantPayment = { method: PaymentMethod; cardholderName: string; cardLast4: string }

/** A validated, normalized instant request. */
export type InstantRequest = {
  firstName: string
  lastName: string
  phone: string
  email: string
  requestType: string
  /** YYYY-MM-DD, today or later in America/New_York. */
  dateNeeded: string
  /** e.g. "3:05 PM", or "" for any time. */
  timeNeeded: string
  details: string
  address: InstantAddress
  /** Only for the flight request types; null otherwise. */
  flight: InstantFlight | null
  /** Card fields are blank unless method is "card". */
  payment: InstantPayment
  hearAboutUs: string
}

const PAYMENT_METHOD_KEYS: ReadonlyArray<string> = ['', 'card', 'phone', 'invoice', 'other']
const REQUEST_TYPES: ReadonlyArray<string> = CONCIERGE_REQUEST_TYPES
const HEARD: ReadonlyArray<string> = HEAR_ABOUT_US
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function fail(message: string): never {
  throw new RequestValidationError(message)
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (value === undefined || value === null) return {}
  if (typeof value !== 'object' || Array.isArray(value)) fail(`Invalid ${label}`)
  return value as Record<string, unknown>
}

/** A trimmed string with `<`, `>` and backticks removed (the shared schema's `safe()`). */
function text(source: Record<string, unknown>, key: string, max: number, label = key): string {
  const value = source[key]
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') fail(`Invalid ${label}`)
  const cleaned = value.replace(/[<>`]/g, '').trim()
  if (cleaned.length > max) fail(`${label} is too long (${max} characters max)`)
  return cleaned
}

/** Today's date as YYYY-MM-DD in HOP's time zone. */
export function todayInNewYork(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function checkDate(value: string, now: Date): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('Pick the date you need this done')
  const [y, m, d] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(y, m - 1, d))
  if (parsed.getUTCFullYear() !== y || parsed.getUTCMonth() !== m - 1 || parsed.getUTCDate() !== d) {
    fail('Pick the date you need this done')
  }
  if (value < todayInNewYork(now)) fail('Pick a date that is today or later')
  return value
}

/** Accepts "3:05 PM" or a 24-hour "15:05" (what <input type="time"> gives) and returns "3:05 PM". */
function checkTime(value: string): string {
  if (!value) return ''
  const twelve = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/.exec(value)
  if (twelve) {
    const hour = Number(twelve[1])
    const minute = Number(twelve[2])
    if (hour < 1 || hour > 12 || minute > 59) fail('Enter a valid time')
    return `${hour}:${twelve[2]} ${twelve[3].toUpperCase()}`
  }
  const twentyFour = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (twentyFour) {
    const hour = Number(twentyFour[1])
    const minute = Number(twentyFour[2])
    if (hour > 23 || minute > 59) fail('Enter a valid time')
    const suffix = hour < 12 ? 'AM' : 'PM'
    return `${hour % 12 || 12}:${twentyFour[2]} ${suffix}`
  }
  return fail('Enter a valid time')
}

/** True when the hidden "company" field was filled: a bot. The handler then quietly does nothing. */
export function isHoneypotFilled(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const company = (value as Record<string, unknown>).company
  return typeof company === 'string' && company.trim().length > 0
}

export function validateInstantRequest(value: unknown, now: Date = new Date()): InstantRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Invalid request body')
  const source = value as Record<string, unknown>

  const firstName = text(source, 'firstName', 60, 'First name')
  if (!firstName) fail('Enter your first name')
  const lastName = text(source, 'lastName', 60, 'Last name')
  if (!lastName) fail('Enter your last name')

  const phone = text(source, 'phone', 30, 'Phone')
  const phoneDigits = phone.replace(/\D/g, '')
  if (!phone) fail('Enter a phone number we can reach you on')
  if (!/^[\d\s()+.-]+$/.test(phone) || phoneDigits.length < 10 || phoneDigits.length > 15) {
    fail('Enter a 10-digit phone number')
  }

  const email = text(source, 'email', 200, 'Email').toLowerCase()
  if (!EMAIL_RE.test(email)) fail('Enter a valid email address')

  const requestType = text(source, 'requestType', 80, 'Request')
  if (!REQUEST_TYPES.includes(requestType)) fail('Choose what you need help with')

  const dateNeeded = checkDate(text(source, 'dateNeeded', 10, 'Date'), now)
  const timeNeeded = checkTime(text(source, 'timeNeeded', 20, 'Time'))

  const details = text(source, 'details', 2000, 'Request details')
  if (!details) fail('Tell us what you need')

  const a = asObject(source.address, 'address')
  const address: InstantAddress = {
    line1: text(a, 'line1', 160, 'Street address'),
    line2: text(a, 'line2', 160, 'Address line 2'),
    city: text(a, 'city', 80, 'City'),
    state: text(a, 'state', 60, 'State'),
    zip: text(a, 'zip', 10, 'ZIP code'),
  }
  if (!/^(\d{5}(-\d{4})?)?$/.test(address.zip)) fail('Enter a 5-digit ZIP code')

  let flight: InstantFlight | null = null
  if (FLIGHT_REQUEST_TYPES.includes(requestType)) {
    const f = asObject(source.flight, 'flight')
    const direction = text(f, 'direction', 10, 'Departing or arriving')
    if (direction !== '' && direction !== 'departure' && direction !== 'arrival') {
      fail('Choose departing or arriving')
    }
    flight = {
      airline: text(f, 'airline', 60, 'Airline'),
      flightNumber: text(f, 'flightNumber', 20, 'Flight number'),
      airport: text(f, 'airport', 80, 'Airport'),
      direction,
      time: text(f, 'time', 20, 'Flight time'),
      passengers: text(f, 'passengers', 10, 'Passengers'),
      bags: text(f, 'bags', 10, 'Bags'),
    }
  }

  const p = asObject(source.payment, 'payment')
  const method = text(p, 'method', 10, 'Payment method')
  if (!PAYMENT_METHOD_KEYS.includes(method)) fail('Choose a payment method')
  const cardholderName = text(p, 'cardholderName', 80, 'Cardholder name')
  const cardLast4 = text(p, 'cardLast4', 4, 'Last 4 digits of card')
  if (!/^(\d{4})?$/.test(cardLast4)) fail('Enter only the last 4 digits of the card')
  // Card details only travel with the card method.
  const payment: InstantPayment =
    method === 'card'
      ? { method, cardholderName, cardLast4 }
      : { method: method as PaymentMethod, cardholderName: '', cardLast4: '' }

  const hearAboutUs = text(source, 'hearAboutUs', 60, 'How did you hear about us')
  if (hearAboutUs && !HEARD.includes(hearAboutUs)) fail('Choose how you heard about us')

  return {
    firstName,
    lastName,
    phone,
    email,
    requestType,
    dateNeeded,
    timeNeeded,
    details,
    address,
    flight,
    payment,
    hearAboutUs,
  }
}

/** The JOB_CATS bucket a request type maps to (packages/shared/src/brand.ts catForRequestType). */
export function catForRequestType(type: string): 'ride' | 'family' | 'errand' {
  if (/airport|flight|travel/i.test(type)) return 'ride'
  if (/home|lifestyle/i.test(type)) return 'family'
  return 'errand'
}

/**
 * The portal_requests.data JSON for an instant request: a StaffRequest with ConciergeDetails
 * (packages/shared/src/types.ts), so it lands in the Concierge Console queue like any other.
 */
export function toStaffRequest(data: InstantRequest, id: string, createdAt: number = Date.now()) {
  return {
    id,
    memberId: '',
    member: `${data.firstName} ${data.lastName.charAt(0).toUpperCase()}.`,
    role: 'Instant request',
    cat: catForRequestType(data.requestType),
    text: data.details,
    urgent: false,
    window: [data.dateNeeded, data.timeNeeded].filter(Boolean).join(' '),
    source: 'instant' as const,
    createdAt,
    status: 'new' as const,
    details: {
      requestType: data.requestType,
      dateNeeded: data.dateNeeded,
      timeNeeded: data.timeNeeded,
      address: data.address,
      flight: data.flight,
      payment: data.payment,
      hearAboutUs: data.hearAboutUs,
      contact: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
      },
    },
  }
}
