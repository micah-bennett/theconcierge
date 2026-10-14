import { neon } from '@neondatabase/serverless'

import { sendInquiryEmail } from './_lib/email.js'
import { validateInquiryPayload } from './_lib/inquiryValidation.js'

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

// The public site's "Start a Conversation" form (src/pages/site/ContactPage.tsx).
// Validate, insert into hop_inquiries, then email the owner. A failed email never fails the request.
export async function POST(request: Request): Promise<Response> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return json({ error: 'Database is not configured' }, 503)

  try {
    const contentLength = Number(request.headers.get('content-length') || '0')
    if (contentLength > 16_384) return json({ error: 'Request is too large' }, 413)

    const data = validateInquiryPayload(await request.json())
    const sql = neon(databaseUrl)
    const rows = await sql`
      INSERT INTO hop_inquiries (first_name, last_name, email, organization, interest, message)
      VALUES (${data.firstName}, ${data.lastName}, ${data.email}, ${data.organization},
        ${data.interest}, ${data.message})
      RETURNING id
    `
    const inquiryId = String(rows[0]?.id || '')

    try {
      await sendInquiryEmail(data)
    } catch (error) {
      console.error('Inquiry saved but email delivery failed', {
        inquiryId,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return json({ ok: true, inquiryId }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request'
    const status = /Invalid|required|valid|too long|Enter/i.test(message) ? 400 : 500
    if (status === 500) console.error('Inquiry submission failed', error)
    return json({ error: status === 400 ? message : 'Could not send your inquiry' }, status)
  }
}

export function GET(): Response {
  return json({ error: 'Method not allowed' }, 405)
}
