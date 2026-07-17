import type { NeonQueryFunction } from '@neondatabase/serverless'
import { dbUnavailable, getSql } from '../_lib/hopDb.js'
import { isResponse, json, requireAdmin, requireUser } from '../_lib/hopAuth.js'
import { isValidStatus, isValidStatusTransition, nextValidStatuses } from '../_lib/hopRequestWorkflow.js'
import type { RequestStatus } from '../_lib/hopRequestWorkflow.js'

type Sql = NeonQueryFunction<false, false>

const SERVICE_TYPES = ['ride', 'meal', 'errand', 'wellness', 'family_home', 'other'] as const
type ServiceType = (typeof SERVICE_TYPES)[number]

// Sharing stops the moment a ride is no longer actively en route, whatever ends it.
const LOCATION_CLEARING_STATUSES: readonly RequestStatus[] = ['arrived', 'completed', 'cancelled']

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

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  if (user.role === 'admin') {
    const rows = await sql`
      SELECT r.id, r.service_type, r.status, r.details, r.requested_for, r.created_at, r.updated_at,
             r.handled_by,
             u.id AS user_id, u.first_name, u.last_name, u.email,
             a.first_name AS assignee_first_name, a.last_name AS assignee_last_name
      FROM hop_service_requests r
      JOIN hop_users u ON u.id = r.user_id
      LEFT JOIN hop_users a ON a.id = r.handled_by
      ORDER BY r.created_at DESC
    `
    const requests = await attachHistory(
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
        user_id: string
        first_name: string
        last_name: string
        email: string
        assignee_first_name: string | null
        assignee_last_name: string | null
      }>,
      true,
    )
    return json({
      requests: requests.map((r) => ({
        ...r,
        assignee_name: r.assignee_first_name ? `${r.assignee_first_name} ${r.assignee_last_name}` : null,
      })),
    })
  }

  const rows = await sql`
    SELECT r.id, r.service_type, r.status, r.details, r.requested_for, r.created_at, r.updated_at,
           r.handled_by,
           a.first_name AS assignee_first_name, a.last_name AS assignee_last_name
    FROM hop_service_requests r
    LEFT JOIN hop_users a ON a.id = r.handled_by
    WHERE r.user_id = ${user.id}
    ORDER BY r.created_at DESC
  `
  const requests = await attachHistory(
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
      assignee_first_name: string | null
      assignee_last_name: string | null
    }>,
    false,
  )
  return json({
    requests: requests.map((r) => ({
      ...r,
      assignee_name: r.assignee_first_name ? `${r.assignee_first_name} ${r.assignee_last_name}` : null,
    })),
  })
}

export async function POST(request: Request): Promise<Response> {
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

export async function PATCH(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const admin = await requireAdmin(sql, request)
  if (isResponse(admin)) return admin

  try {
    const body = (await request.json()) as { id?: unknown; status?: unknown; assignedTo?: unknown; note?: unknown }
    const id = body.id
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid request id')

    const note = typeof body.note === 'string' ? body.note.trim() : ''
    if (note.length > 1000) throw new Error('Note is too long')

    const currentRows = await sql`
      SELECT id, service_type, status, handled_by FROM hop_service_requests WHERE id = ${id}
    `
    const current = currentRows[0] as
      | { id: string; service_type: string; status: string; handled_by: string | null }
      | undefined
    if (!current) return json({ error: 'Request not found' }, 404)

    let nextStatus = current.status as RequestStatus
    if (typeof body.status === 'string') {
      if (!isValidStatus(body.status)) throw new Error('Choose a valid status')
      if (body.status !== current.status) {
        if (!isValidStatusTransition(current.service_type, current.status as RequestStatus, body.status)) {
          throw new Error('That status change is not allowed from the current status')
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
          SELECT id FROM hop_users WHERE id = ${assignedTo} AND role = 'admin' AND status = 'active'
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
      VALUES (${id}, ${nextStatus}, ${admin.id}, ${note})
    `

    if (LOCATION_CLEARING_STATUSES.includes(nextStatus)) {
      await sql`DELETE FROM hop_ride_locations WHERE request_id = ${id}`
    }

    return json({ request: updatedRows[0], validNextStatuses: nextValidStatuses(current.service_type, nextStatus) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update the request'
    const status = /Choose a valid|Invalid request id|Invalid assignment|not allowed|too long|Nothing to update/i.test(
      message,
    )
      ? 400
      : 500
    if (status === 500) console.error('HOP request update failed', error)
    return json({ error: status === 400 ? message : 'Could not update the request' }, status)
  }
}
