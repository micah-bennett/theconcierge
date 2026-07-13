import { dbUnavailable, getSql } from '../_lib/hopDb.js'
import { isResponse, json, requireUser } from '../_lib/hopAuth.js'

const FEELINGS = ['doing_well', 'stretched_thin', 'low_energy', 'overwhelmed'] as const
const SUPPORT_OPTIONS = ['meal', 'ride', 'errands', 'wellness_appt', 'time_back_home', 'talk_to_concierge'] as const
const SHIFT_PROTECTION_OPTIONS = ['yes', 'no', 'not_applicable'] as const

type Feeling = (typeof FEELINGS)[number]
type SupportOption = (typeof SUPPORT_OPTIONS)[number]
type ShiftProtection = (typeof SHIFT_PROTECTION_OPTIONS)[number]

type CheckInPayload = {
  feeling: Feeling
  desiredSupport: SupportOption
  note: string
  shiftProtection: ShiftProtection | null
}

function validate(value: unknown): CheckInPayload {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const feeling = source.feeling
  const desiredSupport = source.desiredSupport
  const note = typeof source.note === 'string' ? source.note.trim() : ''
  const shiftProtection = source.shiftProtection

  if (typeof feeling !== 'string' || !FEELINGS.includes(feeling as Feeling)) {
    throw new Error("Choose how you're feeling today")
  }
  if (typeof desiredSupport !== 'string' || !SUPPORT_OPTIONS.includes(desiredSupport as SupportOption)) {
    throw new Error('Choose what would help most')
  }
  if (note.length > 500) throw new Error('Note is too long')
  if (
    shiftProtection !== null &&
    shiftProtection !== undefined &&
    (typeof shiftProtection !== 'string' || !SHIFT_PROTECTION_OPTIONS.includes(shiftProtection as ShiftProtection))
  ) {
    throw new Error('Invalid shift-protection answer')
  }

  return {
    feeling: feeling as Feeling,
    desiredSupport: desiredSupport as SupportOption,
    note,
    shiftProtection: (shiftProtection as ShiftProtection | undefined) || null,
  }
}

export async function GET(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const rows =
    user.role === 'admin'
      ? await sql`
          SELECT c.id, c.feeling, c.desired_support, c.note, c.shift_protection, c.created_at,
                 u.id AS user_id, u.first_name, u.last_name, u.email
          FROM hop_wellness_checkins c
          JOIN hop_users u ON u.id = c.user_id
          ORDER BY c.created_at DESC
        `
      : await sql`
          SELECT id, feeling, desired_support, note, shift_protection, created_at
          FROM hop_wellness_checkins
          WHERE user_id = ${user.id}
          ORDER BY created_at DESC
          LIMIT 20
        `

  return json({ checkIns: rows })
}

export async function POST(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  try {
    const data = validate(await request.json())
    const rows = await sql`
      INSERT INTO hop_wellness_checkins (user_id, feeling, desired_support, note, shift_protection)
      VALUES (${user.id}, ${data.feeling}, ${data.desiredSupport}, ${data.note}, ${data.shiftProtection})
      RETURNING id, feeling, desired_support, note, shift_protection, created_at
    `
    return json({ checkIn: rows[0] }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not submit your check-in'
    const status = /Choose|too long|Invalid shift-protection/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP wellness check-in failed', error)
    return json({ error: status === 400 ? message : 'Could not submit your check-in' }, status)
  }
}
