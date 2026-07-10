import { dbUnavailable, getSql } from '../../_lib/hopDb.js'
import {
  createSession,
  hashPassword,
  json,
  jsonWithCookie,
  setSessionCookie,
  toPublicUser,
} from '../../_lib/hopAuth.js'

type SignupPayload = {
  email: string
  password: string
  firstName: string
  lastName: string
}

function validate(value: unknown): SignupPayload {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const email = typeof source.email === 'string' ? source.email.trim().toLowerCase() : ''
  const password = typeof source.password === 'string' ? source.password : ''
  const firstName = typeof source.firstName === 'string' ? source.firstName.trim() : ''
  const lastName = typeof source.lastName === 'string' ? source.lastName.trim() : ''

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address')
  if (password.length < 10 || password.length > 200) throw new Error('Password must be at least 10 characters')
  if (!firstName || firstName.length > 80) throw new Error('Enter a first name')
  if (!lastName || lastName.length > 80) throw new Error('Enter a last name')

  return { email, password, firstName, lastName }
}

export async function POST(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  try {
    const data = validate(await request.json())

    const existing = await sql`SELECT id FROM hop_users WHERE LOWER(email) = ${data.email}`
    if (existing.length > 0) return json({ error: 'An account with that email already exists' }, 409)

    const passwordHash = await hashPassword(data.password)
    const rows = await sql`
      INSERT INTO hop_users (email, password_hash, first_name, last_name, role)
      VALUES (${data.email}, ${passwordHash}, ${data.firstName}, ${data.lastName}, 'user')
      RETURNING id, email, first_name, last_name, role
    `
    const row = rows[0] as {
      id: string
      email: string
      first_name: string
      last_name: string
      role: string
    }

    const token = await createSession(sql, row.id, request)
    return jsonWithCookie({ user: toPublicUser(row) }, 201, setSessionCookie(request, token))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create account'
    const status = /Invalid|valid|must be|Enter/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP signup failed', error)
    return json({ error: status === 400 ? message : 'Could not create account' }, status)
  }
}

export function GET(): Response {
  return json({ error: 'Method not allowed' }, 405)
}
