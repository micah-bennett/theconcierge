import { neon } from '@neondatabase/serverless'
import type { NeonQueryFunction } from '@neondatabase/serverless'

export function getSql(): NeonQueryFunction<false, false> | null {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return null
  return neon<false, false>(databaseUrl)
}

export function dbUnavailable(): Response {
  return Response.json({ error: 'Database is not configured' }, { status: 503 })
}
