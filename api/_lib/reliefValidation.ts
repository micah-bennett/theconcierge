export type ReliefCallRequest = {
  name: string
  titleFacility: string
  email: string
  phone: string
  notes: string
}

const LIMITS: Record<keyof ReliefCallRequest, number> = {
  name: 160,
  titleFacility: 200,
  email: 254,
  phone: 20,
  notes: 2000,
}

function stringField(source: Record<string, unknown>, key: keyof ReliefCallRequest): string {
  const value = source[key]
  if (typeof value !== 'string') throw new Error(`Invalid ${key}`)
  const trimmed = value.trim()
  if (trimmed.length > LIMITS[key]) throw new Error(`${key} is too long`)
  return trimmed
}

export function validateReliefPayload(value: unknown): ReliefCallRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid request body')
  }

  const source = value as Record<string, unknown>
  const data = Object.fromEntries(
    (Object.keys(LIMITS) as Array<keyof ReliefCallRequest>).map((key) => [key, stringField(source, key)]),
  ) as ReliefCallRequest

  if (!data.name) throw new Error('Enter your name')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error('Enter a valid email address')
  if (!/^\d{10,15}$/.test(data.phone.replace(/\D/g, ''))) throw new Error('Enter a valid phone number')

  data.phone = data.phone.replace(/\D/g, '')
  return data
}
