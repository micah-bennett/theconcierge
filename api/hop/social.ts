import type { NeonQueryFunction } from '@neondatabase/serverless'
import { dbUnavailable, getSql } from '../_lib/hopDb.js'
import { isResponse, json, requireUser } from '../_lib/hopAuth.js'

type Sql = NeonQueryFunction<false, false>

// ── HOP Feed (2026-09) — a lightweight, shared internal feed for all four roles ────────────
// (member/admin/concierge/facility). See "Feed" in docs/hop/architecture.md and
// hop_social_posts/hop_social_reactions/hop_user_status in db/schema.sql. Deliberately
// identical on both branches (main and staff-portal) — unlike profile.ts (main-only) or
// facility.ts (staff-portal-only), requireUser already treats every role the same, so there's
// no role-gating logic to diverge here. "Live" = 15s polling, same as request-messages.ts and
// ride-location — no websocket infra exists anywhere in this codebase, and none is introduced
// here either.

function actionFromUrl(request: Request): string {
  return new URL(request.url).searchParams.get('action') || ''
}

const REACTION_TYPES = ['like', 'celebrate', 'support'] as const
type ReactionType = (typeof REACTION_TYPES)[number]
function isReactionType(value: unknown): value is ReactionType {
  return typeof value === 'string' && (REACTION_TYPES as readonly string[]).includes(value)
}

type PostAuthor = { id: string; firstName: string; lastName: string; hopNumber: string; role: string }
type FeedPost = {
  id: string
  body: string
  created_at: string
  author: PostAuthor
  reactions: Record<string, number>
  myReaction: string | null
}

// Reaction counts-by-type and "did I react" for a batch of posts — a separate GROUP BY query
// keyed by post id, not a JOIN on the main select, to avoid row multiplication (same pattern as
// attachAssigneeRatings/attachHistory in requests.ts).
async function attachReactions(
  sql: Sql,
  postIds: string[],
  userId: string,
): Promise<Map<string, { reactions: Record<string, number>; myReaction: string | null }>> {
  const result = new Map<string, { reactions: Record<string, number>; myReaction: string | null }>()
  if (postIds.length === 0) return result

  const countRows = (await sql`
    SELECT post_id, reaction, COUNT(*)::int AS count
    FROM hop_social_reactions WHERE post_id = ANY(${postIds}) GROUP BY post_id, reaction
  `) as Array<{ post_id: string; reaction: string; count: number }>
  const mineRows = (await sql`
    SELECT post_id, reaction FROM hop_social_reactions WHERE user_id = ${userId} AND post_id = ANY(${postIds})
  `) as Array<{ post_id: string; reaction: string }>
  const mineByPost = new Map(mineRows.map((row) => [row.post_id, row.reaction]))

  for (const id of postIds) result.set(id, { reactions: {}, myReaction: mineByPost.get(id) || null })
  for (const row of countRows) {
    const entry = result.get(row.post_id)
    if (entry) entry.reactions[row.reaction] = row.count
  }
  return result
}

const FEED_PAGE_SIZE = 20

// GET ?action=posts&before=<ISO timestamp> — cursor-paginated on created_at (not OFFSET, so
// posts don't shift under an actively-polling feed). Every post already carries its author's
// name/hop_number/role and reaction counts, so the frontend never needs a second round-trip.
async function handleListPosts(sql: Sql, request: Request): Promise<Response> {
  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const before = new URL(request.url).searchParams.get('before')
  const validBefore = before && !Number.isNaN(Date.parse(before)) ? before : null

  const rows = (
    validBefore
      ? await sql`
          SELECT p.id, p.body, p.created_at,
                 u.id AS author_id, u.first_name, u.last_name, u.hop_number, u.role
          FROM hop_social_posts p
          JOIN hop_users u ON u.id = p.author_id
          WHERE p.created_at < ${validBefore}
          ORDER BY p.created_at DESC
          LIMIT ${FEED_PAGE_SIZE}
        `
      : await sql`
          SELECT p.id, p.body, p.created_at,
                 u.id AS author_id, u.first_name, u.last_name, u.hop_number, u.role
          FROM hop_social_posts p
          JOIN hop_users u ON u.id = p.author_id
          ORDER BY p.created_at DESC
          LIMIT ${FEED_PAGE_SIZE}
        `
  ) as Array<{
    id: string
    body: string
    created_at: string
    author_id: string
    first_name: string
    last_name: string
    hop_number: string
    role: string
  }>

  const reactionData = await attachReactions(sql, rows.map((row) => row.id), user.id)
  const posts: FeedPost[] = rows.map((row) => {
    const extra = reactionData.get(row.id) || { reactions: {}, myReaction: null }
    return {
      id: row.id,
      body: row.body,
      created_at: row.created_at,
      author: {
        id: row.author_id,
        firstName: row.first_name,
        lastName: row.last_name,
        hopNumber: row.hop_number,
        role: row.role,
      },
      reactions: extra.reactions,
      myReaction: extra.myReaction,
    }
  })

  return json({ posts })
}

function validatePostBody(value: unknown): { body: string } {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const body = typeof source.body === 'string' ? source.body.trim() : ''
  if (!body) throw new Error('Write something before posting')
  if (body.length > 2000) throw new Error('That post is too long')
  return { body }
}

