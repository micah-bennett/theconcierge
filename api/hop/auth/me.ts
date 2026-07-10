import { dbUnavailable, getSql } from '../../_lib/hopDb.js'
import { getSessionUser, json } from '../../_lib/hopAuth.js'

export async function GET(request: Request): Promise<Response> {
  const sql = getSql()
  if (!sql) return dbUnavailable()

  const user = await getSessionUser(sql, request)
  if (!user) return json({ error: 'Not signed in' }, 401)
  return json({ user })
}

export function POST(): Response {
  return json({ error: 'Method not allowed' }, 405)
}
