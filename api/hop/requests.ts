import { dbUnavailable, getSql } from '../_lib/hopDb.js'
import { isResponse, json, requireUser } from '../_lib/hopAuth.js'

const SERVICE_TYPES = ['ride', 'meal', 'errand', 'wellness', 'family_home', 'other'] as const

type ServiceType = (typeof SERVICE_TYPES)[number]

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

export async function GET(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const rows =
    user.role === 'admin'
      ? await sql`
          SELECT r.id, r.service_type, r.status, r.details, r.requested_for, r.created_at, r.updated_at,
                 u.id AS user_id, u.first_name, u.last_name, u.email
          FROM hop_service_requests r
          JOIN hop_users u ON u.id = r.user_id
          ORDER BY r.created_at DESC
        `
      : await sql`
          SELECT id, service_type, status, details, requested_for, created_at, updated_at
          FROM hop_service_requests
          WHERE user_id = ${user.id}
          ORDER BY created_at DESC
        `

  return json({ requests: rows })
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
