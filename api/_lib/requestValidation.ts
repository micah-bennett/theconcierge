export type ConciergeRequest = {
  path: 'individual' | 'facility'
  firstName: string
  lastName: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  zip: string
  country: string
  phone: string
  email: string
  dateNeeded: string
  timeNeeded: string
  requestType: string
  details: string
  hearAboutUs: string
  paymentMethod: string
  cardholderName: string
  cardLastFour: string
  expMonth: string
  expYear: string
}

const LIMITS: Record<keyof ConciergeRequest, number> = {
  path: 20,
  firstName: 80,
  lastName: 80,
  addressLine1: 160,
  addressLine2: 160,
  city: 100,
  state: 80,
  zip: 10,
  country: 80,
  phone: 20,
  email: 254,
  dateNeeded: 10,
  timeNeeded: 20,
  requestType: 160,
  details: 4000,
  hearAboutUs: 120,
  paymentMethod: 80,
  cardholderName: 160,
  cardLastFour: 4,
  expMonth: 2,
  expYear: 4,
}

function stringField(source: Record<string, unknown>, key: keyof ConciergeRequest): string {
  const value = source[key]
  if (typeof value !== 'string') throw new Error(`Invalid ${key}`)
  const trimmed = value.trim()
  if (trimmed.length > LIMITS[key]) throw new Error(`${key} is too long`)
  return trimmed
}

export function validateRequestPayload(value: unknown): ConciergeRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid request body')
  }

  const source = value as Record<string, unknown>
  const data = Object.fromEntries(
    (Object.keys(LIMITS) as Array<keyof ConciergeRequest>).map((key) => [key, stringField(source, key)]),
  ) as ConciergeRequest

  if (data.path !== 'individual' && data.path !== 'facility') throw new Error('Invalid path')
  if (!data.firstName || !data.lastName || !data.requestType) throw new Error('Required fields are missing')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error('Enter a valid email address')
  if (!/^\d{10,15}$/.test(data.phone.replace(/\D/g, ''))) throw new Error('Enter a valid phone number')
  if (!/^\d{5}(?:-\d{4})?$/.test(data.zip)) throw new Error('Enter a valid ZIP code')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.dateNeeded)) throw new Error('Enter a valid service date')

  data.phone = data.phone.replace(/\D/g, '')
  data.cardLastFour = data.cardLastFour.replace(/\D/g, '').slice(-4)
  data.expMonth = data.expMonth.replace(/\D/g, '').slice(0, 2)
  data.expYear = data.expYear.replace(/\D/g, '').slice(0, 4)
  return data
}
