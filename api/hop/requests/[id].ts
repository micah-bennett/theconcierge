import { dbUnavailable, getSql } from '../../_lib/hopDb.js'
import { isResponse, json, requireAdmin } from '../../_lib/hopAuth.js'

const STATUSES = ['submitted', 'in_progress', 'completed', 'cancelled'] as const
type Status = (typeof STATUSES)[number]

function requestId(request: Request): string {
  const segments = new URL(request.url).pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

export async function PATCH(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const admin = await requireAdmin(sql, request)
  if (isResponse(admin)) return admin

  const id = requestId(request)
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Invalid request id' }, 400)

  try {
    const body = (await request.json()) as { status?: unknown }
    const status = body.status
    if (typeof status !== 'string' || !STATUSES.includes(status as Status)) {
      throw new Error('Choose a valid status')
    }

    const rows = await sql`
      UPDATE hop_service_requests
      SET status = ${status}, handled_by = ${admin.id}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, service_type, status, details, requested_for, created_at, updated_at
    `
    if (rows.length === 0) return json({ error: 'Request not found' }, 404)
    return json({ request: rows[0] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update the request'
    const status = /Choose a valid/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP request update failed', error)
    return json({ error: status === 400 ? message : 'Could not update the request' }, status)
  }
}

export function GET(): Response {
  return json({ error: 'Method not allowed' }, 405)
}
