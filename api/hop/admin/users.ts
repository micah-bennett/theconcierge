import { dbUnavailable, getSql } from '../../_lib/hopDb.js'
import { isResponse, json, requireAdmin } from '../../_lib/hopAuth.js'

export async function GET(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const admin = await requireAdmin(sql, request)
  if (isResponse(admin)) return admin

  // ?scope=staff is a short, read-only list of eligible assignees for the dispatch UI
  // (HopAdminRequestsPage.tsx) — deliberately never includes role='user' accounts.
  if (new URL(request.url).searchParams.get('scope') === 'staff') {
    const staff = await sql`
      SELECT id, first_name, last_name, email
      FROM hop_users
      WHERE role = 'admin' AND status = 'active'
      ORDER BY first_name, last_name
    `
    return json({ staff })
  }

  const rows = await sql`
    SELECT
      u.id, u.email, u.first_name, u.last_name, u.role, u.status, u.created_at,
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
