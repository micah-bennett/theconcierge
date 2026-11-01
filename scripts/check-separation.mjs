#!/usr/bin/env node
// Verifies that individual customer activity never reaches organization-level reporting.
// READ-ONLY: it only runs SELECTs, so it is safe against the live database.
//
//   DATABASE_URL=<database> npm run hop:check-separation
//
// What it checks (each must be 0):
//   1. Concierge Portal customers attached to a facility, or with a staff profile (the only path
//      Facility View counts through).
//   2. Requests whose channel doesn't match their source (concierge/instant must not be 'organization').
//   3. Instant (no-account) requests that have a member.
//   4. Requests Facility View would count (its exact joins) that come from a non-staff account or a
//      non-organization channel. This is the leak test.
//   5. Check-ins from non-staff accounts.
// Exit code 1 if anything is non-zero, so it can run in CI.
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('Set DATABASE_URL.')
  process.exit(1)
}
const sql = neon(url)

const checks = [
  [
    'Customers attached to a facility',
    sql`SELECT COUNT(*)::int AS n FROM portal_users WHERE role = 'customer' AND facility_id IS NOT NULL`,
  ],
  [
    'Customers with a staff profile',
    sql`SELECT COUNT(*)::int AS n FROM portal_staff_profiles p JOIN portal_users u ON u.id = p.user_id WHERE u.role = 'customer'`,
  ],
  [
    'Concierge/instant requests not on their own channel',
    sql`SELECT COUNT(*)::int AS n FROM portal_requests
        WHERE (data->>'source' = 'concierge' AND channel <> 'concierge')
           OR (data->>'source' = 'instant' AND channel <> 'instant')
           OR (channel <> 'organization' AND COALESCE(data->>'source', '') NOT IN ('concierge', 'instant'))`,
  ],
  [
    'Customer-account requests on the organization channel',
    sql`SELECT COUNT(*)::int AS n FROM portal_requests r JOIN portal_users u ON u.id = r.member_id
        WHERE u.role = 'customer' AND r.channel = 'organization'`,
  ],
  [
    'Instant requests with a member',
    sql`SELECT COUNT(*)::int AS n FROM portal_requests WHERE channel = 'instant' AND member_id IS NOT NULL`,
  ],
  [
    // Facility View's request joins WITHOUT its new role/channel filters: anything here that isn't
    // staff + organization would have leaked before the filters existed.
    'Requests reachable through Facility View joins from non-staff or non-organization',
    sql`SELECT COUNT(*)::int AS n FROM portal_requests r
        JOIN portal_staff_profiles s ON s.user_id = r.member_id
        JOIN portal_units un ON un.id = s.unit_id
        JOIN portal_users u ON u.id = r.member_id
        WHERE u.role <> 'staff' OR r.channel <> 'organization'`,
  ],
  [
    'Check-ins from non-staff accounts',
    sql`SELECT COUNT(*)::int AS n FROM portal_checkins c JOIN portal_users u ON u.id = c.user_id WHERE u.role <> 'staff'`,
  ],
]

let bad = 0
for (const [label, query] of checks) {
  const [{ n }] = await query
  console.log(`${n === 0 ? 'PASS' : 'FAIL'}  ${label}: ${n}`)
  if (n !== 0) bad++
}

const [totals] = await sql`
  SELECT COUNT(*) FILTER (WHERE channel = 'organization')::int AS organization,
         COUNT(*) FILTER (WHERE channel = 'concierge')::int AS concierge,
         COUNT(*) FILTER (WHERE channel = 'instant')::int AS instant
  FROM portal_requests`
console.log(`\nRequests by channel: organization ${totals.organization}, concierge ${totals.concierge}, instant ${totals.instant}`)
console.log(bad ? `\n${bad} check(s) failed.` : '\nIndividual customer activity is separate from organization reporting.')
process.exit(bad ? 1 : 0)
