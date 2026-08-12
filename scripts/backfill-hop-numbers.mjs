#!/usr/bin/env node
// One-off backfill: assigns a real hop_number (via hop_number_seq) to any hop_users row created
// before the hop_number column existed. Safe to re-run — only touches rows where hop_number IS
// NULL, and new inserts already get a number for free via the column DEFAULT (see db/schema.sql).
// Assigns in created_at order so the earliest/most-senior accounts get the lowest numbers.
// Requires DATABASE_URL in the environment; run once after `npm run db:migrate` picks up the
// hop_number column/sequence. See docs/hop/backend-guide.md.
import { neon } from '@neondatabase/serverless'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Set DATABASE_URL in your environment first, e.g.:')
  console.error(
    '  DATABASE_URL="$(grep DATABASE_URL .env.local | cut -d= -f2-)" node scripts/backfill-hop-numbers.mjs',
  )
  process.exit(1)
}

const sql = neon(databaseUrl)

const rows = await sql`
  SELECT id, email FROM hop_users WHERE hop_number IS NULL ORDER BY created_at ASC
`

if (rows.length === 0) {
  console.log('Nothing to backfill — every account already has a HOP number.')
  process.exit(0)
}

console.log(`Backfilling HOP numbers for ${rows.length} account(s)...`)

for (const row of rows) {
  const updated = await sql`
    UPDATE hop_users
    SET hop_number = 'HOP' || LPAD(nextval('hop_number_seq')::text, 3, '0')
    WHERE id = ${row.id}
    RETURNING hop_number
  `
  console.log(`  ${row.email} -> ${updated[0].hop_number}`)
}

console.log('Done.')
