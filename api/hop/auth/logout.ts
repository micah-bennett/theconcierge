import { dbUnavailable, getSql } from '../../_lib/hopDb.js'
import { clearSessionCookie, destroySession, json, jsonWithCookie } from '../../_lib/hopAuth.js'

export async function POST(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  await destroySession(sql, request)
  return jsonWithCookie({ ok: true }, 200, clearSessionCookie(request))
}

export function GET(): Response {
  return json({ error: 'Method not allowed' }, 405)
}
