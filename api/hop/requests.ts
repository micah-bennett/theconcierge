import type { NeonQueryFunction } from '@neondatabase/serverless'
import { dbUnavailable, getSql } from '../_lib/hopDb.js'
import { isResponse, json, requireStaff, requireUser } from '../_lib/hopAuth.js'
import {
  isValidStatus,
  isValidStatusTransition,
  nextValidStatuses,
  requiresAcceptance,
} from '../_lib/hopRequestWorkflow.js'
import type { RequestStatus } from '../_lib/hopRequestWorkflow.js'

type Sql = NeonQueryFunction<false, false>

const SERVICE_TYPES = ['ride', 'meal', 'errand', 'wellness', 'family_home', 'other'] as const
type ServiceType = (typeof SERVICE_TYPES)[number]

// Sharing stops the moment a ride is no longer actively en route, whatever ends it.
const LOCATION_CLEARING_STATUSES: readonly RequestStatus[] = ['arrived', 'completed', 'cancelled']

function actionFromUrl(request: Request): string {
  return new URL(request.url).searchParams.get('action') || ''
}

// ── ?action=location-* — live ride location sharing, merged in from the former standalone
// api/hop/ride-location.ts (2026-09) to free a function-budget slot — see "Deployments" in
// docs/hop/architecture.md. Behavior/response shapes are unchanged from that file.

type LocationRequestRow = { id: string; user_id: string; service_type: string; status: string; handled_by: string | null }

async function loadRequestForLocation(sql: Sql, requestId: string): Promise<LocationRequestRow | undefined> {
  const rows = await sql`
    SELECT id, user_id, service_type, status, handled_by FROM hop_service_requests WHERE id = ${requestId}
  `
  return rows[0] as LocationRequestRow | undefined
}

