#!/usr/bin/env node
// Non-interactive, re-runnable seed for testing HOP + HOP ConciergeHub end-to-end: one HOP
// user, one ConciergeHub admin, one concierge (with a profile), a sample assigned request, and
// a couple of sample messages on it. Safe to run repeatedly — upserts by email/request rather
// than accumulating duplicates. Requires DATABASE_URL in the environment.
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Set DATABASE_URL in your environment first, e.g.:')
  console.error('  DATABASE_URL="$(grep DATABASE_URL .env.local | cut -d= -f2-)" node scripts/seed-hop-concierge-hub.mjs')
  process.exit(1)
}

const TEST_PASSWORD = 'HopTest#2026'

const ACCOUNTS = {
  user: { email: 'test.user@theconcierge.life', firstName: 'Taylor', lastName: 'User', role: 'user' },
  admin: { email: 'test.admin@theconcierge.life', firstName: 'Avery', lastName: 'Admin', role: 'admin' },
  concierge: {
    email: 'test.concierge@theconcierge.life',
    firstName: 'Casey',
    lastName: 'Concierge',
    role: 'concierge',
  },
  facility: {
    email: 'test.facility@theconcierge.life',
    firstName: 'Jordan',
    lastName: 'Facility',
    role: 'facility',
  },
}

async function upsertAccount(sql, account) {
  const email = account.email.toLowerCase()
  const existing = await sql`SELECT id FROM hop_users WHERE LOWER(email) = ${email}`
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12)

  if (existing.length > 0) {
    const id = existing[0].id
    await sql`
      UPDATE hop_users
      SET password_hash = ${passwordHash}, first_name = ${account.firstName}, last_name = ${account.lastName},
          role = ${account.role}, status = 'active', failed_login_attempts = 0, locked_until = NULL,
          updated_at = NOW()
      WHERE id = ${id}
    `
    return id
  }

  const rows = await sql`
    INSERT INTO hop_users (email, password_hash, first_name, last_name, role)
    VALUES (${email}, ${passwordHash}, ${account.firstName}, ${account.lastName}, ${account.role})
    RETURNING id
  `
  return rows[0].id
}

// A marker prefix on the first seed post's body — used to detect "have we already seeded the
// Feed" so re-running this script doesn't pile up duplicate posts each time.
const SEED_FEED_MARKER = '[seed-hop-concierge-hub]'

// Pre-fills the shared HOP Feed with realistic posts/reactions/statuses across the 4 seeded
// test accounts, so the feed looks lived-in immediately rather than empty on first login. See
// hop_social_posts/hop_social_reactions/hop_user_status in db/schema.sql and api/hop/social.ts.
async function seedFeed(sql, { userId, adminId, conciergeId, facilityId }) {
  const existing = await sql`
    SELECT id FROM hop_social_posts WHERE body LIKE ${SEED_FEED_MARKER + '%'} LIMIT 1
  `
  if (existing.length > 0) return

  // { authorId, body, hoursAgo } — staggered timestamps so the feed reads as an ongoing
  // timeline, oldest first (inserted in this order, newest ends up on top by created_at DESC).
  const POSTS = [
    { authorId: adminId, hoursAgo: 96, body: `${SEED_FEED_MARKER} Welcome to the new HOP Feed! 👋 One shared place for shout-outs, updates, and getting to know the team.` },
    { authorId: facilityId, hoursAgo: 74, body: 'Request volume was up again this week and morale scores held steady — nice work, everyone.' },
    { authorId: conciergeId, hoursAgo: 51, body: 'Reminder: if a ride request comes in during the evening shift change, tag an admin so it doesn\'t sit unassigned. Thanks!' },
    { authorId: userId, hoursAgo: 43, body: 'Just want to say the concierge team made my week so much easier — got a same-day errand handled while I was on a double shift. 🙏' },
    { authorId: adminId, hoursAgo: 30, body: 'Please welcome our newest concierge to the team this week — say hi if you see them around!' },
    { authorId: conciergeId, hoursAgo: 21, body: 'Coffee run before the morning shift starts — let me know if anyone wants anything. ☕' },
    { authorId: facilityId, hoursAgo: 12, body: 'Logged another retention win this week — a staff member said the wellness check-ins genuinely helped. 💛' },
    { authorId: userId, hoursAgo: 5, body: 'Family Care came through for school pickup today when my shift ran long. Such a relief.' },
    { authorId: adminId, hoursAgo: 2, body: 'Friendly reminder: set your status below if you\'re out or between departments, so the team knows who\'s around.' },
  ]

  const postIds = []
  for (const post of POSTS) {
    const rows = await sql`
      INSERT INTO hop_social_posts (author_id, body, created_at)
      VALUES (${post.authorId}, ${post.body}, NOW() - (${post.hoursAgo} || ' hours')::interval)
      RETURNING id
    `
    postIds.push(rows[0].id)
  }

  // A handful of cross-reactions so counts are non-zero on first view — not exhaustive, just
  // enough to make the feed feel alive.
  const REACTIONS = [
    { postIndex: 0, userId: userId, reaction: 'like' },
    { postIndex: 0, userId: conciergeId, reaction: 'celebrate' },
    { postIndex: 0, userId: facilityId, reaction: 'like' },
    { postIndex: 1, userId: adminId, reaction: 'celebrate' },
    { postIndex: 1, userId: conciergeId, reaction: 'like' },
    { postIndex: 3, userId: adminId, reaction: 'support' },
    { postIndex: 3, userId: conciergeId, reaction: 'like' },
    { postIndex: 3, userId: facilityId, reaction: 'celebrate' },
    { postIndex: 6, userId: userId, reaction: 'celebrate' },
    { postIndex: 6, userId: adminId, reaction: 'support' },
    { postIndex: 7, userId: adminId, reaction: 'support' },
  ]
  for (const r of REACTIONS) {
    await sql`
      INSERT INTO hop_social_reactions (post_id, user_id, reaction)
      VALUES (${postIds[r.postIndex]}, ${r.userId}, ${r.reaction})
      ON CONFLICT (post_id, user_id) DO NOTHING
    `
  }

  // One status per test account, varied so the "who's around" rail isn't empty or uniform.
  const STATUSES = [
    { userId: userId, statusType: 'available', statusNote: '' },
    { userId: adminId, statusType: 'available', statusNote: 'In dispatch most of the day' },
    { userId: conciergeId, statusType: 'available', statusNote: 'On shift until 6pm' },
    { userId: facilityId, statusType: 'on_vacation', statusNote: 'Back next Monday' },
  ]
  for (const s of STATUSES) {
    await sql`
      INSERT INTO hop_user_status (user_id, status_type, status_note)
      VALUES (${s.userId}, ${s.statusType}, ${s.statusNote})
      ON CONFLICT (user_id) DO UPDATE SET
        status_type = EXCLUDED.status_type, status_note = EXCLUDED.status_note, updated_at = NOW()
    `
  }

  console.log(`Seeded ${postIds.length} Feed posts, ${REACTIONS.length} reactions, and ${STATUSES.length} statuses.`)
}

