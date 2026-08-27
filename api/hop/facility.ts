import { dbUnavailable, getSql } from '../_lib/hopDb.js'
import { isResponse, json, requireFacility, requireFacilityOrStaff } from '../_lib/hopAuth.js'

// Staff-portal only — see "Facility portal" in docs/hop/architecture.md. Everything here is
// site-wide aggregate, not scoped to one facility client (no facilities/tenancy table exists in
// this schema yet — see that doc section for what a second facility client would require).
// Hard rule carried over from the wellness check-in principle: morale/heat-map/retention data is
// always aggregate/de-identified, never per-individual — no query in this file ever returns a
// hop_users.id or name alongside mood/heatmap data.

function actionFromUrl(request: Request): string {
  return new URL(request.url).searchParams.get('action') || ''
}

// ── ?action=overview ─────────────────────────────────────────────────────────────────────

async function handleOverview(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const facility = await requireFacility(sql, request)
  if (isResponse(facility)) return facility

  // Today's on-duty count/names — reuses the same hop_duty_log query shape as
  // admin/users.ts?scope=on-duty. Attendance is not a wellness signal, so names are fine here.
  const onDutyRows = await sql`
    SELECT DISTINCT ON (u.id) u.id, u.first_name, u.last_name, u.role, d.clock_in_at
    FROM hop_duty_log d
    JOIN hop_users u ON u.id = d.user_id
    WHERE d.clock_out_at IS NULL
    ORDER BY u.id, d.clock_in_at DESC
  `

  // "Worked past shift end" — duty rows today where clock_out_at (or now, if still open) is
  // later than that user's default_shift_end_time. default_shift_end_time is a per-user
  // TIME-of-day default, not a real per-day schedule — see docs/hop/architecture.md.
  const overtimeRows = await sql`
    SELECT COUNT(*)::int AS count
    FROM hop_duty_log d
    JOIN hop_users u ON u.id = d.user_id
    WHERE d.clock_in_at::date = CURRENT_DATE
      AND u.default_shift_end_time IS NOT NULL
      AND COALESCE(d.clock_out_at, NOW()) > (d.clock_in_at::date + u.default_shift_end_time)
  `
  const overtimeCount = (overtimeRows[0] as { count: number }).count

  // Today's mood check-ins, grouped by level — percentages only, no user_id.
  const moodRows = await sql`
    SELECT level, COUNT(*)::int AS count
    FROM hop_mood_checkins
    WHERE created_at::date = CURRENT_DATE
    GROUP BY level
  `
  const moodTotal = (moodRows as { level: string; count: number }[]).reduce((sum, r) => sum + r.count, 0)
  const morale = (moodRows as { level: string; count: number }[]).map((r) => ({
    level: r.level,
    percent: moodTotal > 0 ? Math.round((r.count / moodTotal) * 100) : 0,
  }))

  return json({
    onDuty: onDutyRows.map((r) => ({
      id: (r as { id: string }).id,
      first_name: (r as { first_name: string }).first_name,
      last_name: (r as { last_name: string }).last_name,
      role: (r as { role: string }).role,
    })),
    onDutyCount: onDutyRows.length,
    overtimeCount,
    morale,
    moodResponseCount: moodTotal,
  })
}

// ── ?action=heatmap — mood check-ins by hour-of-day x department, aggregate only ──────────

async function handleHeatmap(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const facility = await requireFacility(sql, request)
  if (isResponse(facility)) return facility

  const rows = await sql`
    SELECT
      EXTRACT(HOUR FROM c.created_at)::int AS hour,
      COALESCE(u.department, 'Unspecified') AS department,
      c.level,
      COUNT(*)::int AS count
    FROM hop_mood_checkins c
    JOIN hop_users u ON u.id = c.user_id
    WHERE c.created_at > NOW() - INTERVAL '30 days'
    GROUP BY hour, department, c.level
    ORDER BY hour, department
  `
  return json({ buckets: rows })
}

// ── ?action=request-stats — hop_service_requests counts by day/week/month/year, site-wide ──

