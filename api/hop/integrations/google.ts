import { randomBytes } from 'node:crypto'
import { dbUnavailable, getSql } from '../../_lib/hopDb.js'
import {
  clearOAuthStateCookie,
  getSessionUser,
  isResponse,
  json,
  readOAuthStateCookie,
  requireUser,
  setOAuthStateCookie,
} from '../../_lib/hopAuth.js'
import {
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  getGoogleConfig,
  listUpcomingEvents,
  refreshGoogleAccessToken,
} from '../../_lib/googleCalendar.js'

function actionFromUrl(request: Request): string {
  return new URL(request.url).searchParams.get('action') || ''
}

const ALL_PROVIDERS = ['google_calendar', 'fitbit', 'oura', 'apple_health', 'garmin'] as const

// Folded in from the former api/hop/integrations.ts (2026-07-23, function-budget consolidation
// — see docs/hop/architecture.md) — the caller's own connection status across every provider,
// not just Google. Kept as its own action rather than merged into handleEvents/handleStart
// since it's a different resource shape (list vs. single-provider OAuth flow).
async function handleList(request: Request): Promise<Response> {
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

async function handleStart(request: Request): Promise<Response> {
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

function redirectTo(path: string, request: Request, clearCookie: string): Response {
  const url = new URL(path, request.url)
  return new Response(null, {
    status: 302,
    headers: { Location: url.toString(), 'Set-Cookie': clearCookie },
  })
}

async function handleCallback(request: Request): Promise<Response> {
  const sql = getSql()
  const clearCookie = clearOAuthStateCookie(request)
  if (!sql) return redirectTo('/hop/app/integrations?error=db', request, clearCookie)

  const user = await getSessionUser(sql, request)
  if (!user) return redirectTo('/hop/login', request, clearCookie)

  const config = getGoogleConfig()
  if (!config) return redirectTo('/hop/app/integrations?error=not_configured', request, clearCookie)

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const expectedState = readOAuthStateCookie(request)

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectTo('/hop/app/integrations?error=state_mismatch', request, clearCookie)
  }

  try {
    const tokens = await exchangeGoogleCode(config, code)
    await sql`
      INSERT INTO hop_integrations (
        user_id, provider, status, access_token, refresh_token, token_expires_at,
        external_account_email, connected_at, last_synced_at
      ) VALUES (
        ${user.id}, 'google_calendar', 'connected', ${tokens.accessToken}, ${tokens.refreshToken},
        ${tokens.expiresAt}, ${tokens.email || ''}, NOW(), NULL
      )
      ON CONFLICT (user_id, provider) DO UPDATE SET
        status = 'connected',
        access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(EXCLUDED.refresh_token, hop_integrations.refresh_token),
        token_expires_at = EXCLUDED.token_expires_at,
        external_account_email = EXCLUDED.external_account_email,
        connected_at = NOW(),
        updated_at = NOW()
    `
    return redirectTo('/hop/app/integrations?connected=google', request, clearCookie)
  } catch (error) {
    console.error('Google Calendar connect failed', error)
    return redirectTo('/hop/app/integrations?error=connect_failed', request, clearCookie)
  }
}

type IntegrationRow = { access_token: string; refresh_token: string | null; token_expires_at: string }

async function handleEvents(request: Request): Promise<Response> {
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

async function handleDisconnect(request: Request): Promise<Response> {
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

export async function GET(request: Request): Promise<Response> {
  switch (actionFromUrl(request)) {
    case 'start':
      return handleStart(request)
    case 'callback':
      return handleCallback(request)
    case 'events':
      return handleEvents(request)
    case 'list':
      return handleList(request)
    default:
      return json({ error: 'Not found' }, 404)
  }
}

export async function POST(request: Request): Promise<Response> {
  if (actionFromUrl(request) === 'disconnect') return handleDisconnect(request)
  return json({ error: 'Method not allowed' }, 405)
}