async function main() {
  const sql = neon(databaseUrl)

  const userId = await upsertAccount(sql, ACCOUNTS.user)
  const adminId = await upsertAccount(sql, ACCOUNTS.admin)
  const conciergeId = await upsertAccount(sql, ACCOUNTS.concierge)
  const facilityId = await upsertAccount(sql, ACCOUNTS.facility)

  await sql`
    INSERT INTO hop_concierge_profiles (user_id, headline, bio, specialties, years_experience)
    VALUES (
      ${conciergeId},
      'Ride, errand, and family-care specialist',
      'I have supported healthcare staff and their families for over five years, coordinating everything from school pickups to same-day errands so shifts never get missed.',
      ${['Rides & transportation', 'Family & childcare logistics', 'Errands']},
      5
    )
    ON CONFLICT (user_id) DO UPDATE SET
      headline = EXCLUDED.headline,
      bio = EXCLUDED.bio,
      specialties = EXCLUDED.specialties,
      years_experience = EXCLUDED.years_experience,
      updated_at = NOW()
  `

  const SEED_NOTE = '[seed-hop-concierge-hub] sample request'
  let requestId
  const existingRequest = await sql`
    SELECT id FROM hop_service_requests
    WHERE user_id = ${userId} AND handled_by = ${conciergeId} AND details LIKE ${SEED_NOTE + '%'}
    LIMIT 1
  `
  if (existingRequest.length > 0) {
    requestId = existingRequest[0].id
  } else {
    const requestRows = await sql`
      INSERT INTO hop_service_requests (user_id, service_type, status, details, handled_by, requested_for)
      VALUES (
        ${userId}, 'ride', 'in_progress',
        ${SEED_NOTE + ' — ride to a 2pm cardiology appointment'},
        ${conciergeId}, NOW() + interval '2 hours'
      )
      RETURNING id
    `
    requestId = requestRows[0].id

    await sql`
      INSERT INTO hop_service_request_status_history (request_id, status, changed_by, note)
      VALUES
        (${requestId}, 'received', ${adminId}, 'Assigned to Casey — confirmed appointment time with the clinic.'),
        (${requestId}, 'in_progress', ${conciergeId}, 'On my way to pick up the vehicle, will confirm pickup time shortly.')
    `

    await sql`
      INSERT INTO hop_request_messages (request_id, sender_id, body)
      VALUES
        (${requestId}, ${userId}, 'Hi! Just confirming — pickup is from the east parking lot, right?'),
        (${requestId}, ${conciergeId}, 'Yes, east lot at 1:30pm. I will text you when I am 5 minutes out.')
    `
  }

  await seedFeed(sql, { userId, adminId, conciergeId, facilityId })

  console.log('\nHOP ConciergeHub seed complete.\n')
  console.log('Shared password for all seeded accounts:', TEST_PASSWORD)
  console.log('')
  console.log('HOP user (consumer app — main deployment, /hop/login):')
  console.log(' ', ACCOUNTS.user.email)
  console.log('')
  console.log('ConciergeHub admin (/hop/admin/login on the ConciergeHub deployment):')
  console.log(' ', ACCOUNTS.admin.email)
  console.log('')
  console.log('ConciergeHub concierge (/hop/admin/login on the ConciergeHub deployment):')
  console.log(' ', ACCOUNTS.concierge.email)
  console.log('')
  console.log('ConciergeHub Facility Admin (/hop/admin/login on the ConciergeHub deployment):')
  console.log(' ', ACCOUNTS.facility.email)
  console.log('')
  console.log('Seeded sample request id:', requestId)
  console.log('(status: in_progress, assigned to the test concierge, with history + 2 messages)')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
