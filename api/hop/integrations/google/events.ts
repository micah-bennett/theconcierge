import { dbUnavailable, getSql } from '../../../_lib/hopDb.js'
import { isResponse, json, requireUser } from '../../../_lib/hopAuth.js'
import { getGoogleConfig, listUpcomingEvents, refreshGoogleAccessToken } from '../../../_lib/googleCalendar.js'

type IntegrationRow = {
  access_token: string
  refresh_token: string | null
  token_expires_at: string
}

export async function GET(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const rows = await sql`
    SELECT access_token, refresh_token, token_expires_at
    FROM hop_integrations
    WHERE user_id = ${user.id} AND provider = 'google_calendar' AND status = 'connected'
  `
  const row = rows[0] as IntegrationRow | undefined
  if (!row) return json({ connected: false, events: [] })

  const config = getGoogleConfig()
  if (!config) return json({ error: 'Google Calendar is not configured yet' }, 503)

  try {
    let accessToken = row.access_token
    if (new Date(row.token_expires_at).getTime() <= Date.now()) {
      if (!row.refresh_token) throw new Error('Connection expired — reconnect Google Calendar')
      const refreshed = await refreshGoogleAccessToken(config, row.refresh_token)
      accessToken = refreshed.accessToken
      await sql`
        UPDATE hop_integrations
        SET access_token = ${refreshed.accessToken}, token_expires_at = ${refreshed.expiresAt}, updated_at = NOW()
        WHERE user_id = ${user.id} AND provider = 'google_calendar'
      `
    }

    const events = await listUpcomingEvents(accessToken)
    await sql`
      UPDATE hop_integrations SET last_synced_at = NOW()
      WHERE user_id = ${user.id} AND provider = 'google_calendar'
    `
    return json({ connected: true, events })
  } catch (error) {
    console.error('Google Calendar events fetch failed', error)
    await sql`
      UPDATE hop_integrations SET status = 'error', updated_at = NOW()
      WHERE user_id = ${user.id} AND provider = 'google_calendar'
    `
    return json({ error: 'Could not load calendar events. Try reconnecting.' }, 502)
  }
}

export function POST(): Response {
  return json({ error: 'Method not allowed' }, 405)
}
