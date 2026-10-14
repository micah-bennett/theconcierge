import { INQUIRY_INTERESTS } from '../../src/site/inquiry.js'

export type HopInquiry = {
  firstName: string
  lastName: string
  email: string
  organization: string
  interest: string
  message: string
}

const INTEREST_LABELS: ReadonlyArray<string> = INQUIRY_INTERESTS.map((item) => item.label)

const LIMITS: Record<keyof HopInquiry, number> = {
  firstName: 80,
  lastName: 80,
  email: 254,
  organization: 200,
  interest: 80,
  message: 4000,
}

function stringField(source: Record<string, unknown>, key: keyof HopInquiry): string {
  const value = source[key]
  if (typeof value !== 'string') throw new Error(`Invalid ${key}`)
  const trimmed = value.trim()
  if (trimmed.length > LIMITS[key]) throw new Error(`${key} is too long`)
  return trimmed
}

export function validateInquiryPayload(value: unknown): HopInquiry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid request body')
  }

  const source = value as Record<string, unknown>
  const data = Object.fromEntries(
    (Object.keys(LIMITS) as Array<keyof HopInquiry>).map((key) => [key, stringField(source, key)]),
  ) as HopInquiry

  if (!data.firstName) throw new Error('Enter your first name')
  if (!data.lastName) throw new Error('Enter your last name')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error('Enter a valid email address')
  if (!INTEREST_LABELS.includes(data.interest)) {
    throw new Error('Invalid interest')
  }
  if (!data.message) throw new Error('Enter a message')

  return data
}
