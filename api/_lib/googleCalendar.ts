const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly openid email'

type GoogleConfig = { clientId: string; clientSecret: string; redirectUri: string }

export function getGoogleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim()
  if (!clientId || !clientSecret || !redirectUri) return null
  return { clientId, clientSecret, redirectUri }
}

export function buildGoogleAuthUrl(config: GoogleConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `${AUTH_URL}?${params.toString()}`
}

export type GoogleTokens = {
  accessToken: string
  refreshToken: string | null
  expiresAt: string
  email: string | null
}

async function decodeIdEmail(idToken: string | undefined): Promise<string | null> {
  if (!idToken) return null
  try {
    const payload = idToken.split('.')[1]
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { email?: string }
    return decoded.email || null
  } catch {
    return null
  }
}

export async function exchangeGoogleCode(config: GoogleConfig, code: string): Promise<GoogleTokens> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
      code,
    }),
  })
  const result = (await response.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    id_token?: string
    error_description?: string
  }
  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || 'Google did not return an access token')
  }

  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token || null,
    expiresAt: new Date(Date.now() + (result.expires_in || 3600) * 1000).toISOString(),
    email: await decodeIdEmail(result.id_token),
  }
}

export async function refreshGoogleAccessToken(
  config: GoogleConfig,
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: string }> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const result = (await response.json()) as {
    access_token?: string
    expires_in?: number
    error_description?: string
  }
  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || 'Could not refresh the Google Calendar connection')
  }
  return {
    accessToken: result.access_token,
    expiresAt: new Date(Date.now() + (result.expires_in || 3600) * 1000).toISOString(),
  }
}

export type GoogleEvent = { id: string; summary: string; start: string | null; end: string | null }

export async function listUpcomingEvents(accessToken: string): Promise<GoogleEvent[]> {
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    maxResults: '10',
    singleEvents: 'true',
    orderBy: 'startTime',
  })
  const response = await fetch(`${CALENDAR_EVENTS_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const result = (await response.json()) as {
    items?: Array<{ id: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }>
    error?: { message?: string }
  }
  if (!response.ok) throw new Error(result.error?.message || 'Could not load calendar events')

  return (result.items || []).map((item) => ({
    id: item.id,
    summary: item.summary || '(No title)',
    start: item.start?.dateTime || item.start?.date || null,
    end: item.end?.dateTime || item.end?.date || null,
  }))
}
