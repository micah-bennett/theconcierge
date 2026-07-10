import { getSql } from '../../../_lib/hopDb.js'
import { clearOAuthStateCookie, getSessionUser, readOAuthStateCookie } from '../../../_lib/hopAuth.js'
import { exchangeGoogleCode, getGoogleConfig } from '../../../_lib/googleCalendar.js'

function redirectTo(path: string, request: Request, clearCookie: string): Response {
  const url = new URL(path, request.url)
  return new Response(null, {
    status: 302,
    headers: { Location: url.toString(), 'Set-Cookie': clearCookie },
  })
}

export async function GET(request: Request): Promise<Response> {
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

export function POST(): Response {
  return Response.json({ error: 'Method not allowed' }, { status: 405 })
}
