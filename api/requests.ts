import { neon } from '@neondatabase/serverless'

import { sendRequestEmails } from './_lib/email.js'
import { validateRequestPayload } from './_lib/requestValidation.js'

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request): Promise<Response> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return json({ error: 'Database is not configured' }, 503)

  try {
    const contentLength = Number(request.headers.get('content-length') || '0')
    if (contentLength > 16_384) return json({ error: 'Request is too large' }, 413)

    const data = validateRequestPayload(await request.json())
    const sql = neon(databaseUrl)
    const rows = await sql`
      INSERT INTO concierge_requests (
        first_name, last_name, address_line_1, address_line_2, city, state, zip, country,
        phone, email, date_needed, time_needed, request_type, details, hear_about_us,
        payment_method, cardholder_name, card_last_four, exp_month, exp_year
      ) VALUES (
        ${data.firstName}, ${data.lastName}, ${data.addressLine1}, ${data.addressLine2},
        ${data.city}, ${data.state}, ${data.zip}, ${data.country}, ${data.phone},
        ${data.email}, ${data.dateNeeded}, ${data.timeNeeded}, ${data.requestType},
        ${data.details}, ${data.hearAboutUs}, ${data.paymentMethod}, ${data.cardholderName},
        ${data.cardLastFour}, ${data.expMonth}, ${data.expYear}
      )
      RETURNING id
    `
    const requestId = String(rows[0]?.id || '')

    try {
      await sendRequestEmails(data, requestId)
    } catch (error) {
      console.error('Request saved but email delivery failed', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return json({ ok: true, requestId }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request'
    const status = /Invalid|required|valid|too long/i.test(message) ? 400 : 500
    if (status === 500) console.error('Request submission failed', error)
    return json({ error: status === 400 ? message : 'Could not submit the request' }, status)
  }
}

export function GET(): Response {
  return json({ error: 'Method not allowed' }, 405)
}
