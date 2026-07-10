import { dbUnavailable, getSql } from '../../_lib/hopDb.js'
import { isResponse, json, requireAdmin } from '../../_lib/hopAuth.js'

export async function GET(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const admin = await requireAdmin(sql, request)
  if (isResponse(admin)) return admin

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

export function POST(): Response {
  return json({ error: 'Method not allowed' }, 405)
}
