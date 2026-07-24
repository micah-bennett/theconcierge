import { dbUnavailable, getSql } from '../_lib/hopDb.js'
import { sendHopPasswordResetEmail, sendHopWelcomeEmail } from '../_lib/email.js'
import {
  checkLoginLock,
  clearSessionCookie,
  consumePasswordResetToken,
  createPasswordResetToken,
  createSession,
  destroyAllSessions,
  destroySession,
  getSessionUser,
  hashPassword,
  isResponse,
  json,
  jsonWithCookie,
  recordFailedLogin,
  requireUser,
  resetFailedLogins,
  setSessionCookie,
  toPublicUser,
  verifyPassword,
} from '../_lib/hopAuth.js'

function actionFromUrl(request: Request): string {
  return new URL(request.url).searchParams.get('action') || ''
}

type SignupPayload = { email: string; password: string; firstName: string; lastName: string }

function validateSignup(value: unknown): SignupPayload {
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

async function handleSignup(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  try {
    const data = validateSignup(await request.json())

    const existing = await sql`SELECT id FROM hop_users WHERE LOWER(email) = ${data.email}`
    if (existing.length > 0) return json({ error: 'An account with that email already exists' }, 409)

    const passwordHash = await hashPassword(data.password)
    const rows = await sql`
      INSERT INTO hop_users (email, password_hash, first_name, last_name, role)
      VALUES (${data.email}, ${passwordHash}, ${data.firstName}, ${data.lastName}, 'user')
      RETURNING id, email, first_name, last_name, phone, role
    `
    const row = rows[0] as {
      id: string
      email: string
      first_name: string
      last_name: string
      phone: string
      role: string
    }

    const token = await createSession(sql, row.id, request)

    try {
      await sendHopWelcomeEmail(row.email, row.first_name)
    } catch (error) {
      console.error('HOP welcome email failed (account still created)', {
        userId: row.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return jsonWithCookie({ user: toPublicUser(row) }, 201, setSessionCookie(request, token))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create account'
    const status = /Invalid|valid|must be|Enter/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP signup failed', error)
    return json({ error: status === 400 ? message : 'Could not create account' }, status)
  }
}

type LoginPayload = { email: string; password: string }

function validateLogin(value: unknown): LoginPayload {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const email = typeof source.email === 'string' ? source.email.trim().toLowerCase() : ''
  const password = typeof source.password === 'string' ? source.password : ''
  if (!email || !password) throw new Error('Enter your email and password')
  return { email, password }
}

async function handleLogin(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  try {
    const data = validateLogin(await request.json())

    const rows = await sql`
      SELECT id, email, first_name, last_name, phone, role, status, password_hash,
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
          phone: string
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

const GENERIC_RESET_MESSAGE = 'If an account exists for that email, we’ve sent a reset link.'

function validateEmail(value: unknown): string {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address')
  return email
}

async function handleForgotPassword(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  try {
    const body = (await request.json()) as { email?: unknown }
    const email = validateEmail(body.email)

    const rows = await sql`
      SELECT id, first_name FROM hop_users WHERE LOWER(email) = ${email} AND status = 'active'
    `
    const row = rows[0] as { id: string; first_name: string } | undefined

    if (row) {
      const token = await createPasswordResetToken(sql, row.id)
      const origin = new URL(request.url).origin
      const resetUrl = `${origin}/hop/reset-password?token=${token}`
      try {
        await sendHopPasswordResetEmail(email, resetUrl)
      } catch (error) {
        console.error('HOP password reset email failed', {
          userId: row.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Always the same response — don't leak whether the email matched an account.
    return json({ message: GENERIC_RESET_MESSAGE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not process that request'
    const status = /Enter a valid email/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP forgot-password failed', error)
    return json({ error: status === 400 ? message : 'Could not process that request' }, status)
  }
}

async function handleResetPassword(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  try {
    const body = (await request.json()) as { token?: unknown; password?: unknown }
    const token = typeof body.token === 'string' ? body.token : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!token) throw new Error('Missing reset token')
    if (password.length < 10 || password.length > 200) throw new Error('Password must be at least 10 characters')

    const userId = await consumePasswordResetToken(sql, token)
    if (!userId) return json({ error: 'This reset link is invalid or has expired' }, 400)

    const passwordHash = await hashPassword(password)
    await sql`UPDATE hop_users SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${userId}`
    await destroyAllSessions(sql, userId)

    return json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not reset your password'
    const status = /Missing reset token|must be at least/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP reset-password failed', error)
    return json({ error: status === 400 ? message : 'Could not reset your password' }, status)
  }
}

type UpdateProfilePayload = { firstName: string; lastName: string; phone: string }

// Phone is optional (empty string clears it) — needed for click-to-call/text on request cards
// (see docs/hop/architecture.md, "Phase 1 quick wins"), loosely validated since formats vary
// internationally; just a sane length/character cap, not a strict phone-number parser.
function validateUpdateProfile(value: unknown): UpdateProfilePayload {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const firstName = typeof source.firstName === 'string' ? source.firstName.trim() : ''
  const lastName = typeof source.lastName === 'string' ? source.lastName.trim() : ''
  const phone = typeof source.phone === 'string' ? source.phone.trim() : ''

  if (!firstName || firstName.length > 80) throw new Error('Enter a first name')
  if (!lastName || lastName.length > 80) throw new Error('Enter a last name')
  if (phone.length > 30 || (phone && !/^[0-9+()\-.\s]+$/.test(phone))) throw new Error('Enter a valid phone number')

  return { firstName, lastName, phone }
}

async function handleUpdateProfile(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  try {
    const data = validateUpdateProfile(await request.json())

    const rows = await sql`
      UPDATE hop_users
      SET first_name = ${data.firstName}, last_name = ${data.lastName}, phone = ${data.phone}, updated_at = NOW()
      WHERE id = ${user.id}
      RETURNING id, email, first_name, last_name, phone, role
    `
    const row = rows[0] as {
      id: string
      email: string
      first_name: string
      last_name: string
      phone: string
      role: string
    }
    return json({ user: toPublicUser(row) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update profile'
    const status = /Enter a|Enter a valid/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP profile update failed', error)
    return json({ error: status === 400 ? message : 'Could not update profile' }, status)
  }
}

async function handleLogout(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  await destroySession(sql, request)
  return jsonWithCookie({ ok: true }, 200, clearSessionCookie(request))
}

async function handleMe(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await getSessionUser(sql, request)
  if (!user) return json({ error: 'Not signed in' }, 401)
  return json({ user })
}

export async function POST(request: Request): Promise<Response> {
  switch (actionFromUrl(request)) {
    case 'signup':
      return handleSignup(request)
    case 'login':
      return handleLogin(request)
    case 'logout':
      return handleLogout(request)
    case 'forgot-password':
      return handleForgotPassword(request)
    case 'reset-password':
      return handleResetPassword(request)
    default:
      return json({ error: 'Not found' }, 404)
  }
}

export async function GET(request: Request): Promise<Response> {
  if (actionFromUrl(request) === 'me') return handleMe(request)
  return json({ error: 'Method not allowed' }, 405)
}

export async function PATCH(request: Request): Promise<Response> {
  switch (actionFromUrl(request)) {
    case 'update-profile':
      return handleUpdateProfile(request)
    default:
      return json({ error: 'Not found' }, 404)
  }
}
