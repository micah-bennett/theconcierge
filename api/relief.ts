import { neon } from '@neondatabase/serverless'

import { sendReliefEmail } from './_lib/email.js'
import { validateReliefPayload } from './_lib/reliefValidation.js'

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request): Promise<Response> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return json({ error: 'Database is not configured' }, 503)

  try {
    const contentLength = Number(request.headers.get('content-length') || '0')
    if (contentLength > 8_192) return json({ error: 'Request is too large' }, 413)

    const data = validateReliefPayload(await request.json())
    const sql = neon(databaseUrl)
    const rows = await sql`
      INSERT INTO relief_call_requests (name, title_facility, email, phone, notes)
      VALUES (${data.name}, ${data.titleFacility}, ${data.email}, ${data.phone}, ${data.notes})
      RETURNING id
    `
    const requestId = String(rows[0]?.id || '')

    try {
      await sendReliefEmail(data)
    } catch (error) {
      console.error('Relief call saved but email delivery failed', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return json({ ok: true, requestId }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request'
    const status = /Invalid|required|valid|too long|Enter/i.test(message) ? 400 : 500
    if (status === 500) console.error('Relief call submission failed', error)
    return json({ error: status === 400 ? message : 'Could not submit the request' }, status)
  }
}

export function GET(): Response {
  return json({ error: 'Method not allowed' }, 405)
}
