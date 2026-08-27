import { neon } from '@neondatabase/serverless'

import { sendRequestEmails, sendReliefEmail } from './_lib/email.js'
import { validateRequestPayload } from './_lib/requestValidation.js'
import { validateReliefPayload } from './_lib/reliefValidation.js'

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

function actionFromUrl(request: Request): string {
  return new URL(request.url).searchParams.get('type') || ''
}

async function handleConciergeRequest(request: Request): Promise<Response> {
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

// Merged in from the former standalone api/relief.ts (2026-08-27, function-budget
// consolidation) — an orphaned, unlinked-from-any-UI facility discovery-call intake, kept
// working end-to-end (it still functions if called directly) but not reachable from any page.
// See docs/hop/mvp-scope.md's "Orphaned" note for the history. Distinct table
// (relief_call_requests), distinct email (sendReliefEmail), same validate-insert-email shape as
// the default concierge-request path above, so merging into one file/one POST handler is
// low-risk despite the two products being otherwise unrelated.
async function handleReliefCall(request: Request): Promise<Response> {
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

export async function POST(request: Request): Promise<Response> {
  if (actionFromUrl(request) === 'relief') return handleReliefCall(request)
  return handleConciergeRequest(request)
}

export function GET(): Response {
  return json({ error: 'Method not allowed' }, 405)
}
