import type { NeonQueryFunction } from '@neondatabase/serverless'
import { dbUnavailable, getSql } from '../_lib/hopDb.js'
import { isResponse, json, requireUser } from '../_lib/hopAuth.js'

type Sql = NeonQueryFunction<false, false>

function actionFromUrl(request: Request): string {
  return new URL(request.url).searchParams.get('action') || ''
}

type RequestRow = { id: string; user_id: string; service_type: string; status: string; handled_by: string | null }

async function loadRequest(sql: Sql, requestId: string): Promise<RequestRow | undefined> {
  const rows = await sql`
    SELECT id, user_id, service_type, status, handled_by FROM hop_service_requests WHERE id = ${requestId}
  `
  return rows[0] as RequestRow | undefined
}

// GET ?requestId= — member (request owner) or any admin, only while the ride is actively en
// route. Returns { location: null } for every other case rather than an error, so this can't be
// used to probe whether a request exists or what its status is.
async function handleGet(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const requestId = new URL(request.url).searchParams.get('requestId') || ''
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return json({ location: null })

  const target = await loadRequest(sql, requestId)
  if (!target) return json({ location: null })
  if (user.role !== 'admin' && target.user_id !== user.id) return json({ location: null })
  if (target.service_type !== 'ride' || target.status !== 'en_route') return json({ location: null })

  const rows = await sql`
    SELECT latitude, longitude, updated_at FROM hop_ride_locations WHERE request_id = ${requestId}
  `
  const row = rows[0] as { latitude: number; longitude: number; updated_at: string } | undefined
  if (!row) return json({ location: null })

  return json({ location: { latitude: row.latitude, longitude: row.longitude, updatedAt: row.updated_at } })
}

function validateCoords(value: unknown): { latitude: number; longitude: number } {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const latitude = source.latitude
  const longitude = source.longitude
  if (typeof latitude !== 'number' || Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
    throw new Error('Invalid latitude')
  }
  if (typeof longitude !== 'number' || Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Invalid longitude')
  }
  return { latitude, longitude }
}

// POST ?action=update — only the staff member this ride is assigned to, and only while the
// request is actually service_type=ride and status=en_route. No location is ever accepted for
// any other request.
async function handleUpdate(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user
  if (user.role !== 'admin') return json({ error: 'Not allowed' }, 403)

  try {
    const body = (await request.json()) as { requestId?: unknown; latitude?: unknown; longitude?: unknown }
    const requestId = body.requestId
    if (typeof requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(requestId)) {
      throw new Error('Invalid request id')
    }
    const { latitude, longitude } = validateCoords(body)

    const target = await loadRequest(sql, requestId)
    if (!target) return json({ error: 'Request not found' }, 404)
    if (target.handled_by !== user.id) {
      return json({ error: 'Only the assigned staff member can share location for this ride' }, 403)
    }
    if (target.service_type !== 'ride' || target.status !== 'en_route') {
      return json({ error: 'Location can only be shared while a ride is en route' }, 409)
    }

    await sql`
      INSERT INTO hop_ride_locations (request_id, shared_by, latitude, longitude, updated_at)
      VALUES (${requestId}, ${user.id}, ${latitude}, ${longitude}, NOW())
      ON CONFLICT (request_id) DO UPDATE SET
        shared_by = EXCLUDED.shared_by,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        updated_at = NOW()
    `
    return json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update location'
    const status = /Invalid|only the assigned/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP ride location update failed', error)
    return json({ error: status === 400 ? message : 'Could not update location' }, status)
  }
}

// POST ?action=stop — any admin can force-stop sharing (e.g. a supervisor), not just the
// originally assigned staff member.
async function handleStop(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user
  if (user.role !== 'admin') return json({ error: 'Not allowed' }, 403)

  try {
    const body = (await request.json()) as { requestId?: unknown }
    const requestId = body.requestId
    if (typeof requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(requestId)) {
      throw new Error('Invalid request id')
    }
    await sql`DELETE FROM hop_ride_locations WHERE request_id = ${requestId}`
    return json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not stop sharing location'
    const status = /Invalid/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP ride location stop failed', error)
    return json({ error: status === 400 ? message : 'Could not stop sharing location' }, status)
  }
}

export async function GET(request: Request): Promise<Response> {
  return handleGet(request)
}

export async function POST(request: Request): Promise<Response> {
  switch (actionFromUrl(request)) {
    case 'update':
      return handleUpdate(request)
    case 'stop':
      return handleStop(request)
    default:
      return json({ error: 'Not found' }, 404)
  }
}