async function handleRequestStats(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const facility = await requireFacility(sql, request)
  if (isResponse(facility)) return facility

  const daily = await sql`
    SELECT created_at::date AS bucket, COUNT(*)::int AS count
    FROM hop_service_requests
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY bucket
    ORDER BY bucket
  `
  const weekly = await sql`
    SELECT DATE_TRUNC('week', created_at)::date AS bucket, COUNT(*)::int AS count
    FROM hop_service_requests
    WHERE created_at > NOW() - INTERVAL '26 weeks'
    GROUP BY bucket
    ORDER BY bucket
  `
  const monthly = await sql`
    SELECT DATE_TRUNC('month', created_at)::date AS bucket, COUNT(*)::int AS count
    FROM hop_service_requests
    WHERE created_at > NOW() - INTERVAL '12 months'
    GROUP BY bucket
    ORDER BY bucket
  `
  const yearly = await sql`
    SELECT DATE_TRUNC('year', created_at)::date AS bucket, COUNT(*)::int AS count
    FROM hop_service_requests
    GROUP BY bucket
    ORDER BY bucket
  `
  const totalRows = await sql`SELECT COUNT(*)::int AS count FROM hop_service_requests`

  return json({
    daily,
    weekly,
    monthly,
    yearly,
    total: (totalRows[0] as { count: number }).count,
  })
}

// ── ?action=retention — manually-logged cost-savings entries, aggregate/non-identifying ────
// Deliberately not computed/derived — a staff judgment call recorded as a bookkeeping entry, no
// member_id. See hop_retention_events in db/schema.sql and docs/hop/architecture.md.

async function handleGetRetention(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const facility = await requireFacility(sql, request)
  if (isResponse(facility)) return facility

  const events = await sql`
    SELECT id, role_title, estimated_cost, note, created_at
    FROM hop_retention_events
    ORDER BY created_at DESC
  `
  const totalRows = await sql`SELECT COALESCE(SUM(estimated_cost), 0)::int AS total FROM hop_retention_events`

  return json({ events, total: (totalRows[0] as { total: number }).total })
}

type RetentionPayload = { roleTitle: string; estimatedCost: number; note: string }

function validateRetention(value: unknown): RetentionPayload {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const roleTitle = typeof source.roleTitle === 'string' ? source.roleTitle.trim() : ''
  const estimatedCost = typeof source.estimatedCost === 'number' ? Math.trunc(source.estimatedCost) : NaN
  const note = typeof source.note === 'string' ? source.note.trim() : ''

  if (!roleTitle || roleTitle.length > 120) throw new Error('Enter a role')
  if (!Number.isFinite(estimatedCost) || estimatedCost < 0 || estimatedCost > 10_000_000) {
    throw new Error('Enter a realistic estimated cost')
  }
  if (note.length > 500) throw new Error('Note is too long')

  return { roleTitle, estimatedCost, note }
}

async function handleAddRetention(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const staff = await requireFacilityOrStaff(sql, request)
  if (isResponse(staff)) return staff

  try {
    const data = validateRetention(await request.json())
    const rows = await sql`
      INSERT INTO hop_retention_events (role_title, estimated_cost, note, recorded_by)
      VALUES (${data.roleTitle}, ${data.estimatedCost}, ${data.note}, ${staff.id})
      RETURNING id, role_title, estimated_cost, note, created_at
    `
    return json({ event: rows[0] }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not log this entry'
    const status = /Enter a|too long/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP retention event add failed', error)
    return json({ error: status === 400 ? message : 'Could not log this entry' }, status)
  }
}

export async function GET(request: Request): Promise<Response> {
  switch (actionFromUrl(request)) {
    case 'overview':
      return handleOverview(request)
    case 'heatmap':
      return handleHeatmap(request)
    case 'request-stats':
      return handleRequestStats(request)
    case 'retention':
      return handleGetRetention(request)
    default:
      return json({ error: 'Not found' }, 404)
  }
}

export async function POST(request: Request): Promise<Response> {
  switch (actionFromUrl(request)) {
    case 'retention':
      return handleAddRetention(request)
    default:
      return json({ error: 'Not found' }, 404)
  }
}
