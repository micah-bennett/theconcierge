import { randomBytes } from 'node:crypto'
import { neon } from '@neondatabase/serverless'

import { sendInstantRequestEmail } from './_lib/email.js'
import {
  RequestValidationError,
  isHoneypotFilled,
  toStaffRequest,
  validateInstantRequest,
} from './_lib/requestValidation.js'

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

/** Same shape as packages/shared/src/server/store.ts newId("r"): "r" + 8 lowercase hex characters. */
function newRequestId(): string {
  return 'r' + randomBytes(4).toString('hex')
}

// The public site's no-account "Instant request" form (src/pages/site/RequestPage.tsx).
// Validate, insert into portal_requests (channel 'instant', no member) so it shows up in the
// Concierge Console queue, then email the owner. A failed email never fails the request.
export async function POST(request: Request): Promise<Response> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return json({ error: 'Requests are not available right now' }, 503)

  try {
    const contentLength = Number(request.headers.get('content-length') || '0')
    if (contentLength > 16_384) return json({ error: 'Request is too large' }, 413)

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return json({ error: 'Invalid request body' }, 400)
    }

    // Honeypot: pretend it worked and do nothing.
    if (isHoneypotFilled(body)) return json({ ok: true }, 200)

    const data = validateInstantRequest(body)
    const record = toStaffRequest(data, newRequestId())

    const sql = neon(databaseUrl)
    await sql`
      INSERT INTO portal_requests (id, member_id, status, job_id, data, channel)
      VALUES (${record.id}, NULL, 'new', NULL, ${JSON.stringify(record)}::jsonb, 'instant')
    `

    try {
      await sendInstantRequestEmail(data, record.id)
    } catch (error) {
      console.error('Instant request saved but email delivery failed', {
        requestId: record.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return json({ ok: true, requestId: record.id }, 201)
  } catch (error) {
    if (error instanceof RequestValidationError) return json({ error: error.message }, 400)
    console.error('Instant request failed', error)
    return json({ error: 'We could not send your request. Please try again.' }, 500)
  }
}

export function GET(): Response {
  return json({ error: 'Method not allowed' }, 405)
}