// GET ?action=location-get&requestId= — member (request owner) or any admin, only while the
// ride is actively en route. Returns { location: null } for every other case rather than an
// error, so this can't be used to probe whether a request exists or what its status is.
async function handleGetLocation(sql: Sql, request: Request): Promise<Response> {
  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const requestId = new URL(request.url).searchParams.get('requestId') || ''
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return json({ location: null })

  const target = await loadRequestForLocation(sql, requestId)
  if (!target) return json({ location: null })
  const isOwner = target.user_id === user.id
  const isAssignedConcierge = user.role === 'concierge' && target.handled_by === user.id
  if (user.role !== 'admin' && !isOwner && !isAssignedConcierge) return json({ location: null })
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

// POST ?action=location-update — only the staff member this ride is assigned to, and only
// while the request is actually service_type=ride and status=en_route. No location is ever
// accepted for any other request.
async function handleUpdateLocation(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user
  if (user.role !== 'admin' && user.role !== 'concierge') return json({ error: 'Not allowed' }, 403)

  try {
    const body = (await request.json()) as { requestId?: unknown; latitude?: unknown; longitude?: unknown }
    const requestId = body.requestId
    if (typeof requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(requestId)) {
      throw new Error('Invalid request id')
    }
    const { latitude, longitude } = validateCoords(body)

    const target = await loadRequestForLocation(sql, requestId)
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

// POST ?action=location-stop — any admin can force-stop sharing (e.g. a supervisor), not just
// the originally assigned staff member.
async function handleStopLocation(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user
  if (user.role !== 'admin' && user.role !== 'concierge') return json({ error: 'Not allowed' }, 403)

  try {
    const body = (await request.json()) as { requestId?: unknown }
    const requestId = body.requestId
    if (typeof requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(requestId)) {
      throw new Error('Invalid request id')
    }
    if (user.role === 'concierge') {
      const target = await loadRequestForLocation(sql, requestId)
      if (!target || target.handled_by !== user.id) return json({ error: 'Not allowed' }, 403)
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

type RatingAggregate = { avg: number; count: number }

// Merges each concierge/admin's overall rating (across all their completed requests) onto
// whichever rows carry a `handled_by` — see hop_concierge_ratings in db/schema.sql. A separate
// GROUP BY query, not a JOIN on the main SELECT, since it aggregates across *other* requests
// too, not just the one row being returned.
async function attachAssigneeRatings<T extends { handled_by: string | null }>(
  sql: Sql,
  rows: T[],
): Promise<Array<T & { assignee_rating: RatingAggregate | null }>> {
  const ids = [...new Set(rows.map((row) => row.handled_by).filter((id): id is string => Boolean(id)))]
  const aggRows = ids.length
    ? ((await sql`
        SELECT concierge_id, AVG(stars)::float AS avg_stars, COUNT(*)::int AS rating_count
        FROM hop_concierge_ratings
        WHERE concierge_id = ANY(${ids})
        GROUP BY concierge_id
      `) as Array<{ concierge_id: string; avg_stars: number; rating_count: number }>)
    : []
  const byConcierge = new Map(aggRows.map((row) => [row.concierge_id, { avg: row.avg_stars, count: row.rating_count }]))

  return rows.map((row) => ({
    ...row,
    assignee_rating: row.handled_by ? byConcierge.get(row.handled_by) || null : null,
  }))
}

function validate(value: unknown): { serviceType: ServiceType; details: string; requestedFor: string | null } {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const serviceType = source.serviceType
  const details = typeof source.details === 'string' ? source.details.trim() : ''
  const requestedFor = typeof source.requestedFor === 'string' && source.requestedFor ? source.requestedFor : null

  if (typeof serviceType !== 'string' || !SERVICE_TYPES.includes(serviceType as ServiceType)) {
    throw new Error('Choose a valid service type')
  }
  if (details.length > 2000) throw new Error('Details are too long')
  if (requestedFor && Number.isNaN(Date.parse(requestedFor))) throw new Error('Enter a valid date/time')

  return { serviceType: serviceType as ServiceType, details, requestedFor }
}

type HistoryRow = {
  request_id: string
  status: string
  note: string
  created_at: string
  changed_by: string | null
  staff_first_name: string | null
  staff_last_name: string | null
}

type AdminHistoryEntry = { status: string; note: string; created_at: string; staff_name: string | null }
type MemberHistoryEntry = { status: string; created_at: string }

async function attachHistory<T extends { id: string; service_type: string; status: string }>(
  sql: Sql,
  rows: T[],
  isAdmin: boolean,
): Promise<Array<T & { history: AdminHistoryEntry[] | MemberHistoryEntry[]; valid_next_statuses?: RequestStatus[] }>> {
  const ids = rows.map((row) => row.id)
  const historyRows = ids.length
    ? ((await sql`
        SELECT h.request_id, h.status, h.note, h.created_at, h.changed_by,
               s.first_name AS staff_first_name, s.last_name AS staff_last_name
        FROM hop_service_request_status_history h
        LEFT JOIN hop_users s ON s.id = h.changed_by
        WHERE h.request_id = ANY(${ids})
        ORDER BY h.created_at ASC
      `) as HistoryRow[])
    : []

  const byRequest = new Map<string, HistoryRow[]>()
  for (const row of historyRows) {
    const list = byRequest.get(row.request_id) || []
    list.push(row)
    byRequest.set(row.request_id, list)
  }

  return rows.map((row) => {
    const history = byRequest.get(row.id) || []
    if (isAdmin) {
      return {
        ...row,
        history: history.map((h): AdminHistoryEntry => ({
          status: h.status,
          note: h.note,
          created_at: h.created_at,
          staff_name: h.staff_first_name ? `${h.staff_first_name} ${h.staff_last_name}` : null,
        })),
        valid_next_statuses: nextValidStatuses(row.service_type, row.status as RequestStatus),
      }
    }
    return {
      ...row,
      history: history.map((h): MemberHistoryEntry => ({ status: h.status, created_at: h.created_at })),
    }
  })
}

export async function GET(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const action = actionFromUrl(request)
  if (action === 'notes') return handleGetNotes(sql, request)
  if (action === 'notes-count') return handleNotesCount(sql, request)
  if (action === 'location-get') return handleGetLocation(sql, request)

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  if (user.role === 'admin') {
    const rows = await sql`
      SELECT r.id, r.service_type, r.status, r.details, r.requested_for, r.created_at, r.updated_at,
             r.handled_by, r.accepted_at,
             u.id AS user_id, u.first_name, u.last_name, u.email, u.phone AS user_phone,
             a.first_name AS assignee_first_name, a.last_name AS assignee_last_name, a.phone AS assignee_phone
      FROM hop_service_requests r
      JOIN hop_users u ON u.id = r.user_id
      LEFT JOIN hop_users a ON a.id = r.handled_by
      ORDER BY r.created_at DESC
    `
    const withHistory = await attachHistory(
      sql,
      rows as Array<{
        id: string
        service_type: string
        status: string
        details: string
        requested_for: string | null
        created_at: string
        updated_at: string
        handled_by: string | null
        accepted_at: string | null
        user_id: string
        first_name: string
        last_name: string
        email: string
        user_phone: string
        assignee_first_name: string | null
        assignee_last_name: string | null
        assignee_phone: string | null
      }>,
      true,
    )
    const requests = await attachAssigneeRatings(sql, withHistory)
    return json({
      requests: requests.map((r) => ({
        ...r,
        assignee_name: r.assignee_first_name ? `${r.assignee_first_name} ${r.assignee_last_name}` : null,
      })),
    })
  }

  const rows = await sql`
    SELECT r.id, r.service_type, r.status, r.details, r.requested_for, r.created_at, r.updated_at,
           r.handled_by, r.accepted_at,
           a.first_name AS assignee_first_name, a.last_name AS assignee_last_name, a.phone AS assignee_phone,
           rt.stars AS my_rating_stars, rt.comment AS my_rating_comment
    FROM hop_service_requests r
    LEFT JOIN hop_users a ON a.id = r.handled_by
    LEFT JOIN hop_concierge_ratings rt ON rt.request_id = r.id
    WHERE r.user_id = ${user.id}
    ORDER BY r.created_at DESC
  `
  const withHistory = await attachHistory(
    sql,
    rows as Array<{
      id: string
      service_type: string
      status: string
      details: string
      requested_for: string | null
      created_at: string
      updated_at: string
      handled_by: string | null
      accepted_at: string | null
      assignee_first_name: string | null
      assignee_last_name: string | null
      assignee_phone: string | null
      my_rating_stars: number | null
      my_rating_comment: string | null
    }>,
    false,
  )
  const requests = await attachAssigneeRatings(sql, withHistory)
  return json({
    requests: requests.map((r) => ({
      ...r,
      assignee_name: r.assignee_first_name ? `${r.assignee_first_name} ${r.assignee_last_name}` : null,
      my_rating: r.my_rating_stars != null ? { stars: r.my_rating_stars, comment: r.my_rating_comment || '' } : null,
    })),
  })
}

function validateRating(value: unknown): { requestId: string; stars: number; comment: string } {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const requestId = typeof source.requestId === 'string' ? source.requestId : ''
  const stars = source.stars
  const comment = typeof source.comment === 'string' ? source.comment.trim() : ''

  if (!/^[0-9a-f-]{36}$/i.test(requestId)) throw new Error('Invalid request id')
  if (typeof stars !== 'number' || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new Error('Choose a star rating from 1 to 5')
  }
  if (comment.length > 1000) throw new Error('Comment is too long')

  return { requestId, stars, comment }
}

// Member rates the concierge/admin who fulfilled their own, now-completed request. One rating
// per request — the hop_concierge_ratings.request_id UNIQUE constraint is the actual enforcement;
// this also pre-checks ownership/status so we can return a clear error instead of a raw
// constraint-violation message.
async function handleRate(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  try {
    const data = validateRating(await request.json())

    const targetRows = await sql`
      SELECT id, user_id, status, handled_by FROM hop_service_requests WHERE id = ${data.requestId}
    `
    const target = targetRows[0] as
      | { id: string; user_id: string; status: string; handled_by: string | null }
      | undefined
    if (!target) return json({ error: 'Request not found' }, 404)
    if (target.user_id !== user.id) return json({ error: 'Not allowed' }, 403)
    if (target.status !== 'completed' || !target.handled_by) {
      throw new Error('You can only rate a request once it has been completed')
    }

    const rows = await sql`
      INSERT INTO hop_concierge_ratings (request_id, concierge_id, rated_by, stars, comment)
      VALUES (${data.requestId}, ${target.handled_by}, ${user.id}, ${data.stars}, ${data.comment})
      RETURNING id, stars, comment, created_at
    `
    return json({ rating: rows[0] }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not submit your rating'
    if (/duplicate key value/i.test(message)) {
      return json({ error: "You've already rated this request" }, 409)
    }
    const status = /Choose|too long|Invalid|only rate/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP request rating failed', error)
    return json({ error: status === 400 ? message : 'Could not submit your rating' }, status)
  }
}

// ── ?action=notes — staff-only, cross-request notes about a member ─────────────────────────
// See hop_member_notes in db/schema.sql and docs/hop/architecture.md, "Staff member notes".
// Append-only, never member-visible — lives on this file (not admin/users.ts) specifically
// because concierges need read/write access too, and admin/users.ts is requireAdmin-only.

async function handleGetNotes(sql: Sql, request: Request): Promise<Response> {
  const staff = await requireStaff(sql, request)
  if (isResponse(staff)) return staff

  const memberId = new URL(request.url).searchParams.get('memberId') || ''
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) return json({ error: 'Invalid member id' }, 400)

  const notes = await sql`
    SELECT n.id, n.body, n.created_at, a.first_name AS author_first_name, a.last_name AS author_last_name
    FROM hop_member_notes n
    JOIN hop_users a ON a.id = n.author_id
    WHERE n.member_id = ${memberId}
    ORDER BY n.created_at DESC
  `
  return json({ notes })
}

function validateNoteBody(value: unknown): { memberId: string; body: string } {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const memberId = typeof source.memberId === 'string' ? source.memberId : ''
  const body = typeof source.body === 'string' ? source.body.trim() : ''

  if (!/^[0-9a-f-]{36}$/i.test(memberId)) throw new Error('Invalid member id')
  if (!body) throw new Error('Enter a note')
  if (body.length > 1000) throw new Error('Note is too long')

  return { memberId, body }
}

// Site-wide, admin-only: "N notes added today by concierges" — the "alerts admin" signal for
// this feature, deliberately a live count rather than a per-viewer read-receipt system (no new
// table for that this cycle — see docs/hop/architecture.md).
async function handleNotesCount(sql: Sql, request: Request): Promise<Response> {
  const admin = await requireStaff(sql, request)
  if (isResponse(admin)) return admin
  if (admin.role !== 'admin') return json({ error: 'Not allowed' }, 403)

  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM hop_member_notes n
    JOIN hop_users a ON a.id = n.author_id
    WHERE a.role = 'concierge' AND n.created_at::date = CURRENT_DATE
  `
  return json({ count: (rows[0] as { count: number }).count })
}

async function handleAddNote(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const staff = await requireStaff(sql, request)
  if (isResponse(staff)) return staff

  try {
    const data = validateNoteBody(await request.json())
    const memberRows = await sql`SELECT id FROM hop_users WHERE id = ${data.memberId} AND role = 'user'`
    if (memberRows.length === 0) return json({ error: 'Member not found' }, 404)

    const rows = await sql`
      INSERT INTO hop_member_notes (member_id, author_id, body)
      VALUES (${data.memberId}, ${staff.id}, ${data.body})
      RETURNING id, body, created_at
    `
    return json(
      { note: { ...rows[0], author_first_name: staff.firstName, author_last_name: staff.lastName } },
      201,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add note'
    const status = /Invalid member id|Enter a note|too long/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP member note add failed', error)
    return json({ error: status === 400 ? message : 'Could not add note' }, status)
  }
}

async function handleCreate(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  try {
    const data = validate(await request.json())
    const rows = await sql`
      INSERT INTO hop_service_requests (user_id, service_type, details, requested_for)
      VALUES (${user.id}, ${data.serviceType}, ${data.details}, ${data.requestedFor})
      RETURNING id, service_type, status, details, requested_for, created_at, updated_at
    `
    return json({ request: rows[0] }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not submit the request'
    const status = /Choose|too long|valid/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP request submission failed', error)
    return json({ error: status === 400 ? message : 'Could not submit the request' }, status)
  }
}

export async function POST(request: Request): Promise<Response> {
  const action = actionFromUrl(request)
  if (action === 'rate') return handleRate(request)
  if (action === 'notes') return handleAddNote(request)
  if (action === 'location-update') return handleUpdateLocation(request)
  if (action === 'location-stop') return handleStopLocation(request)
  return handleCreate(request)
}

export async function PATCH(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const staff = await requireStaff(sql, request)
  if (isResponse(staff)) return staff

  try {
    const body = (await request.json()) as {
      id?: unknown
      status?: unknown
      assignedTo?: unknown
      note?: unknown
      accept?: unknown
    }
    const id = body.id
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid request id')

    const note = typeof body.note === 'string' ? body.note.trim() : ''
    if (note.length > 1000) throw new Error('Note is too long')

    const currentRows = await sql`
      SELECT id, service_type, status, handled_by, accepted_at FROM hop_service_requests WHERE id = ${id}
    `
    const current = currentRows[0] as
      | { id: string; service_type: string; status: string; handled_by: string | null; accepted_at: string | null }
      | undefined
    if (!current) return json({ error: 'Request not found' }, 404)

    // A concierge may only update requests assigned to them, and may never reassign — both
    // are admin-only. This keeps `requireStaff` (admin OR concierge) safe to use here.
    if (staff.role === 'concierge') {
      if (current.handled_by !== staff.id) return json({ error: 'Not allowed' }, 403)
      if ('assignedTo' in body) return json({ error: 'Only an admin can reassign a request' }, 403)
    }

    // Acceptance/acknowledgment (2026-07-23): its own small operation, not folded into the
    // status/assignment update below, so the "Accept" button on the assigned staff member's
    // request card is a single unambiguous action. See requiresAcceptance() in
    // hopRequestWorkflow.ts and docs/hop/architecture.md ("Phase 1 quick wins").
    if (body.accept === true) {
      if (current.handled_by !== staff.id) return json({ error: 'Only the assigned staff member can accept' }, 403)
      if (current.status !== 'assigned') throw new Error('Only a newly assigned request can be accepted')
      if (current.accepted_at) throw new Error('This request has already been accepted')

      const acceptedRows = await sql`
        UPDATE hop_service_requests SET accepted_at = NOW(), updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, service_type, status, details, requested_for, handled_by, accepted_at, created_at, updated_at
      `
      await sql`
        INSERT INTO hop_service_request_status_history (request_id, status, changed_by, note)
        VALUES (${id}, ${current.status}, ${staff.id}, 'Accepted')
      `
      return json({
        request: acceptedRows[0],
        validNextStatuses: nextValidStatuses(current.service_type, current.status as RequestStatus),
      })
    }

    let nextStatus = current.status as RequestStatus
    if (typeof body.status === 'string') {
      if (!isValidStatus(body.status)) throw new Error('Choose a valid status')
      if (body.status !== current.status) {
        if (!isValidStatusTransition(current.service_type, current.status as RequestStatus, body.status)) {
          throw new Error('That status change is not allowed from the current status')
        }
        if (requiresAcceptance(current.status as RequestStatus) && !current.accepted_at) {
          throw new Error('This request must be accepted before it can move forward')
        }
        nextStatus = body.status
      }
    }

    let nextAssignee = current.handled_by
    const hasAssignment = 'assignedTo' in body
    if (hasAssignment) {
      const assignedTo = body.assignedTo
      if (assignedTo === null) {
        nextAssignee = null
      } else if (typeof assignedTo === 'string') {
        const staffRows = await sql`
          SELECT id FROM hop_users
          WHERE id = ${assignedTo} AND role IN ('admin', 'concierge') AND status = 'active'
        `
        if (staffRows.length === 0) throw new Error('Choose a valid staff member')
        nextAssignee = assignedTo
      } else {
        throw new Error('Invalid assignment')
      }
    }

    const changed = nextStatus !== current.status || nextAssignee !== current.handled_by
    if (!changed && !note) throw new Error('Nothing to update')

    const updatedRows = await sql`
      UPDATE hop_service_requests
      SET status = ${nextStatus}, handled_by = ${nextAssignee}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, service_type, status, details, requested_for, handled_by, created_at, updated_at
    `

    await sql`
      INSERT INTO hop_service_request_status_history (request_id, status, changed_by, note)
      VALUES (${id}, ${nextStatus}, ${staff.id}, ${note})
    `

    if (LOCATION_CLEARING_STATUSES.includes(nextStatus)) {
      await sql`DELETE FROM hop_ride_locations WHERE request_id = ${id}`
    }

    return json({ request: updatedRows[0], validNextStatuses: nextValidStatuses(current.service_type, nextStatus) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update the request'
    const status =
      /Choose a valid|Invalid request id|Invalid assignment|not allowed|too long|Nothing to update|accept/i.test(
        message,
      )
        ? 400
        : 500
    if (status === 500) console.error('HOP request update failed', error)
    return json({ error: status === 400 ? message : 'Could not update the request' }, status)
  }
}
