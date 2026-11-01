/**
 * Option lists for the public instant-request form (src/pages/site/RequestPage.tsx), shared
 * with the server (api/_lib/requestValidation.ts), which rejects anything not listed here.
 *
 * Keep in sync with packages/shared/src/brand.ts CONCIERGE_REQUEST_TYPES / PAYMENT_METHODS /
 * HEAR_ABOUT_US (and FLIGHT_REQUEST_TYPES). The site API is a plain Vercel function and can't
 * import @hop/shared, so the lists are mirrored here.
 */
export const CONCIERGE_REQUEST_TYPES = [
  'Personal errands & task management',
  'Scheduling & appointments',
  'Lifestyle & home assistance',
  'Airport or flight travel',
  'Member-rate concierge services',
  'Priority scheduling & travel coordination',
  'Ongoing professional support',
  'VIP / full-service concierge',
  'Other (describe below)',
] as const

/** Request types that show the flight fields. */
export const FLIGHT_REQUEST_TYPES: ReadonlyArray<string> = [
  'Airport or flight travel',
  'Priority scheduling & travel coordination',
]

export const PAYMENT_METHODS = [
  ['', 'Skip for now (payment optional)'],
  ['card', 'Credit card'],
  ['phone', 'Pay by phone'],
  ['invoice', 'Invoice'],
  ['other', 'Other'],
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number][0]

export const HEAR_ABOUT_US = [
  'Word of mouth',
  'Referral',
  'Search / web',
  'Social media',
  'Event or partner',
  'My employer',
  'Other',
] as const

/** What the browser posts to /api/request. Every field is a string; the server trims and checks. */
export type InstantRequestPayload = {
  firstName: string
  lastName: string
  phone: string
  email: string
  requestType: string
  dateNeeded: string
  timeNeeded: string
  details: string
  address: { line1: string; line2: string; city: string; state: string; zip: string }
  flight: {
    airline: string
    flightNumber: string
    airport: string
    direction: string
    time: string
    passengers: string
    bags: string
  } | null
  payment: { method: string; cardholderName: string; cardLast4: string }
  hearAboutUs: string
  /** Honeypot. Real people never see or fill it. */
  company: string
}
