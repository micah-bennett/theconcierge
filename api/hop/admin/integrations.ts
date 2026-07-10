import { dbUnavailable, getSql } from '../../_lib/hopDb.js'
import { isResponse, json, requireAdmin } from '../../_lib/hopAuth.js'

export async function GET(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const admin = await requireAdmin(sql, request)
  if (isResponse(admin)) return admin

  const rows = await sql`
    SELECT
      i.provider, i.status, i.connected_at, i.last_synced_at,
      u.id AS user_id, u.first_name, u.last_name, u.email
    FROM hop_integrations i
    JOIN hop_users u ON u.id = i.user_id
    ORDER BY i.connected_at DESC NULLS LAST
  `
  return json({ integrations: rows })
}

export function POST(): Response {
  return json({ error: 'Method not allowed' }, 405)
}
