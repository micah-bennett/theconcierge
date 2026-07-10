import { dbUnavailable, getSql } from '../../../_lib/hopDb.js'
import { isResponse, json, requireAdmin } from '../../../_lib/hopAuth.js'

function userId(request: Request): string {
  const segments = new URL(request.url).pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

export async function PATCH(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const admin = await requireAdmin(sql, request)
  if (isResponse(admin)) return admin

  const id = userId(request)
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Invalid user id' }, 400)

  try {
    const body = (await request.json()) as { status?: unknown }
    const status = body.status
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
    const status = /Choose a valid/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP admin user update failed', error)
    return json({ error: status === 400 ? message : 'Could not update the user' }, status)
  }
}

export function GET(): Response {
  return json({ error: 'Method not allowed' }, 405)
}
