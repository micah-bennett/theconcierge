import { dbUnavailable, getSql } from '../_lib/hopDb.js'
import { isResponse, json, requireStaff, requireUser } from '../_lib/hopAuth.js'

// Reduced scope for this cycle (see docs/hop/roadmap.md for the full future design): a member can
// view their own ledger/balance, and staff can award points. No ?action=redeem — that's
// deliberately not built yet. source is always set server-side from the caller's role, never
// accepted from the client, so the audit trail can be trusted.

function actionFromUrl(request: Request): string {
  return new URL(request.url).searchParams.get('action') || ''
}

async function handleGetOwn(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const ledger = await sql`
    SELECT id, delta, source, reason, created_at
    FROM hop_points_ledger
    WHERE user_id = ${user.id}
    ORDER BY created_at DESC
  `
  const balanceRows = await sql`
    SELECT COALESCE(SUM(delta), 0) AS balance FROM hop_points_ledger WHERE user_id = ${user.id}
  `
  const balance = Number((balanceRows[0] as { balance: number }).balance)

  return json({ ledger, balance })
}

type AwardPayload = { userId: string; delta: number; reason: string }

function validateAward(value: unknown): AwardPayload {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const userId = typeof source.userId === 'string' ? source.userId : ''
  const delta = typeof source.delta === 'number' ? Math.trunc(source.delta) : NaN
  const reason = typeof source.reason === 'string' ? source.reason.trim() : ''

  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('Invalid user id')
  if (!Number.isFinite(delta) || delta < 1 || delta > 1000) {
    throw new Error('Enter a point amount between 1 and 1000')
  }
  if (reason.length > 200) throw new Error('Reason is too long')

  return { userId, delta, reason }
}

// Staff-only manual award — no ?action=redeem exists, so this is currently the only way points
// ever get added to a member's balance (see docs/hop/roadmap.md for the deferred auto-earning
// rules). source is derived from the caller's own role, never client-supplied.
async function handleAward(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const staff = await requireStaff(sql, request)
  if (isResponse(staff)) return staff

  try {
    const data = validateAward(await request.json())

    const recipient = await sql`SELECT id FROM hop_users WHERE id = ${data.userId} AND role = 'user'`
    if (recipient.length === 0) return json({ error: 'Member not found' }, 404)

    const source = staff.role === 'concierge' ? 'concierge_award' : 'admin_award'
    const rows = await sql`
      INSERT INTO hop_points_ledger (user_id, delta, source, reason, awarded_by)
      VALUES (${data.userId}, ${data.delta}, ${source}, ${data.reason}, ${staff.id})
      RETURNING id, delta, source, reason, created_at
    `
    const balanceRows = await sql`
      SELECT COALESCE(SUM(delta), 0) AS balance FROM hop_points_ledger WHERE user_id = ${data.userId}
    `
    const balance = Number((balanceRows[0] as { balance: number }).balance)

    return json({ entry: rows[0], balance }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not award points'
    const status = /Invalid user id|Enter a point amount|too long/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP rewards award failed', error)
    return json({ error: status === 400 ? message : 'Could not award points' }, status)
  }
}

export async function GET(request: Request): Promise<Response> {
  return handleGetOwn(request)
}

export async function POST(request: Request): Promise<Response> {
  switch (actionFromUrl(request)) {
    case 'award':
      return handleAward(request)
    default:
      return json({ error: 'Not found' }, 404)
  }
}
