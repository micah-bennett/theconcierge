import { dbUnavailable, getSql } from '../_lib/hopDb.js'
import { isResponse, json, requireConcierge } from '../_lib/hopAuth.js'
import { nextValidStatuses } from '../_lib/hopRequestWorkflow.js'
import type { RequestStatus } from '../_lib/hopRequestWorkflow.js'

function actionFromUrl(request: Request): string {
  return new URL(request.url).searchParams.get('action') || ''
}

type ProfileRow = {
  headline: string
  bio: string
  specialties: string[]
  years_experience: number | null
  photo_url: string | null
}

const EMPTY_PROFILE: ProfileRow = { headline: '', bio: '', specialties: [], years_experience: null, photo_url: null }

async function handleGetProfile(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const concierge = await requireConcierge(sql, request)
  if (isResponse(concierge)) return concierge

  const rows = await sql`
    SELECT headline, bio, specialties, years_experience, photo_url
    FROM hop_concierge_profiles WHERE user_id = ${concierge.id}
  `
  const ratingRows = await sql`
    SELECT AVG(stars)::float AS avg_stars, COUNT(*)::int AS rating_count
    FROM hop_concierge_ratings WHERE concierge_id = ${concierge.id}
  `
  const ratingRow = ratingRows[0] as { avg_stars: number | null; rating_count: number } | undefined
  const rating = ratingRow?.avg_stars != null ? { avg: ratingRow.avg_stars, count: ratingRow.rating_count } : null

  return json({ profile: (rows[0] as ProfileRow | undefined) || EMPTY_PROFILE, rating })
}

function validateProfile(value: unknown): ProfileRow {
  if (!value || typeof value !== 'object') throw new Error('Invalid request body')
  const source = value as Record<string, unknown>
  const headline = typeof source.headline === 'string' ? source.headline.trim() : ''
  const bio = typeof source.bio === 'string' ? source.bio.trim() : ''
  const specialties = Array.isArray(source.specialties)
    ? source.specialties.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim())
    : []
  const yearsRaw = source.years_experience
  const years_experience =
    yearsRaw === null || yearsRaw === undefined || yearsRaw === ''
      ? null
      : typeof yearsRaw === 'number' && Number.isInteger(yearsRaw)
        ? yearsRaw
        : NaN
  const photoRaw = source.photo_url
  const photo_url = typeof photoRaw === 'string' && photoRaw.trim() ? photoRaw.trim() : null

  if (headline.length > 140) throw new Error('Headline is too long')
  if (bio.length > 2000) throw new Error('Bio is too long')
  if (specialties.length > 12) throw new Error('Choose up to 12 specialties')
  if (specialties.some((s) => s.length > 60)) throw new Error('Each specialty must be under 60 characters')
  if (years_experience !== null && (Number.isNaN(years_experience) || years_experience < 0 || years_experience > 80)) {
    throw new Error('Enter a valid number of years')
  }
  if (photo_url && photo_url.length > 2000) throw new Error('Photo URL is too long')
  if (photo_url && !/^https?:\/\//i.test(photo_url)) throw new Error('Photo URL must start with http:// or https://')

  return { headline, bio, specialties, years_experience, photo_url }
}

