import { randomBytes } from 'node:crypto'
import { dbUnavailable, getSql } from '../../_lib/hopDb.js'
import { sendHopConciergeInviteEmail } from '../../_lib/email.js'
import {
  createPasswordResetToken,
  hashPassword,
  isResponse,
  json,
  requireAdmin,
} from '../../_lib/hopAuth.js'

function actionFromUrl(request: Request): string {
  return new URL(request.url).searchParams.get('action') || ''
}

async function handleList(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const admin = await requireAdmin(sql, request)
  if (isResponse(admin)) return admin

  const rows = await sql`
    SELECT
      u.id, u.email, u.first_name, u.last_name, u.status, u.created_at,
      p.headline,
      COUNT(r.id) FILTER (WHERE r.status NOT IN ('completed', 'cancelled')) AS open_assigned
    FROM hop_users u
    LEFT JOIN hop_concierge_profiles p ON p.user_id = u.id
    LEFT JOIN hop_service_requests r ON r.handled_by = u.id
    WHERE u.role = 'concierge'
    GROUP BY u.id, p.headline
    ORDER BY u.created_at DESC
  `
  return json({ concierges: rows })
}

type CreatePayload = { email: string; firstName: string; lastName: string }

function validateCreate(value: unknown): CreatePayload {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const email = typeof source.email === 'string' ? source.email.trim().toLowerCase() : ''
  const firstName = typeof source.firstName === 'string' ? source.firstName.trim() : ''
  const lastName = typeof source.lastName === 'string' ? source.lastName.trim() : ''

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address')
  if (!firstName || firstName.length > 80) throw new Error('Enter a first name')
  if (!lastName || lastName.length > 80) throw new Error('Enter a last name')

  return { email, firstName, lastName }
}

// Admin-driven, in-app account creation — there is no self-serve concierge signup. Generates a
// random temporary password so the account works immediately, and separately emails a
// password-reset link so the concierge can set their own password. If RESEND_API_KEY isn't
// configured (or sending fails), the temp password is returned in the response so the admin can
// hand it over directly — see docs/vercel-setup.md before assuming email is the only path.
async function handleCreate(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const admin = await requireAdmin(sql, request)
  if (isResponse(admin)) return admin

  try {
    const data = validateCreate(await request.json())

    const existing = await sql`SELECT id FROM hop_users WHERE LOWER(email) = ${data.email}`
    if (existing.length > 0) return json({ error: 'An account with that email already exists' }, 409)

    const temporaryPassword = randomBytes(9).toString('base64url')
    const passwordHash = await hashPassword(temporaryPassword)

    const rows = await sql`
      INSERT INTO hop_users (email, password_hash, first_name, last_name, role)
      VALUES (${data.email}, ${passwordHash}, ${data.firstName}, ${data.lastName}, 'concierge')
      RETURNING id, email, first_name, last_name, status, created_at
    `
    const row = rows[0] as {
      id: string
      email: string
      first_name: string
      last_name: string
      status: string
      created_at: string
    }

    let emailSent = false
    try {
      const token = await createPasswordResetToken(sql, row.id)
      const origin = new URL(request.url).origin
      const resetUrl = `${origin}/hop/reset-password?token=${token}`
      await sendHopConciergeInviteEmail(row.email, row.first_name, resetUrl)
      emailSent = true
    } catch (error) {
      console.error('HOP concierge invite email failed (account still created)', {
        userId: row.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return json(
      {
        concierge: { ...row, headline: null, open_assigned: 0 },
        temporaryPassword: emailSent ? null : temporaryPassword,
        emailSent,
      },
      201,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create the concierge account'
    const status = /Invalid|valid|Enter/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP concierge create failed', error)
    return json({ error: status === 400 ? message : 'Could not create the concierge account' }, status)
  }
}

async function handleUpdateStatus(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const admin = await requireAdmin(sql, request)
  if (isResponse(admin)) return admin

  try {
    const body = (await request.json()) as { id?: unknown; status?: unknown }
    const id = body.id
    const status = body.status
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid concierge id')
    if (status !== 'active' && status !== 'disabled') throw new Error('Choose a valid status')

    const rows = await sql`
      UPDATE hop_users
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${id} AND role = 'concierge'
      RETURNING id, email, first_name, last_name, status, created_at
    `
    if (rows.length === 0) return json({ error: 'Concierge not found' }, 404)

    if (status === 'disabled') {
      await sql`DELETE FROM hop_sessions WHERE user_id = ${id}`
    }

    return json({ concierge: rows[0] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update the concierge'
    const status = /Choose a valid|Invalid concierge id/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP concierge status update failed', error)
    return json({ error: status === 400 ? message : 'Could not update the concierge' }, status)
  }
}

export async function GET(request: Request): Promise<Response> {
  return handleList(request)
}

export async function POST(request: Request): Promise<Response> {
  switch (actionFromUrl(request)) {
    case 'create':
      return handleCreate(request)
    default:
      return json({ error: 'Not found' }, 404)
  }
}

export async function PATCH(request: Request): Promise<Response> {
  return handleUpdateStatus(request)
}
