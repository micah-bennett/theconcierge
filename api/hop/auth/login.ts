import { dbUnavailable, getSql } from '../../_lib/hopDb.js'
import {
  checkLoginLock,
  createSession,
  json,
  jsonWithCookie,
  recordFailedLogin,
  resetFailedLogins,
  setSessionCookie,
  toPublicUser,
  verifyPassword,
} from '../../_lib/hopAuth.js'

type LoginPayload = { email: string; password: string }

function validate(value: unknown): LoginPayload {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const email = typeof source.email === 'string' ? source.email.trim().toLowerCase() : ''
  const password = typeof source.password === 'string' ? source.password : ''
  if (!email || !password) throw new Error('Enter your email and password')
  return { email, password }
}

export async function POST(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  try {
    const data = validate(await request.json())

    const rows = await sql`
      SELECT id, email, first_name, last_name, role, status, password_hash,
             failed_login_attempts, locked_until
      FROM hop_users
      WHERE LOWER(email) = ${data.email}
    `
    const row = rows[0] as
      | {
          id: string
          email: string
          first_name: string
          last_name: string
          role: string
          status: string
          password_hash: string
          failed_login_attempts: number
          locked_until: string | null
        }
      | undefined

    const genericError = 'Incorrect email or password'
    if (!row || row.status !== 'active') return json({ error: genericError }, 401)

    const lockMessage = checkLoginLock(row)
    if (lockMessage) return json({ error: lockMessage }, 429)

    const validPassword = await verifyPassword(data.password, row.password_hash)
    if (!validPassword) {
      await recordFailedLogin(sql, row.id, row.failed_login_attempts)
      return json({ error: genericError }, 401)
    }

    await resetFailedLogins(sql, row.id)
    const token = await createSession(sql, row.id, request)
    return jsonWithCookie({ user: toPublicUser(row) }, 200, setSessionCookie(request, token))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not sign in'
    const status = /Enter your email/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP login failed', error)
    return json({ error: status === 400 ? message : 'Could not sign in' }, status)
  }
}

export function GET(): Response {
  return json({ error: 'Method not allowed' }, 405)
}