async function handleUpdateProfile(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const concierge = await requireConcierge(sql, request)
  if (isResponse(concierge)) return concierge

  try {
    const data = validateProfile(await request.json())
    const rows = await sql`
      INSERT INTO hop_concierge_profiles (user_id, headline, bio, specialties, years_experience, photo_url)
      VALUES (${concierge.id}, ${data.headline}, ${data.bio}, ${data.specialties}, ${data.years_experience}, ${data.photo_url})
      ON CONFLICT (user_id) DO UPDATE SET
        headline = EXCLUDED.headline,
        bio = EXCLUDED.bio,
        specialties = EXCLUDED.specialties,
        years_experience = EXCLUDED.years_experience,
        photo_url = EXCLUDED.photo_url,
        updated_at = NOW()
      RETURNING headline, bio, specialties, years_experience, photo_url
    `
    return json({ profile: rows[0] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update your profile'
    const status = /too long|Choose up to|must be under|Enter a valid|Photo URL/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP concierge profile update failed', error)
    return json({ error: status === 400 ? message : 'Could not update your profile' }, status)
  }
}

// GET ?action=my-requests — all requests assigned to the calling concierge, admin-level shape
// (notes + staff names), matching HopAdminRequest — separate from api/hop/requests.ts's member/
// admin GET branching so that file doesn't grow a third caller-role shape.
async function handleMyRequests(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const concierge = await requireConcierge(sql, request)
  if (isResponse(concierge)) return concierge

  const rows = await sql`
    SELECT r.id, r.service_type, r.status, r.details, r.requested_for, r.created_at, r.updated_at,
           r.handled_by, r.accepted_at,
           u.id AS user_id, u.first_name, u.last_name, u.email, u.phone AS user_phone
    FROM hop_service_requests r
    JOIN hop_users u ON u.id = r.user_id
    WHERE r.handled_by = ${concierge.id}
    ORDER BY r.created_at DESC
  `
  const ids = (rows as Array<{ id: string }>).map((row) => row.id)
  const historyRows = ids.length
    ? await sql`
        SELECT h.request_id, h.status, h.note, h.created_at, h.changed_by,
               s.first_name AS staff_first_name, s.last_name AS staff_last_name
        FROM hop_service_request_status_history h
        LEFT JOIN hop_users s ON s.id = h.changed_by
        WHERE h.request_id = ANY(${ids})
        ORDER BY h.created_at ASC
      `
    : []

  const byRequest = new Map<string, unknown[]>()
  for (const row of historyRows as Array<{ request_id: string }>) {
    const list = byRequest.get(row.request_id) || []
    list.push(row)
    byRequest.set(row.request_id, list)
  }

  const requests = (
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
    }>
  ).map((row) => {
    const history = (byRequest.get(row.id) || []) as Array<{
      status: string
      note: string
      created_at: string
      staff_first_name: string | null
      staff_last_name: string | null
    }>
    return {
      ...row,
      assignee_name: null as string | null,
      history: history.map((h) => ({
        status: h.status,
        note: h.note,
        created_at: h.created_at,
        staff_name: h.staff_first_name ? `${h.staff_first_name} ${h.staff_last_name}` : null,
      })),
      valid_next_statuses: nextValidStatuses(row.service_type, row.status as RequestStatus),
    }
  })

  return json({ requests })
}

// On/off-duty self-toggle (2026-07-23) — the raw signal for the admin "working today" roster
// and the future Facility-portal overtime metric. See hop_duty_log in db/schema.sql and
// docs/hop/architecture.md ("Phase 1 quick wins"). Deliberately self-reported, not GPS-verified.
async function handleGetDutyStatus(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const concierge = await requireConcierge(sql, request)
  if (isResponse(concierge)) return concierge

  const rows = await sql`
    SELECT clock_in_at FROM hop_duty_log
    WHERE user_id = ${concierge.id} AND clock_out_at IS NULL
    ORDER BY clock_in_at DESC LIMIT 1
  `
  const row = rows[0] as { clock_in_at: string } | undefined
  return json({ onDuty: Boolean(row), since: row?.clock_in_at || null })
}

async function handleSetDutyStatus(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const concierge = await requireConcierge(sql, request)
  if (isResponse(concierge)) return concierge

  try {
    const body = (await request.json()) as { onDuty?: unknown }
    if (typeof body.onDuty !== 'boolean') throw new Error('Choose on or off duty')

    if (body.onDuty) {
      const openRows = await sql`
        SELECT id FROM hop_duty_log WHERE user_id = ${concierge.id} AND clock_out_at IS NULL
      `
      if (openRows.length === 0) {
        await sql`INSERT INTO hop_duty_log (user_id) VALUES (${concierge.id})`
      }
    } else {
      await sql`
        UPDATE hop_duty_log SET clock_out_at = NOW()
        WHERE user_id = ${concierge.id} AND clock_out_at IS NULL
      `
    }

    return handleGetDutyStatus(request)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update your duty status'
    const status = /Choose on or off duty/i.test(message) ? 400 : 500
    if (status === 500) console.error('HOP duty status update failed', error)
    return json({ error: status === 400 ? message : 'Could not update your duty status' }, status)
  }
}

export async function GET(request: Request): Promise<Response> {
  switch (actionFromUrl(request)) {
    case 'profile':
      return handleGetProfile(request)
    case 'my-requests':
      return handleMyRequests(request)
    case 'duty-status':
      return handleGetDutyStatus(request)
    default:
      return json({ error: 'Not found' }, 404)
  }
}

export async function PATCH(request: Request): Promise<Response> {
  switch (actionFromUrl(request)) {
    case 'profile':
      return handleUpdateProfile(request)
    default:
      return json({ error: 'Not found' }, 404)
  }
}

export async function POST(request: Request): Promise<Response> {
  switch (actionFromUrl(request)) {
    case 'duty-status':
      return handleSetDutyStatus(request)
    default:
      return json({ error: 'Not found' }, 404)
  }
}
