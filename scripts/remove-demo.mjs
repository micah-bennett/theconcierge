#!/usr/bin/env node
// Deletes everything scripts/seed-demo.mjs created, plus anything the demo accounts did since
// (their requests, the jobs sent to demo reps, support sent from the demo facility).
// Run this before real staff sign up if the demo was seeded into the live database.
//
//   CONFIRM_REMOVE_DEMO=1 DATABASE_URL=<database> npm run hop:remove-demo
//
// Only touches the seed's fixed ids (d0000000-0000-4000-8000-…) and accounts with an @demo.hop
// email (made while testing). Real accounts, facilities and the old hop_* tables are never touched.
import { neon } from '@neondatabase/serverless'

if (process.env.CONFIRM_REMOVE_DEMO !== '1') {
  console.error('Refusing to run: set CONFIRM_REMOVE_DEMO=1 to delete the demo data.')
  process.exit(1)
}
const url = process.env.DATABASE_URL
if (!url) {
  console.error('Set DATABASE_URL.')
  process.exit(1)
}
const sql = neon(url)
const DEMO = 'd0000000-0000-4000-8000-%'
const users = (
  await sql`SELECT id FROM portal_users WHERE id::text LIKE ${DEMO} OR lower(email) LIKE '%@demo.hop'`
).map((u) => u.id)

const requests = (
  await sql`
    SELECT id FROM portal_requests WHERE member_id = ANY(${users}) OR id IN ('r0', 'r1', 'r2', 'r3')
    UNION
    SELECT request_id FROM portal_support_actions WHERE facility_id::text LIKE ${DEMO} AND request_id IS NOT NULL`
).map((r) => r.id)

// Job events and door events cascade from jobs; sessions, tokens, profiles, point claims, check-ins,
// redemptions, game plays, life items and interest from users; units, signals and support actions
// from the facility.
const jobs = await sql`
  DELETE FROM portal_jobs
  WHERE rep_id = ANY(${users}) OR id IN ('j1', 'j2', 'j3', 'j4', 'j5') OR request_id = ANY(${requests})
  RETURNING id`
const jobIds = jobs.map((j) => j.id)
// Messages are keyed by thread, not tied to users: drop demo users' threads and demo jobs' chats.
await sql`
  DELETE FROM portal_messages
  WHERE sender_id = ANY(${users})
     OR (thread_kind IN ('staff', 'rep') AND thread_key = ANY(${users.map(String)}))
     OR (thread_kind = 'job' AND thread_key = ANY(${jobIds}))`
await sql`DELETE FROM portal_ratings WHERE request_id = ANY(${requests}) OR rep_id = ANY(${users})`
const reqs = await sql`DELETE FROM portal_requests WHERE id = ANY(${requests}) RETURNING id`
const gone = await sql`DELETE FROM portal_users WHERE id = ANY(${users}) RETURNING id`
const facs = await sql`DELETE FROM portal_facilities WHERE id::text LIKE ${DEMO} RETURNING id`

console.log(
  `Removed ${gone.length} demo accounts, ${facs.length} demo facility, ${jobs.length} jobs, ${reqs.length} requests.`
)