async function handleCreatePost(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  try {
    const data = validatePostBody(await request.json())
    const rows = await sql`
      INSERT INTO hop_social_posts (author_id, body)
      VALUES (${user.id}, ${data.body})
      RETURNING id, body, created_at
    `
    const row = rows[0] as { id: string; body: string; created_at: string }
    const post: FeedPost = {
      id: row.id,
      body: row.body,
      created_at: row.created_at,
      author: { id: user.id, firstName: user.firstName, lastName: user.lastName, hopNumber: user.hopNumber, role: user.role },
      reactions: {},
      myReaction: null,
    }
    return json({ post }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not post that'
    const status = /Write something|too long/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP feed post failed', error)
    return json({ error: status === 400 ? message : 'Could not post that' }, status)
  }
}

async function reactionCountsFor(sql: Sql, postId: string): Promise<Record<string, number>> {
  const rows = (await sql`
    SELECT reaction, COUNT(*)::int AS count FROM hop_social_reactions WHERE post_id = ${postId} GROUP BY reaction
  `) as Array<{ reaction: string; count: number }>
  const reactions: Record<string, number> = {}
  for (const row of rows) reactions[row.reaction] = row.count
  return reactions
}

function validateReactionBody(value: unknown): { postId: string; reaction: ReactionType } {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const postId = typeof source.postId === 'string' ? source.postId : ''
  if (!/^[0-9a-f-]{36}$/i.test(postId)) throw new Error('Invalid post id')
  if (!isReactionType(source.reaction)) throw new Error('Choose a valid reaction')
  return { postId, reaction: source.reaction }
}

async function handleReact(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  try {
    const data = validateReactionBody(await request.json())
    const postRows = await sql`SELECT id FROM hop_social_posts WHERE id = ${data.postId}`
    if (postRows.length === 0) return json({ error: 'Post not found' }, 404)

    await sql`
      INSERT INTO hop_social_reactions (post_id, user_id, reaction)
      VALUES (${data.postId}, ${user.id}, ${data.reaction})
      ON CONFLICT (post_id, user_id) DO UPDATE SET reaction = EXCLUDED.reaction, created_at = NOW()
    `
    const reactions = await reactionCountsFor(sql, data.postId)
    return json({ reactions, myReaction: data.reaction })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save your reaction'
    const status = /Invalid post id|Choose a valid/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP feed reaction failed', error)
    return json({ error: status === 400 ? message : 'Could not save your reaction' }, status)
  }
}

async function handleRemoveReaction(sql: Sql, request: Request): Promise<Response> {
  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const postId = new URL(request.url).searchParams.get('postId') || ''
  if (!/^[0-9a-f-]{36}$/i.test(postId)) return json({ error: 'Invalid post id' }, 400)

  await sql`DELETE FROM hop_social_reactions WHERE post_id = ${postId} AND user_id = ${user.id}`
  const reactions = await reactionCountsFor(sql, postId)
  return json({ reactions, myReaction: null })
}

type StatusEntry = {
  user_id: string
  status_type: string
  status_note: string
  updated_at: string
  first_name: string
  last_name: string
  hop_number: string
  role: string
}

// GET ?action=status — everyone's current status, for the Feed's "who's around" rail. Same
// "everyone sees everyone" trust model as the posts themselves — no role-based filtering.
async function handleListStatuses(sql: Sql, request: Request): Promise<Response> {
  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const rows = await sql`
    SELECT s.user_id, s.status_type, s.status_note, s.updated_at,
           u.first_name, u.last_name, u.hop_number, u.role
    FROM hop_user_status s
    JOIN hop_users u ON u.id = s.user_id
    ORDER BY s.updated_at DESC
    LIMIT 50
  `
  return json({ statuses: rows as StatusEntry[] })
}

const STATUS_TYPES = ['available', 'on_vacation', 'sick_leave', 'moved_department', 'other'] as const
function isStatusType(value: unknown): value is (typeof STATUS_TYPES)[number] {
  return typeof value === 'string' && (STATUS_TYPES as readonly string[]).includes(value)
}

function validateStatusBody(value: unknown): { statusType: string; statusNote: string } {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  if (!isStatusType(source.statusType)) throw new Error('Choose a valid status')
  const statusNote = typeof source.statusNote === 'string' ? source.statusNote.trim() : ''
  if (statusNote.length > 200) throw new Error('Status note is too long')
  return { statusType: source.statusType, statusNote }
}

// PATCH ?action=status — a user can only ever set their own status (userId is never accepted
// from the client), mirroring rewards.ts's "the actor is always derived server-side" pattern.
async function handleSetStatus(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  try {
    const data = validateStatusBody(await request.json())
    const rows = await sql`
      INSERT INTO hop_user_status (user_id, status_type, status_note, updated_at)
      VALUES (${user.id}, ${data.statusType}, ${data.statusNote}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        status_type = EXCLUDED.status_type, status_note = EXCLUDED.status_note, updated_at = NOW()
      RETURNING user_id, status_type, status_note, updated_at
    `
    const row = rows[0] as { user_id: string; status_type: string; status_note: string; updated_at: string }
    return json({
      status: {
        ...row,
        first_name: user.firstName,
        last_name: user.lastName,
        hop_number: user.hopNumber,
        role: user.role,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update your status'
    const status = /Choose a valid|too long/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP feed status update failed', error)
    return json({ error: status === 400 ? message : 'Could not update your status' }, status)
  }
}

export async function GET(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const action = actionFromUrl(request)
  if (action === 'status') return handleListStatuses(sql, request)
  return handleListPosts(sql, request)
}

export async function POST(request: Request): Promise<Response> {
  const action = actionFromUrl(request)
  if (action === 'react') return handleReact(request)
  return handleCreatePost(request)
}

export async function DELETE(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()
  return handleRemoveReaction(sql, request)
}

export async function PATCH(request: Request): Promise<Response> {
  return handleSetStatus(request)
}
