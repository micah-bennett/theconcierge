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

function typeFromUrl(request: Request): string {
  return new URL(request.url).searchParams.get('type') || ''
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

async function handleCheckInGet(request: Request): Promise<Response> {
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

async function handleCheckInPost(request: Request): Promise<Response> {
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

// ── ?type=metrics — self-reported daily steps/sleep/mood, a separate table+purpose from the
// check-in above (see hop_daily_metrics's schema comment) — used for HopWellnessPage.tsx's
// trends chart and HopDashboardPage.tsx's daily-check-in nag. Self-reported this cycle, not real
// wearable data — see docs/hop/architecture.md.

type DailyMetricsPayload = { steps: number | null; sleepHours: number | null; mood: number | null }

function validateDailyMetrics(value: unknown): DailyMetricsPayload {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const steps = source.steps
  const sleepHours = source.sleepHours
  const mood = source.mood

  if (steps !== null && steps !== undefined && (typeof steps !== 'number' || steps < 0 || steps > 100000)) {
    throw new Error('Enter a realistic step count')
  }
  if (
    sleepHours !== null &&
    sleepHours !== undefined &&
    (typeof sleepHours !== 'number' || sleepHours < 0 || sleepHours > 24)
  ) {
    throw new Error('Enter a realistic number of sleep hours')
  }
  if (mood !== null && mood !== undefined && (typeof mood !== 'number' || mood < 1 || mood > 5)) {
    throw new Error('Choose a mood between 1 and 5')
  }

  return {
    steps: (steps as number | null | undefined) ?? null,
    sleepHours: (sleepHours as number | null | undefined) ?? null,
    mood: (mood as number | null | undefined) ?? null,
  }
}

async function handleMetricsGet(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const rows = await sql`
    SELECT id, log_date, steps, sleep_hours, mood, created_at
    FROM hop_daily_metrics
    WHERE user_id = ${user.id}
    ORDER BY log_date DESC
    LIMIT 30
  `
  const loggedToday = (rows as { log_date: string }[]).some(
    (r) => r.log_date === new Date().toISOString().slice(0, 10),
  )
  return json({ metrics: rows, loggedToday })
}

async function handleMetricsPost(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  try {
    const data = validateDailyMetrics(await request.json())
    const rows = await sql`
      INSERT INTO hop_daily_metrics (user_id, steps, sleep_hours, mood)
      VALUES (${user.id}, ${data.steps}, ${data.sleepHours}, ${data.mood})
      ON CONFLICT (user_id, log_date) DO UPDATE
        SET steps = EXCLUDED.steps, sleep_hours = EXCLUDED.sleep_hours, mood = EXCLUDED.mood
      RETURNING id, log_date, steps, sleep_hours, mood, created_at
    `
    return json({ entry: rows[0] }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save your numbers'
    const status = /Enter a|Choose a mood/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP daily metrics save failed', error)
    return json({ error: status === 400 ? message : 'Could not save your numbers' }, status)
  }
}

// ── ?type=mood — one-tap anonymized mood check-in feeding the Facility portal's aggregate
// morale/heatmap views (api/hop/facility.ts, staff-portal only). Write-only from this file —
// there is no per-user read endpoint for this table; aggregate reads live exclusively in
// facility.ts. See docs/hop/architecture.md, "Facility portal".

const MOOD_LEVELS = ['green', 'yellow', 'orange', 'red'] as const
type MoodLevel = (typeof MOOD_LEVELS)[number]

function validateMoodCheckIn(value: unknown): { level: MoodLevel; note: string } {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const level = source.level
  const note = typeof source.note === 'string' ? source.note.trim() : ''

  if (typeof level !== 'string' || !MOOD_LEVELS.includes(level as MoodLevel)) {
    throw new Error('Choose how you feel right now')
  }
  if (note.length > 300) throw new Error('Note is too long')

  return { level: level as MoodLevel, note }
}

async function handleMoodPost(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  try {
    const data = validateMoodCheckIn(await request.json())
    const rows = await sql`
      INSERT INTO hop_mood_checkins (user_id, level, note)
      VALUES (${user.id}, ${data.level}, ${data.note})
      RETURNING id, level, note, created_at
    `
    return json({ checkIn: rows[0] }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not submit your check-in'
    const status = /Choose|too long/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP mood check-in failed', error)
    return json({ error: status === 400 ? message : 'Could not submit your check-in' }, status)
  }
}

export async function GET(request: Request): Promise<Response> {
  switch (typeFromUrl(request)) {
    case 'metrics':
      return handleMetricsGet(request)
    default:
      return handleCheckInGet(request)
  }
}

export async function POST(request: Request): Promise<Response> {
  switch (typeFromUrl(request)) {
    case 'metrics':
      return handleMetricsPost(request)
    case 'mood':
      return handleMoodPost(request)
    default:
      return handleCheckInPost(request)
  }
}
