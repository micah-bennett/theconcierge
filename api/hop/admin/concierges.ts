import { randomBytes } from 'node:crypto'
import { dbUnavailable, getSql } from '../../_lib/hopDb.js'
import { sendHopAccountInviteEmail } from '../../_lib/email.js'
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

// Lists/manages 'concierge' AND 'facility' rows — both are staff-created-only roles with no
// self-serve signup, shown together on the Team page. A member account (role='user') created via
// handleCreate below shows up on the existing Users tab (api/hop/admin/users.ts) instead, since
// it's the same hop_users table and that tab already lists/toggles every 'user' row. Keeping
// member accounts off this list avoids two places managing the same accounts.
async function handleList(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const admin = await requireAdmin(sql, request)
  if (isResponse(admin)) return admin

  const rows = await sql`
    SELECT
      u.id, u.email, u.hop_number, u.first_name, u.last_name, u.status, u.created_at, u.role,
      u.default_shift_end_time, u.department,
      p.headline,
      COUNT(r.id) FILTER (WHERE r.status NOT IN ('completed', 'cancelled')) AS open_assigned
    FROM hop_users u
    LEFT JOIN hop_concierge_profiles p ON p.user_id = u.id
    LEFT JOIN hop_service_requests r ON r.handled_by = u.id
    WHERE u.role IN ('concierge', 'facility')
    GROUP BY u.id, p.headline
    ORDER BY u.created_at DESC
  `
  return json({ concierges: rows })
}

type CreatePayload = {
  email: string
  firstName: string
  lastName: string
  role: 'user' | 'concierge' | 'facility'
  defaultShiftEndTime: string | null
}

function validateCreate(value: unknown): CreatePayload {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const email = typeof source.email === 'string' ? source.email.trim().toLowerCase() : ''
  const firstName = typeof source.firstName === 'string' ? source.firstName.trim() : ''
  const lastName = typeof source.lastName === 'string' ? source.lastName.trim() : ''
  // Default to 'concierge' for backward compatibility with any caller that doesn't send role yet.
  const role = source.role === 'user' ? 'user' : source.role === 'facility' ? 'facility' : 'concierge'
  const defaultShiftEndTime = source.defaultShiftEndTime
  const shiftEndTimeStr =
    typeof defaultShiftEndTime === 'string' && /^\d{2}:\d{2}$/.test(defaultShiftEndTime)
      ? defaultShiftEndTime
      : null

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address')
  if (!firstName || firstName.length > 80) throw new Error('Enter a first name')
  if (!lastName || lastName.length > 80) throw new Error('Enter a last name')

  return { email, firstName, lastName, role, defaultShiftEndTime: shiftEndTimeStr }
}

// Admin-driven, in-app account creation for concierge, member (role='user'), and facility
// accounts — there is no self-serve signup for any staff role, and the member path is an
// additional option alongside the self-serve member signup on main (both stay live). Generates a
// random temporary password so the account works immediately, and separately emails a
// password-reset-style invite link plus the account's permanent HOP number. If RESEND_API_KEY
// isn't configured (or sending fails), the temp password is returned in the response so the
// admin can hand it over directly — see docs/vercel-setup.md before assuming email is the only
// path.
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
      INSERT INTO hop_users (email, password_hash, first_name, last_name, role, default_shift_end_time)
      VALUES (${data.email}, ${passwordHash}, ${data.firstName}, ${data.lastName}, ${data.role}, ${data.defaultShiftEndTime})
      RETURNING id, email, hop_number, first_name, last_name, status, created_at, role
    `
    const row = rows[0] as {
      id: string
      email: string
      hop_number: string
      first_name: string
      last_name: string
      status: string
      created_at: string
      role: string
    }

    let emailSent = false
    try {
      const token = await createPasswordResetToken(sql, row.id)
      const origin = new URL(request.url).origin
      const resetUrl = `${origin}/hop/reset-password?token=${token}`
      await sendHopAccountInviteEmail(row.email, data.role, row.first_name, row.hop_number, resetUrl)
      emailSent = true
    } catch (error) {
      console.error('HOP account invite email failed (account still created)', {
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
    const message = error instanceof Error ? error.message : 'Could not create the account'
    const status = /Invalid|valid|Enter/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP account create failed', error)
    return json({ error: status === 400 ? message : 'Could not create the account' }, status)
  }
}

async function handleUpdateStatus(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const admin = await requireAdmin(sql, request)
  if (isResponse(admin)) return admin

  try {
    const body = (await request.json()) as {
      id?: unknown
      status?: unknown
      defaultShiftEndTime?: unknown
      department?: unknown
    }
    const id = body.id
    const status = body.status
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid concierge id')
    if (status !== undefined && status !== 'active' && status !== 'disabled') throw new Error('Choose a valid status')

    const defaultShiftEndTime =
      typeof body.defaultShiftEndTime === 'string' && /^\d{2}:\d{2}$/.test(body.defaultShiftEndTime)
        ? body.defaultShiftEndTime
        : null
    const department = typeof body.department === 'string' ? body.department.trim().slice(0, 120) : null

    const rows = await sql`
      UPDATE hop_users
      SET
        status = COALESCE(${status ?? null}, status),
        default_shift_end_time = COALESCE(${defaultShiftEndTime}, default_shift_end_time),
        department = COALESCE(${department}, department),
        updated_at = NOW()
      WHERE id = ${id} AND role IN ('concierge', 'facility')
      RETURNING id, email, first_name, last_name, status, created_at, role
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
