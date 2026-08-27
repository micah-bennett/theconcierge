import { dbUnavailable, getSql } from '../../_lib/hopDb.js'
import { isResponse, json, requireAdmin, requireStaff } from '../../_lib/hopAuth.js'

export async function GET(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  // ?scope=staff is a short, read-only list of eligible assignees for the dispatch UI
  // (HopAdminRequestsPage.tsx) — deliberately never includes role='user' accounts. Includes
  // 'concierge' alongside 'admin' now that concierges can be assigned to requests too.
  // requireStaff (not requireAdmin), widened 2026-08-27: concierges browsing this same
  // directory to start a staff-to-staff message thread (HopConciergeMessagesPage.tsx) need it
  // too — a read-only, low-risk widening. Every other scope below stays admin-only.
  if (new URL(request.url).searchParams.get('scope') === 'staff') {
    const staff = await requireStaff(sql, request)
    if (isResponse(staff)) return staff
    const rows = await sql`
      SELECT id, first_name, last_name, email, role
      FROM hop_users
      WHERE role IN ('admin', 'concierge') AND status = 'active'
      ORDER BY first_name, last_name
    `
    return json({ staff: rows })
  }

  const admin = await requireAdmin(sql, request)
  if (isResponse(admin)) return admin

  // ?scope=on-duty — concierges/admins currently on duty (an open hop_duty_log row), for the
  // admin dashboard's "working today" roster. Staff-portal only: the self-toggle that writes
  // to hop_duty_log lives on api/hop/concierge.ts, which only exists on this deployment. See
  // docs/hop/architecture.md ("Phase 1 quick wins").
  if (new URL(request.url).searchParams.get('scope') === 'on-duty') {
    const onDuty = await sql`
      SELECT DISTINCT ON (u.id) u.id, u.first_name, u.last_name, u.role, d.clock_in_at
      FROM hop_duty_log d
      JOIN hop_users u ON u.id = d.user_id
      WHERE d.clock_out_at IS NULL
      ORDER BY u.id, d.clock_in_at DESC
    `
    return json({ onDuty })
  }

  // ?scope=integrations — folded in from the former api/hop/admin/integrations.ts (2026-07-23,
  // function-budget consolidation, see docs/hop/architecture.md). Every user's connection
  // status across every provider, for the admin integrations triage table.
  if (new URL(request.url).searchParams.get('scope') === 'integrations') {
    const integrations = await sql`
      SELECT
        i.provider, i.status, i.connected_at, i.last_synced_at,
        u.id AS user_id, u.first_name, u.last_name, u.email
      FROM hop_integrations i
      JOIN hop_users u ON u.id = i.user_id
      ORDER BY i.connected_at DESC NULLS LAST
    `
    return json({ integrations })
  }

  const rows = await sql`
    SELECT
      u.id, u.email, u.hop_number, u.first_name, u.last_name, u.phone, u.role, u.status, u.created_at,
      COUNT(i.id) FILTER (WHERE i.status = 'connected') AS connected_integrations
    FROM hop_users u
    LEFT JOIN hop_integrations i ON i.user_id = u.id
    WHERE u.role = 'user'
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `
  return json({ users: rows })
}

export async function PATCH(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const admin = await requireAdmin(sql, request)
  if (isResponse(admin)) return admin

  try {
    const body = (await request.json()) as { id?: unknown; status?: unknown }
    const id = body.id
    const status = body.status
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid user id')
    if (status !== 'active' && status !== 'disabled') throw new Error('Choose a valid status')

    const rows = await sql`
      UPDATE hop_users
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${id} AND role = 'user'
      RETURNING id, email, first_name, last_name, role, status
    `
    if (rows.length === 0) return json({ error: 'User not found' }, 404)

    if (status === 'disabled') {
      await sql`DELETE FROM hop_sessions WHERE user_id = ${id}`
    }

    return json({ user: rows[0] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update the user'
    const status = /Choose a valid|Invalid user id/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP admin user update failed', error)
    return json({ error: status === 400 ? message : 'Could not update the user' }, status)
  }
}
