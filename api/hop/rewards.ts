import { dbUnavailable, getSql } from '../_lib/hopDb.js'
import { isResponse, json, requireStaff, requireUser } from '../_lib/hopAuth.js'

// Reduced scope for this cycle (see docs/hop/roadmap.md for the full future design): a member can
// view their own ledger/balance, and staff can award points. No ?action=redeem — that's
// deliberately not built yet. source is always set server-side from the caller's role, never
// accepted from the client, so the audit trail can be trusted.

function actionFromUrl(request: Request): string {
  return new URL(request.url).searchParams.get('action') || ''
}

async function handleGetOwn(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const ledger = await sql`
    SELECT id, delta, source, reason, created_at
    FROM hop_points_ledger
    WHERE user_id = ${user.id}
    ORDER BY created_at DESC
  `
  const balanceRows = await sql`
    SELECT COALESCE(SUM(delta), 0) AS balance FROM hop_points_ledger WHERE user_id = ${user.id}
  `
  const balance = Number((balanceRows[0] as { balance: number }).balance)

  return json({ ledger, balance })
}

type AwardPayload = { userId: string; delta: number; reason: string }

function validateAward(value: unknown): AwardPayload {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const userId = typeof source.userId === 'string' ? source.userId : ''
  const delta = typeof source.delta === 'number' ? Math.trunc(source.delta) : NaN
  const reason = typeof source.reason === 'string' ? source.reason.trim() : ''

  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('Invalid user id')
  if (!Number.isFinite(delta) || delta < 1 || delta > 1000) {
    throw new Error('Enter a point amount between 1 and 1000')
  }
  if (reason.length > 200) throw new Error('Reason is too long')

  return { userId, delta, reason }
}

// Staff-only manual award — no ?action=redeem exists, so this is currently the only way points
// ever get added to a member's balance (see docs/hop/roadmap.md for the deferred auto-earning
// rules). source is derived from the caller's own role, never client-supplied.
async function handleAward(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const staff = await requireStaff(sql, request)
  if (isResponse(staff)) return staff

  try {
    const data = validateAward(await request.json())

    const recipient = await sql`SELECT id FROM hop_users WHERE id = ${data.userId} AND role = 'user'`
    if (recipient.length === 0) return json({ error: 'Member not found' }, 404)

    const source = staff.role === 'concierge' ? 'concierge_award' : 'admin_award'
    const rows = await sql`
      INSERT INTO hop_points_ledger (user_id, delta, source, reason, awarded_by)
      VALUES (${data.userId}, ${data.delta}, ${source}, ${data.reason}, ${staff.id})
      RETURNING id, delta, source, reason, created_at
    `
    const balanceRows = await sql`
      SELECT COALESCE(SUM(delta), 0) AS balance FROM hop_points_ledger WHERE user_id = ${data.userId}
    `
    const balance = Number((balanceRows[0] as { balance: number }).balance)

    return json({ entry: rows[0], balance }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not award points'
    const status = /Invalid user id|Enter a point amount|too long/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP rewards award failed', error)
    return json({ error: status === 400 ? message : 'Could not award points' }, status)
  }
}

// ── Daily health-task check-off (?action=tasks, ?action=complete-task) ─────────────────────
// A fixed, hardcoded task set — no admin-editable task bank this cycle (see
// docs/hop/architecture.md, "Member rewards"). 5 points per task, once per day per task,
// enforced by hop_daily_tasks_log's UNIQUE (user_id, task_key, log_date) index.

const TASK_DEFINITIONS = [
  { key: 'walk_10min', label: 'Take a 10-minute walk', icon: '🚶', points: 5, needsResponse: false },
  { key: 'stand_10min', label: 'Stand up and stretch for 10 minutes', icon: '🧍', points: 5, needsResponse: false },
  { key: 'read_article', label: 'Read an article about the concierge', icon: '📰', points: 5, needsResponse: false },
  { key: 'daily_question', label: '', icon: '💬', points: 5, needsResponse: true },
] as const

type TaskKey = (typeof TASK_DEFINITIONS)[number]['key']
const TASK_KEYS = TASK_DEFINITIONS.map((t) => t.key) as TaskKey[]

// A small rotating question bank, keyed off day-of-week — no admin-authoring tool this cycle.
const DAILY_QUESTIONS = [
  'How would you rate your job satisfaction today?',
  'Has HOP made your shift easier this week?',
  'What is one thing that would make your day better?',
  'How supported do you feel by your team right now?',
  'Would you recommend HOP to a coworker?',
  'What is the best part of your job this week?',
  'Is there anything HOP could help with that you have not asked for yet?',
]

function questionOfTheDay(): string {
  return DAILY_QUESTIONS[new Date().getDay()]
}

async function handleGetTasks(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const today = new Date().toISOString().slice(0, 10)
  const doneRows = await sql`
    SELECT task_key FROM hop_daily_tasks_log WHERE user_id = ${user.id} AND log_date = ${today}
  `
  const doneToday = new Set((doneRows as { task_key: string }[]).map((r) => r.task_key))

  const tasks = TASK_DEFINITIONS.map((t) => ({
    key: t.key,
    label: t.key === 'daily_question' ? questionOfTheDay() : t.label,
    icon: t.icon,
    points: t.points,
    needsResponse: t.needsResponse,
    doneToday: doneToday.has(t.key),
  }))

  return json({ tasks })
}

type CompleteTaskPayload = { taskKey: TaskKey; responseText: string }

function validateCompleteTask(value: unknown): CompleteTaskPayload {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const taskKey = source.taskKey
  const responseText = typeof source.responseText === 'string' ? source.responseText.trim() : ''

  if (typeof taskKey !== 'string' || !TASK_KEYS.includes(taskKey as TaskKey)) {
    throw new Error('Choose a valid task')
  }
  if (responseText.length > 500) throw new Error('Response is too long')

  return { taskKey: taskKey as TaskKey, responseText }
}

async function handleCompleteTask(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  try {
    const data = validateCompleteTask(await request.json())
    const definition = TASK_DEFINITIONS.find((t) => t.key === data.taskKey)!

    await sql`
      INSERT INTO hop_daily_tasks_log (user_id, task_key, response_text)
      VALUES (${user.id}, ${data.taskKey}, ${data.responseText})
    `
    const rows = await sql`
      INSERT INTO hop_points_ledger (user_id, delta, source, reason)
      VALUES (${user.id}, ${definition.points}, 'task_complete', ${'Completed: ' + (data.taskKey === 'daily_question' ? questionOfTheDay() : definition.label)})
      RETURNING id, delta, source, reason, created_at
    `
    const balanceRows = await sql`
      SELECT COALESCE(SUM(delta), 0) AS balance FROM hop_points_ledger WHERE user_id = ${user.id}
    `
    const balance = Number((balanceRows[0] as { balance: number }).balance)

    return json({ entry: rows[0], balance }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not complete task'
    if (/duplicate key value/i.test(message)) {
      return json({ error: "You've already completed this today" }, 409)
    }
    const status = /Choose a valid|too long/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP daily task completion failed', error)
    return json({ error: status === 400 ? message : 'Could not complete task' }, status)
  }
}

export async function GET(request: Request): Promise<Response> {
  switch (actionFromUrl(request)) {
    case 'tasks':
      return handleGetTasks(request)
    default:
      return handleGetOwn(request)
  }
}

export async function POST(request: Request): Promise<Response> {
  switch (actionFromUrl(request)) {
    case 'award':
      return handleAward(request)
    case 'complete-task':
      return handleCompleteTask(request)
    default:
      return json({ error: 'Not found' }, 404)
  }
}
