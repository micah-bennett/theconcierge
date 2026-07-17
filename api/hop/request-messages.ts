import type { NeonQueryFunction } from '@neondatabase/serverless'
import { dbUnavailable, getSql } from '../_lib/hopDb.js'
import { isResponse, json, requireUser } from '../_lib/hopAuth.js'

type Sql = NeonQueryFunction<false, false>

type RequestRow = { id: string; user_id: string; handled_by: string | null }

async function loadRequest(sql: Sql, requestId: string): Promise<RequestRow | undefined> {
  const rows = await sql`
    SELECT id, user_id, handled_by FROM hop_service_requests WHERE id = ${requestId}
  `
  return rows[0] as RequestRow | undefined
}

// The message thread is visible to the request's owner, whoever it's currently assigned to
// (admin or concierge), and any admin — mirroring the access rule already used for ride
// location, but returning 403 rather than an empty result, since a conversation's existence
// isn't the same probing concern as live GPS coordinates.
function canAccess(user: { id: string; role: 'user' | 'admin' | 'concierge' }, target: RequestRow): boolean {
  if (user.role === 'admin') return true
  if (target.user_id === user.id) return true
  if (target.handled_by === user.id) return true
  return false
}

// GET ?requestId=
export async function GET(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const requestId = new URL(request.url).searchParams.get('requestId') || ''
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return json({ error: 'Invalid request id' }, 400)

  const target = await loadRequest(sql, requestId)
  if (!target) return json({ error: 'Request not found' }, 404)
  if (!canAccess(user, target)) return json({ error: 'Not allowed' }, 403)

  const rows = await sql`
    SELECT m.id, m.sender_id, m.body, m.created_at, u.first_name, u.last_name, u.role
    FROM hop_request_messages m
    JOIN hop_users u ON u.id = m.sender_id
    WHERE m.request_id = ${requestId}
    ORDER BY m.created_at ASC
  `
  const messages = (
    rows as Array<{
      id: string
      sender_id: string
      body: string
      created_at: string
      first_name: string
      last_name: string
      role: string
    }>
  ).map((row) => ({
    id: row.id,
    sender_id: row.sender_id,
    sender_name: `${row.first_name} ${row.last_name}`,
    sender_role: row.role,
    body: row.body,
    created_at: row.created_at,
  }))

  return json({ messages })
}

function validateBody(value: unknown): { requestId: string; body: string } {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const requestId = typeof source.requestId === 'string' ? source.requestId : ''
  const body = typeof source.body === 'string' ? source.body.trim() : ''

  if (!/^[0-9a-f-]{36}$/i.test(requestId)) throw new Error('Invalid request id')
  if (!body) throw new Error('Enter a message')
  if (body.length > 1000) throw new Error('Message is too long')

  return { requestId, body }
}

export async function POST(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  try {
    const data = validateBody(await request.json())

    const target = await loadRequest(sql, data.requestId)
    if (!target) return json({ error: 'Request not found' }, 404)
    if (!canAccess(user, target)) return json({ error: 'Not allowed' }, 403)

    const rows = await sql`
      INSERT INTO hop_request_messages (request_id, sender_id, body)
      VALUES (${data.requestId}, ${user.id}, ${data.body})
      RETURNING id, sender_id, body, created_at
    `
    const row = rows[0] as { id: string; sender_id: string; body: string; created_at: string }

    return json(
      {
        message: {
          id: row.id,
          sender_id: row.sender_id,
          sender_name: `${user.firstName} ${user.lastName}`,
          sender_role: user.role,
          body: row.body,
          created_at: row.created_at,
        },
      },
      201,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not send the message'
    const status = /Invalid request id|Enter a message|too long/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP request message send failed', error)
    return json({ error: status === 400 ? message : 'Could not send the message' }, status)
  }
}
