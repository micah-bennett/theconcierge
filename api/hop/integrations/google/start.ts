import { randomBytes } from 'node:crypto'
import { dbUnavailable, getSql } from '../../../_lib/hopDb.js'
import { isResponse, json, requireUser, setOAuthStateCookie } from '../../../_lib/hopAuth.js'
import { buildGoogleAuthUrl, getGoogleConfig } from '../../../_lib/googleCalendar.js'

export async function GET(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const config = getGoogleConfig()
  if (!config) return json({ error: 'Google Calendar is not configured yet' }, 503)

  const state = randomBytes(16).toString('hex')
  const authUrl = buildGoogleAuthUrl(config, state)

  return new Response(null, {
    status: 302,
    headers: { Location: authUrl, 'Set-Cookie': setOAuthStateCookie(request, state) },
  })
}

export function POST(): Response {
  return json({ error: 'Method not allowed' }, 405)
}
