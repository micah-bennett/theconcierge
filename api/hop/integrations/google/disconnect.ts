import { dbUnavailable, getSql } from '../../../_lib/hopDb.js'
import { isResponse, json, requireUser } from '../../../_lib/hopAuth.js'

export async function POST(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const rows = await sql`
    SELECT access_token FROM hop_integrations
    WHERE user_id = ${user.id} AND provider = 'google_calendar'
  `
  const accessToken = (rows[0] as { access_token: string } | undefined)?.access_token
  if (accessToken) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, {
        method: 'POST',
      })
    } catch (error) {
      console.error('Google token revoke failed (continuing to disconnect locally)', error)
    }
  }

  await sql`DELETE FROM hop_integrations WHERE user_id = ${user.id} AND provider = 'google_calendar'`
  return json({ ok: true })
}

export function GET(): Response {
  return json({ error: 'Method not allowed' }, 405)
}
