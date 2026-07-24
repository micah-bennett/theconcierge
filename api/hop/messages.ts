import type { NeonQueryFunction } from '@neondatabase/serverless'
import { dbUnavailable, getSql } from '../_lib/hopDb.js'
import { isResponse, json, requireAdmin, requireUser } from '../_lib/hopAuth.js'

// Admin <-> member direct messaging, not tied to a service request — see hop_direct_messages in
// db/schema.sql and docs/hop/architecture.md ("Phase 1 quick wins"). Deliberately separate from
// api/hop/request-messages.ts, which stays scoped to a single request's requester/assignee/admin.
// Threaded by the member's user id: any admin can read/post into a given member's single thread
// ("admin" is a role here, not one specific counterparty) — same "admin as a role, not an
// individual" model already used for request dispatch.

type Sql = NeonQueryFunction<false, false>

type MessageRow = {
  id: string
  thread_user_id: string
  sender_id: string
  body: string
  read_at: string | null
  created_at: string
  first_name: string
  last_name: string
  role: string
}

function toMessage(row: MessageRow) {
  return {
    id: row.id,
    sender_id: row.sender_id,
    sender_name: `${row.first_name} ${row.last_name}`,
    sender_role: row.role,
    body: row.body,
    created_at: row.created_at,
  }
}

async function loadThread(sql: Sql, threadUserId: string) {
  const rows = (await sql`
    SELECT m.id, m.thread_user_id, m.sender_id, m.body, m.read_at, m.created_at,
           u.first_name, u.last_name, u.role
    FROM hop_direct_messages m
    JOIN hop_users u ON u.id = m.sender_id
    WHERE m.thread_user_id = ${threadUserId}
    ORDER BY m.created_at ASC
  `) as MessageRow[]
  return rows.map(toMessage)
}

async function handleMemberGet(sql: Sql, memberId: string): Promise<Response> {
  const messages = await loadThread(sql, memberId)
  // Viewing the thread marks the admin's messages to this member as read.
  await sql`
    UPDATE hop_direct_messages SET read_at = NOW()
    WHERE thread_user_id = ${memberId} AND sender_id != ${memberId} AND read_at IS NULL
  `
  return json({ messages })
}

async function handleAdminGet(sql: Sql, request: Request): Promise<Response> {
  const userId = new URL(request.url).searchParams.get('userId')

  if (userId) {
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: 'Invalid user id' }, 400)
    const messages = await loadThread(sql, userId)
    // Viewing the thread marks the member's messages as read.
    await sql`
      UPDATE hop_direct_messages SET read_at = NOW()
      WHERE thread_user_id = ${userId} AND sender_id = ${userId} AND read_at IS NULL
    `
    return json({ messages })
  }

  // Inbox summary: latest message + unread count per member thread.
  const latestRows = (await sql`
    SELECT DISTINCT ON (m.thread_user_id)
      m.thread_user_id, m.body, m.sender_id, m.created_at,
      u.first_name, u.last_name, u.email
    FROM hop_direct_messages m
    JOIN hop_users u ON u.id = m.thread_user_id
    ORDER BY m.thread_user_id, m.created_at DESC
  `) as Array<{
    thread_user_id: string
    body: string
    sender_id: string
    created_at: string
    first_name: string
    last_name: string
    email: string
  }>

  const unreadRows = (await sql`
    SELECT thread_user_id, COUNT(*)::int AS unread_count
    FROM hop_direct_messages
    WHERE sender_id = thread_user_id AND read_at IS NULL
    GROUP BY thread_user_id
  `) as Array<{ thread_user_id: string; unread_count: number }>
  const unreadByUser = new Map(unreadRows.map((row) => [row.thread_user_id, row.unread_count]))

  const threads = latestRows.map((row) => ({
    user_id: row.thread_user_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    last_message: row.body,
    last_sender_id: row.sender_id,
    last_message_at: row.created_at,
    unread_count: unreadByUser.get(row.thread_user_id) || 0,
  }))

  return json({ threads })
}

export async function GET(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const url = new URL(request.url)
  if (url.searchParams.get('scope') === 'admin') {
    const admin = await requireAdmin(sql, request)
    if (isResponse(admin)) return admin
    return handleAdminGet(sql, request)
  }

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user
  return handleMemberGet(sql, user.id)
}

function validateBody(value: unknown): { body: string; userId: string | null } {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const body = typeof source.body === 'string' ? source.body.trim() : ''
  const userId = typeof source.userId === 'string' ? source.userId : null

  if (!body) throw new Error('Enter a message')
  if (body.length > 1000) throw new Error('Message is too long')
  if (userId && !/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('Invalid user id')

  return { body, userId }
}

export async function POST(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  try {
    const data = validateBody(await request.json())

    let threadUserId: string
    if (user.role === 'admin') {
      if (!data.userId) throw new Error('Choose who to message')
      const memberRows = await sql`SELECT id FROM hop_users WHERE id = ${data.userId}`
      if (memberRows.length === 0) return json({ error: 'User not found' }, 404)
      threadUserId = data.userId
    } else {
      threadUserId = user.id
    }

    const rows = await sql`
      INSERT INTO hop_direct_messages (thread_user_id, sender_id, body)
      VALUES (${threadUserId}, ${user.id}, ${data.body})
      RETURNING id, thread_user_id, sender_id, body, created_at
    `
    const row = rows[0] as { id: string; thread_user_id: string; sender_id: string; body: string; created_at: string }

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
    const status = /Invalid|Enter a message|too long|Choose who/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP direct message send failed', error)
    return json({ error: status === 400 ? message : 'Could not send the message' }, status)
  }
}
