import { dbUnavailable, getSql } from '../_lib/hopDb.js'
import { isResponse, json, requireUser } from '../_lib/hopAuth.js'

// ?action= dispatch, same shape as api/hop/rewards.ts. All actions here are requireUser-gated —
// a member's own account only, no admin/staff surface. See docs/hop/architecture.md ("Member
// special dates + family profile", "Certifications", "HOP AI assistant").

function actionFromUrl(request: Request): string {
  return new URL(request.url).searchParams.get('action') || ''
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

// ── ?action=self — birthday/anniversary on hop_users ────────────────────────

async function handleGetSelf(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const rows = await sql`SELECT birthday, anniversary FROM hop_users WHERE id = ${user.id}`
  const row = rows[0] as { birthday: string | null; anniversary: string | null }
  return json({ birthday: row.birthday, anniversary: row.anniversary })
}

type SelfDatesPayload = { birthday: string | null; anniversary: string | null }

function validateSelfDates(value: unknown): SelfDatesPayload {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const birthday = source.birthday
  const anniversary = source.anniversary

  if (birthday !== null && birthday !== undefined && !isValidDateString(birthday)) {
    throw new Error('Enter a valid birthday')
  }
  if (anniversary !== null && anniversary !== undefined && !isValidDateString(anniversary)) {
    throw new Error('Enter a valid anniversary date')
  }

  return {
    birthday: (birthday as string | null | undefined) ?? null,
    anniversary: (anniversary as string | null | undefined) ?? null,
  }
}

async function handleUpdateSelf(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  try {
    const data = validateSelfDates(await request.json())

    const existing = await sql`SELECT birthday, anniversary FROM hop_users WHERE id = ${user.id}`
    const before = existing[0] as { birthday: string | null; anniversary: string | null }
    const wasIncomplete = !before.birthday || !before.anniversary
    const willBeComplete = Boolean(data.birthday && data.anniversary)

    const rows = await sql`
      UPDATE hop_users SET birthday = ${data.birthday}, anniversary = ${data.anniversary}, updated_at = NOW()
      WHERE id = ${user.id}
      RETURNING birthday, anniversary
    `

    // One-time 'profile_complete' bonus the first time both dates are set — guarded so it only
    // ever fires once per account, regardless of how many times the dates are edited afterward.
    if (wasIncomplete && willBeComplete) {
      const already = await sql`
        SELECT 1 FROM hop_points_ledger WHERE user_id = ${user.id} AND source = 'profile_complete'
      `
      if (already.length === 0) {
        await sql`
          INSERT INTO hop_points_ledger (user_id, delta, source, reason)
          VALUES (${user.id}, 20, 'profile_complete', 'Added birthday and anniversary to your profile')
        `
      }
    }

    return json(rows[0])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save your dates'
    const status = /Enter a valid/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP profile self-dates update failed', error)
    return json({ error: status === 400 ? message : 'Could not save your dates' }, status)
  }
}

// ── ?action=family — hop_family_members CRUD ────────────────────────────────

async function handleListFamily(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const members = await sql`
    SELECT id, relationship, name, birthday, special_moment_note, special_moment_date, created_at
    FROM hop_family_members
    WHERE user_id = ${user.id}
    ORDER BY created_at ASC
  `
  return json({ members })
}

type FamilyMemberPayload = {
  relationship: string
  name: string
  birthday: string | null
  specialMomentNote: string
  specialMomentDate: string | null
}

function validateFamilyMember(value: unknown): FamilyMemberPayload {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const relationship = typeof source.relationship === 'string' ? source.relationship.trim() : ''
  const name = typeof source.name === 'string' ? source.name.trim() : ''
  const birthday = source.birthday
  const specialMomentNote = typeof source.specialMomentNote === 'string' ? source.specialMomentNote.trim() : ''
  const specialMomentDate = source.specialMomentDate

  if (!name || name.length > 80) throw new Error('Enter a name')
  if (relationship.length > 60) throw new Error('Relationship is too long')
  if (birthday !== null && birthday !== undefined && !isValidDateString(birthday)) {
    throw new Error('Enter a valid birthday')
  }
  if (specialMomentNote.length > 200) throw new Error('Note is too long')
  if (specialMomentDate !== null && specialMomentDate !== undefined && !isValidDateString(specialMomentDate)) {
    throw new Error('Enter a valid special-moment date')
  }

  return {
    relationship,
    name,
    birthday: (birthday as string | null | undefined) ?? null,
    specialMomentNote,
    specialMomentDate: (specialMomentDate as string | null | undefined) ?? null,
  }
}

async function handleAddFamily(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  try {
    const data = validateFamilyMember(await request.json())
    const rows = await sql`
      INSERT INTO hop_family_members (user_id, relationship, name, birthday, special_moment_note, special_moment_date)
      VALUES (${user.id}, ${data.relationship}, ${data.name}, ${data.birthday}, ${data.specialMomentNote}, ${data.specialMomentDate})
      RETURNING id, relationship, name, birthday, special_moment_note, special_moment_date, created_at
    `
    return json({ member: rows[0] }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add family member'
    const status = /Enter a|too long/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP family member add failed', error)
    return json({ error: status === 400 ? message : 'Could not add family member' }, status)
  }
}

async function handleDeleteFamily(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const id = new URL(request.url).searchParams.get('id') || ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Invalid family member id' }, 400)

  const rows = await sql`
    DELETE FROM hop_family_members WHERE id = ${id} AND user_id = ${user.id} RETURNING id
  `
  if (rows.length === 0) return json({ error: 'Family member not found' }, 404)
  return json({ ok: true })
}

// ── ?action=certifications — hop_certifications CRUD ────────────────────────

async function handleListCertifications(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const certifications = await sql`
    SELECT id, name, issuing_body, issued_at, expires_at, created_at
    FROM hop_certifications
    WHERE user_id = ${user.id}
    ORDER BY expires_at ASC NULLS LAST, created_at ASC
  `
  return json({ certifications })
}

type CertificationPayload = {
  name: string
  issuingBody: string
  issuedAt: string | null
  expiresAt: string | null
}

function validateCertification(value: unknown): CertificationPayload {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const name = typeof source.name === 'string' ? source.name.trim() : ''
  const issuingBody = typeof source.issuingBody === 'string' ? source.issuingBody.trim() : ''
  const issuedAt = source.issuedAt
  const expiresAt = source.expiresAt

  if (!name || name.length > 120) throw new Error('Enter a certification name')
  if (issuingBody.length > 120) throw new Error('Issuing body is too long')
  if (issuedAt !== null && issuedAt !== undefined && !isValidDateString(issuedAt)) {
    throw new Error('Enter a valid issue date')
  }
  if (expiresAt !== null && expiresAt !== undefined && !isValidDateString(expiresAt)) {
    throw new Error('Enter a valid expiration date')
  }
  if (
    isValidDateString(issuedAt) &&
    isValidDateString(expiresAt) &&
    (expiresAt as string) < (issuedAt as string)
  ) {
    throw new Error('Expiration date must be after the issue date')
  }

  return {
    name,
    issuingBody,
    issuedAt: (issuedAt as string | null | undefined) ?? null,
    expiresAt: (expiresAt as string | null | undefined) ?? null,
  }
}

async function handleAddCertification(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  try {
    const data = validateCertification(await request.json())
    const rows = await sql`
      INSERT INTO hop_certifications (user_id, name, issuing_body, issued_at, expires_at)
      VALUES (${user.id}, ${data.name}, ${data.issuingBody}, ${data.issuedAt}, ${data.expiresAt})
      RETURNING id, name, issuing_body, issued_at, expires_at, created_at
    `
    return json({ certification: rows[0] }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add certification'
    const status = /Enter a|too long|must be after/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP certification add failed', error)
    return json({ error: status === 400 ? message : 'Could not add certification' }, status)
  }
}

async function handleDeleteCertification(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const id = new URL(request.url).searchParams.get('id') || ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Invalid certification id' }, 400)

  const rows = await sql`
    DELETE FROM hop_certifications WHERE id = ${id} AND user_id = ${user.id} RETURNING id
  `
  if (rows.length === 0) return json({ error: 'Certification not found' }, 404)
  return json({ ok: true })
}

// ── ?action=feed — rule-based suggestion cards for the HOP AI assistant widget ──────────────
// DB-only by design (see docs/hop/roadmap.md's original note on this) — calendar-event
// proximity is merged client-side from the already-existing hopGoogleCalendarEvents() call, not
// fetched from here, so this endpoint never makes an outbound call of its own. This is
// deliberately a rule table, not a real LLM call, with the same input shape a future version
// could hand to api/chat.ts's existing Anthropic client instead — see HopAiAssistant.tsx.

type FeedSuggestion = {
  id: string
  kind: 'birthday_cake' | 'anniversary' | 'cert_renewal'
  prompt: string
  dueDate: string | null
  options: { label: string; value: string }[]
}

async function handleFeed(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const suggestions: FeedSuggestion[] = []
  const horizon = new Date()
  horizon.setDate(horizon.getDate() + 14)
  const horizonStr = horizon.toISOString().slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)

  const family = await sql`
    SELECT id, name, birthday, special_moment_note, special_moment_date
    FROM hop_family_members
    WHERE user_id = ${user.id}
  `
  for (const member of family as {
    id: string
    name: string
    birthday: string | null
    special_moment_note: string
    special_moment_date: string | null
  }[]) {
    // Compare month-day only, since a birthday's year is the person's birth year, not the
    // upcoming occurrence — a plain date-range check against `today`/`horizonStr` would only
    // ever match once per lifetime.
    if (member.birthday && isUpcomingMonthDay(member.birthday, today, horizonStr)) {
      suggestions.push({
        id: `family-birthday-${member.id}`,
        kind: 'birthday_cake',
        prompt: `${member.name}'s birthday is coming up. Want HOP to arrange a cake?`,
        dueDate: nextOccurrence(member.birthday, today),
        options: [
          { label: 'Yes, help me arrange it', value: 'start' },
          { label: 'Not this time', value: 'dismiss' },
        ],
      })
    }
    if (member.special_moment_date && isUpcomingMonthDay(member.special_moment_date, today, horizonStr)) {
      suggestions.push({
        id: `family-moment-${member.id}`,
        kind: 'anniversary',
        prompt: member.special_moment_note
          ? `Coming up for ${member.name}: ${member.special_moment_note}. Want help planning something?`
          : `A special date for ${member.name} is coming up. Want help planning something?`,
        dueDate: nextOccurrence(member.special_moment_date, today),
        options: [
          { label: 'Yes, help me plan it', value: 'start' },
          { label: 'Not this time', value: 'dismiss' },
        ],
      })
    }
  }

  const selfRows = await sql`SELECT birthday, anniversary FROM hop_users WHERE id = ${user.id}`
  const self = selfRows[0] as { birthday: string | null; anniversary: string | null }
  if (self.anniversary && isUpcomingMonthDay(self.anniversary, today, horizonStr)) {
    suggestions.push({
      id: 'self-anniversary',
      kind: 'anniversary',
      prompt: 'Your anniversary is coming up. Want HOP to help plan something?',
      dueDate: nextOccurrence(self.anniversary, today),
      options: [
        { label: 'Yes, help me plan it', value: 'start' },
        { label: 'Not this time', value: 'dismiss' },
      ],
    })
  }

  const certifications = await sql`
    SELECT id, name, expires_at FROM hop_certifications
    WHERE user_id = ${user.id} AND expires_at IS NOT NULL AND expires_at BETWEEN ${today} AND ${horizonStr}
  `
  for (const cert of certifications as { id: string; name: string; expires_at: string }[]) {
    suggestions.push({
      id: `cert-${cert.id}`,
      kind: 'cert_renewal',
      prompt: `Your ${cert.name} certification expires on ${cert.expires_at}. Renew it soon?`,
      dueDate: cert.expires_at,
      options: [
        { label: 'Remind me on my Profile page', value: 'dismiss' },
      ],
    })
  }

  return json({ suggestions })
}

// Returns whether `dateStr`'s month/day falls within [today, horizon] month/day, ignoring year —
// handles the Dec-into-Jan wraparound by checking both the "this year" and "next year"
// occurrence against the (possibly year-crossing) window.
function isUpcomingMonthDay(dateStr: string, today: string, horizonStr: string): boolean {
  const occurrence = nextOccurrence(dateStr, today)
  return occurrence >= today && occurrence <= horizonStr
}

// Given a recurring month/day (from a birthday/anniversary DATE) and today's date, returns the
// next real calendar occurrence (this year if it hasn't passed yet, otherwise next year) as an
// ISO date string — used both for filtering and for display.
function nextOccurrence(dateStr: string, today: string): string {
  const [, month, day] = dateStr.split('-')
  const todayYear = Number(today.slice(0, 4))
  const thisYear = `${todayYear}-${month}-${day}`
  if (thisYear >= today) return thisYear
  return `${todayYear + 1}-${month}-${day}`
}

export async function GET(request: Request): Promise<Response> {
  switch (actionFromUrl(request)) {
    case 'self':
      return handleGetSelf(request)
    case 'family':
      return handleListFamily(request)
    case 'certifications':
      return handleListCertifications(request)
    case 'feed':
      return handleFeed(request)
    default:
      return json({ error: 'Not found' }, 404)
  }
}

export async function PATCH(request: Request): Promise<Response> {
  switch (actionFromUrl(request)) {
    case 'self':
      return handleUpdateSelf(request)
    default:
      return json({ error: 'Not found' }, 404)
  }
}

export async function POST(request: Request): Promise<Response> {
  switch (actionFromUrl(request)) {
    case 'family':
      return handleAddFamily(request)
    case 'certifications':
      return handleAddCertification(request)
    default:
      return json({ error: 'Not found' }, 404)
  }
}

export async function DELETE(request: Request): Promise<Response> {
  switch (actionFromUrl(request)) {
    case 'family':
      return handleDeleteFamily(request)
    case 'certifications':
      return handleDeleteCertification(request)
    default:
      return json({ error: 'Not found' }, 404)
  }
}
