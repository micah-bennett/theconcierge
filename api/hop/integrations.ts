import { dbUnavailable, getSql } from '../_lib/hopDb.js'
import { isResponse, json, requireUser } from '../_lib/hopAuth.js'

const ALL_PROVIDERS = ['google_calendar', 'fitbit', 'oura', 'apple_health', 'garmin'] as const

export async function GET(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await requireUser(sql, request)
  if (isResponse(user)) return user

  const rows = (await sql`
    SELECT provider, status, external_account_email, connected_at, last_synced_at
    FROM hop_integrations
    WHERE user_id = ${user.id}
  `) as Array<{
    provider: string
    status: string
    external_account_email: string
    connected_at: string | null
    last_synced_at: string | null
  }>

  const byProvider = new Map(rows.map((row) => [row.provider, row]))
  const integrations = ALL_PROVIDERS.map((provider) => {
    const row = byProvider.get(provider)
    return (
      row || {
        provider,
        status: 'disconnected',
        external_account_email: '',
        connected_at: null,
        last_synced_at: null,
      }
    )
  })

  return json({ integrations })
}

export function POST(): Response {
  return json({ error: 'Method not allowed' }, 405)
}
