#!/usr/bin/env node
// Demo data for local development and the leadership walkthrough. Only run it against a database
// with no real Portal users. It was seeded into the live database on 2026-10-17, before launch, at
// the operator's choice. Remove it before real staff sign up: npm run hop:remove-demo.
// Idempotent: fixed ids + ON CONFLICT DO NOTHING, so running it twice changes nothing.
//
//   ALLOW_DEMO_SEED=1 DEMO_PASSWORD='something-10+' DATABASE_URL=<dev branch> npm run hop:seed-demo
//
// Creates one facility with units, demo accounts for every role, the starter's sample jobs and
// requests, and 14 days of check-ins from non-login demo staff, which the Facility View aggregates
// exactly like real ones (shaped like the mockup's departments).
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

if (process.env.ALLOW_DEMO_SEED !== '1') {
  console.error('Refusing to run: set ALLOW_DEMO_SEED=1 to confirm this is NOT the production database.')
  process.exit(1)
}
const url = process.env.DATABASE_URL
const password = process.env.DEMO_PASSWORD || ''
if (!url) {
  console.error('Set DATABASE_URL to your dev database.')
  process.exit(1)
}
if (password.length < 10) {
  console.error('Set DEMO_PASSWORD (10+ characters). Every demo account uses it.')
  process.exit(1)
}

const sql = neon(url)
const id = (n) => `d0000000-0000-4000-8000-${String(n).padStart(12, '0')}`

// ── Facility and units (the mockup's departments; group sizes = its staff counts) ──
const FACILITY = { id: id(1), name: 'Hudson Valley Medical Center', city: 'Poughkeepsie, NY' }
const UNITS = [
  { id: id(11), name: 'Emergency', size: 86 },
  { id: id(12), name: 'ICU', size: 64 },
  { id: id(13), name: 'Cardiology', size: 48 },
  { id: id(14), name: 'Oncology', size: 52 },
  { id: id(15), name: 'Pediatrics', size: 40 },
  { id: id(16), name: 'Home Health', size: 58 },
  // Deliberately below MIN_GROUP_SIZE (5): the Facility View must suppress it.
  { id: id(17), name: 'Wound Care', size: 3 },
]

// ── Accounts ──
const USERS = [
  { id: id(101), email: 'console@demo.hop', role: 'console', first: 'Casey', last: 'Morgan', phone: '' },
  { id: id(201), email: 'renee@demo.hop', role: 'rep', first: 'Renee', last: 'Carter', phone: '(845) 555 0201' },
  { id: id(202), email: 'marcus@demo.hop', role: 'rep', first: 'Marcus', last: 'Diaz', phone: '(845) 555 0202' },
  { id: id(203), email: 'andre@demo.hop', role: 'rep', first: 'Andre', last: 'Wells', phone: '(845) 555 0203' },
  { id: id(301), email: 'jordan@demo.hop', role: 'staff', first: 'Jordan', last: 'Reyes', phone: '(845) 555 0142', title: 'ICU Nurse', unit: id(12) },
  { id: id(302), email: 'patel@demo.hop', role: 'staff', first: 'Anita', last: 'Patel', phone: '(845) 555 0150', title: 'ER Doctor', unit: id(11) },
  { id: id(303), email: 'kelly@demo.hop', role: 'staff', first: 'Kelly', last: 'Walsh', phone: '(845) 555 0151', title: 'Unit Clerk', unit: id(13) },
  { id: id(401), email: 'facility@demo.hop', role: 'facility_admin', first: 'Dana', last: 'Brooks', phone: '' },
]
const REP = { renee: id(201), marcus: id(202), andre: id(203) }

// ── The starter's sample jobs and requests (prototype/starter/lib/seed.ts), re-pointed at user ids ──
const base = { log: [], updates: [], photos: [], sig: null, signedBy: null, notesList: [], done: {}, attn: null, share: true, updatedAt: Date.now(), requestId: null }
const JOBS = [
  { ...base, id: 'j1', rep: REP.renee, cat: 'errand', icon: '💊', title: 'Pharmacy pickup to home', client: 'Jordan Reyes', crole: 'ICU Nurse', phone: '+18455550142', phoneTxt: '(845) 555 0142', pickup: 'Main Street Pharmacy', drop: '12 Maple Ave, Apt 3', window: '3:00 to 5:00 PM', dist: '4.2 mi', vendor: { name: 'Main Street Pharmacy', contact: 'Pharmacy counter', phone: '+18455550190', phoneTxt: '(845) 555 0190' }, items: ['Prescription bag, name on file', 'Ibuprofen 200 mg'], notes: 'Sleeping after a night shift. Do not ring the bell. Leave inside the door on the table.', prefs: ['Text first, call only if urgent', 'Dog Biscuit is friendly', 'Gold member'], door: { kind: 'Smart lock through Alexa', state: 'idle' }, needPhoto: true, needSig: false, status: 'offer', sentAt: '2:41 PM', requestId: 'r0' },
  { ...base, id: 'j3', rep: REP.renee, cat: 'family', icon: '🧒', title: 'School pickup at 3:15', client: 'Sam O.', crole: 'Respiratory Therapist', phone: '+18455550163', phoneTxt: '(845) 555 0163', pickup: 'Lincoln Elementary front office', drop: '48 Birch Lane', window: '3:15 PM sharp', dist: '6.8 mi', vendor: { name: 'Lincoln Elementary', contact: 'Front office', phone: '+18455550101', phoneTxt: '(845) 555 0101' }, items: ['Pick up Leo, age 8', 'Booster seat required'], notes: 'Code word is sunflower. Leo has a nut allergy, no snacks.', prefs: ['Gold member', 'Covering a double today'], door: { kind: 'Smart lock through Google Home', state: 'idle' }, needPhoto: true, needSig: true, status: 'accepted', sentAt: '8:02 AM', log: [['8:11', 'Accepted']] },
  { ...base, id: 'j4', rep: REP.renee, cat: 'pet', icon: '🐕', title: 'Dog walk during a double', client: 'Tasha B.', crole: 'Phlebotomist', phone: '+18455550125', phoneTxt: '(845) 555 0125', pickup: 'Client home', drop: 'Client home', window: '1:00 to 1:45 PM', dist: '2.4 mi', vendor: null, items: ['30 minute walk', 'Fresh water', 'Treat after, top shelf'], notes: 'Max is nervous with strangers. Let him sniff your hand first.', prefs: ['Silver member'], door: { kind: 'Ring and August lock through Alexa', state: 'idle' }, needPhoto: true, needSig: false, status: 'in_progress', sentAt: '12:40 PM', log: [['12:58', 'Started'], ['1:02', 'In progress · arrived']] },
  { ...base, id: 'j5', rep: REP.marcus, cat: 'ride', icon: '🚗', title: 'Ride home after a double', client: 'Anita Patel', crole: 'ER Doctor', phone: '+18455550150', phoneTxt: '(845) 555 0150', pickup: 'Hospital main entrance', drop: 'Home', window: 'Yesterday 9:30 PM', dist: '5.0 mi', vendor: null, items: [], notes: '', prefs: [], door: null, needPhoto: false, needSig: false, status: 'completed', sentAt: '9:05 PM', requestId: 'r3', log: [['9:07', 'Accepted'], ['9:12', 'Started'], ['9:31', 'In progress'], ['9:58', 'Completed']], updates: [['9:31', 'Out front in a grey Camry']] },
  { ...base, id: 'j2', rep: REP.marcus, cat: 'food', icon: '🍱', title: 'Lunch to the ED break room', client: 'Priya N.', crole: 'ED Nurse', phone: '+18455550118', phoneTxt: '(845) 555 0118', pickup: 'Green Bowl Cafe', drop: 'Hospital ED break room, 2nd floor', window: 'By 12:30 PM', dist: '1.1 mi', vendor: { name: 'Green Bowl Cafe', contact: 'Order desk', phone: '+18455550177', phoneTxt: '(845) 555 0177' }, items: ['Grain bowl, no onions', 'Iced tea, unsweetened'], notes: 'If Priya is with a patient, hand it to the charge nurse and text her.', prefs: ['Vegetarian', 'Silver member'], door: null, needPhoto: true, needSig: true, status: 'offer', sentAt: '11:50 AM' },
]
const REQUESTS = [
  { id: 'r0', memberId: id(301), member: 'Jordan Reyes', role: 'ICU Nurse', cat: 'errand', text: 'Pharmacy pickup to home, leave inside the door', createdAt: Date.now() - 3600000, status: 'dispatched', jobId: 'j1', source: 'ask' },
  { id: 'r3', memberId: id(302), member: 'Anita Patel', role: 'ER Doctor', cat: 'ride', text: 'Ride home after a double', createdAt: Date.now() - 86400000, status: 'completed', jobId: 'j5', source: 'ask' },
  { id: 'r1', memberId: id(302), member: 'Dr. Patel', role: 'ER Doctor', cat: 'ride', text: 'Ride home after a 14 hour shift, around 9 PM', createdAt: Date.now() - 600000, status: 'new', source: 'ask' },
  { id: 'r2', memberId: id(303), member: 'Kelly W.', role: 'Unit Clerk', cat: 'errand', text: 'Dry cleaning drop and return by Friday', createdAt: Date.now() - 1800000, status: 'new', source: 'ask' },
]

// "HOP knows you" defaults (the starter's PREFS0), stored per staff profile.
const PREFS = [
  { i: '☕', k: 'Coffee order', v: 'Large oat milk latte, extra shot', src: 'From 6 food requests', conf: 92 },
  { i: '🍜', k: 'Go to dinner after nights', v: 'Thai, mild, no peanuts', src: 'From your orders', conf: 88 },
  { i: '💊', k: 'Pharmacy', v: 'Main Street pharmacy, pickup after 4 PM', src: 'From errands', conf: 95 },
  { i: '🚸', k: 'Approved pickup person', v: 'David, or Ruth as backup', src: 'You told HOP', conf: 100 },
  { i: '🌙', k: 'Quiet hours', v: '8 AM to 3 PM after night shifts', src: 'From your watch and schedule', conf: 84 },
  { i: '💬', k: 'How to reach you', v: 'Text first, call only if urgent', src: 'From how you reply', conf: 80 },
]

// ── The mockup's per-department shapes (6 departments × 9 two-hour slots, 6a–10p), used to shape demo check-ins ──
const HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22]
const BASE = {
  stress: [[40, 72, 88, 81, 64, 70, 92, 78, 55], [55, 68, 74, 70, 66, 72, 80, 76, 60], [30, 52, 66, 58, 44, 40, 48, 38, 28], [34, 48, 60, 55, 50, 46, 52, 40, 30], [26, 44, 56, 50, 42, 38, 44, 34, 24], [38, 58, 62, 54, 60, 66, 58, 42, 30]],
  requests: [[20, 35, 50, 62, 40, 45, 70, 66, 42], [30, 40, 44, 48, 42, 50, 64, 70, 52], [12, 30, 38, 44, 30, 28, 34, 22, 14], [16, 28, 34, 40, 32, 30, 36, 24, 16], [10, 26, 42, 30, 26, 44, 30, 20, 12], [24, 42, 46, 40, 44, 50, 40, 30, 18]],
  missed_breaks: [[30, 50, 70, 92, 60, 50, 40, 30, 20], [40, 50, 60, 88, 70, 60, 50, 46, 40], [10, 20, 30, 48, 30, 20, 20, 10, 10], [12, 24, 30, 52, 34, 22, 18, 12, 10], [8, 16, 24, 40, 26, 18, 14, 10, 8], [20, 40, 56, 78, 50, 34, 24, 16, 10]],
}
/** Small seeded PRNG so every seed run produces the same demo history. */
function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

async function main() {
  await sql`INSERT INTO portal_facilities (id, name, city) VALUES (${FACILITY.id}, ${FACILITY.name}, ${FACILITY.city}) ON CONFLICT DO NOTHING`
  for (const u of UNITS) {
    await sql`INSERT INTO portal_units (id, facility_id, name) VALUES (${u.id}, ${FACILITY.id}, ${u.name}) ON CONFLICT DO NOTHING`
  }

  const hash = await bcrypt.hash(password, 12)
  for (const u of USERS) {
    const facilityId = u.role === 'staff' || u.role === 'facility_admin' ? FACILITY.id : null
    await sql`
      INSERT INTO portal_users (id, email, password_hash, role, first_name, last_name, phone, status, facility_id)
      VALUES (${u.id}, ${u.email}, ${hash}, ${u.role}, ${u.first}, ${u.last}, ${u.phone}, 'active', ${facilityId})
      ON CONFLICT DO NOTHING
    `
    if (u.role === 'staff') {
      await sql`
        INSERT INTO portal_staff_profiles (user_id, job_title, unit_id, prefs, points, lifetime_points)
        VALUES (${u.id}, ${u.title}, ${u.unit}, ${JSON.stringify(PREFS)}::jsonb, 4820, 4820)
        ON CONFLICT DO NOTHING
      `
    }
  }

  for (const j of JOBS) {
    await sql`INSERT INTO portal_jobs (id, rep_id, request_id, status, data) VALUES (${j.id}, ${j.rep}, ${j.requestId ?? null}, ${j.status}, ${JSON.stringify(j)}::jsonb) ON CONFLICT DO NOTHING`
  }
  for (const r of REQUESTS) {
    await sql`INSERT INTO portal_requests (id, member_id, status, job_id, data) VALUES (${r.id}, ${r.memberId}, ${r.status}, ${r.jobId ?? null}, ${JSON.stringify(r)}::jsonb) ON CONFLICT DO NOTHING`
  }

  // ── Demo staff check-ins: the Facility View is computed from these, exactly like real ones ──
  // Non-login staff (no password) per unit; each checks in on most days at a shift-change time.
  // Stress and missed breaks follow the mockup's per-department shapes, so the heat map looks familiar.
  const rnd = mulberry(20261019)
  const enrolled = { Emergency: 60, ICU: 48, Cardiology: 40, Oncology: 40, Pediatrics: 32, 'Home Health': 44, 'Wound Care': 3 }
  const crowd = []
  for (const [ui, unit] of UNITS.entries()) {
    for (let k = 1; k <= enrolled[unit.name]; k++) {
      crowd.push({ id: id(10000 + ui * 1000 + k), unit: unit.id, ui, email: `staff${ui + 1}-${k}@demo.hop`, first: 'Demo', last: `${unit.name} ${k}` })
    }
  }
  await sql`
    INSERT INTO portal_users (id, email, role, first_name, last_name, status, facility_id)
    SELECT u, e, 'staff', f, l, 'active', ${FACILITY.id}::uuid
    FROM unnest(${crowd.map((c) => c.id)}::uuid[], ${crowd.map((c) => c.email)}::text[], ${crowd.map((c) => c.first)}::text[], ${crowd.map((c) => c.last)}::text[]) AS t(u, e, f, l)
    ON CONFLICT DO NOTHING
  `
  await sql`
    INSERT INTO portal_staff_profiles (user_id, job_title, unit_id)
    SELECT u, 'Nurse', n FROM unnest(${crowd.map((c) => c.id)}::uuid[], ${crowd.map((c) => c.unit)}::uuid[]) AS t(u, n)
    ON CONFLICT DO NOTHING
  `

  const SLOTS = [7, 11, 13, 19] // shift change and lunch: when people actually open the app
  const etDay = (ms) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const nowEtHour = Number(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }))
  const ck = { user: [], unit: [], mood: [], stress: [], brk: [], day: [], at: [] }
  for (let d = 13; d >= 0; d--) {
    const day = etDay(Date.now() - d * 86400000)
    // Emergency and ICU get tougher over the last few days, so the radar shows a rising trend.
    const surge = d <= 3 ? 1 : 0
    for (const c of crowd) {
      if (rnd() > 0.8) continue
      const slot = SLOTS[Math.floor(rnd() * SLOTS.length)]
      if (d === 0 && slot > nowEtHour) continue
      const src = c.ui < 6 ? c.ui : 4
      const hi = HOURS.indexOf(slot % 2 ? slot - 1 : slot)
      const base = BASE.stress[src][hi] / 100 + (surge && c.ui < 2 ? 0.22 : 0)
      const stress = Math.max(1, Math.min(5, Math.round(1 + base * 4 + (rnd() - 0.5) * 1.6)))
      const mood = Math.max(1, Math.min(5, Math.round(6 - stress + (rnd() - 0.5) * 1.4)))
      const missed = rnd() < BASE.missed_breaks[src][hi] / 100 + (surge && c.ui < 2 ? 0.18 : 0)
      ck.user.push(c.id); ck.unit.push(c.unit); ck.mood.push(mood); ck.stress.push(stress); ck.brk.push(!missed); ck.day.push(day)
      ck.at.push(`${day}T${String(slot).padStart(2, '0')}:${String(Math.floor(rnd() * 50)).padStart(2, '0')}:00-04:00`)
    }
  }
  for (let i = 0; i < ck.user.length; i += 2000) {
    const sl = (a) => a.slice(i, i + 2000)
    await sql`
      INSERT INTO portal_checkins (user_id, unit_id, source, mood, stress, took_break, day, at)
      SELECT u, n, 'daily', m, s, b, d, a
      FROM unnest(${sl(ck.user)}::uuid[], ${sl(ck.unit)}::uuid[], ${sl(ck.mood)}::smallint[], ${sl(ck.stress)}::smallint[],
                  ${sl(ck.brk)}::boolean[], ${sl(ck.day)}::date[], ${sl(ck.at)}::timestamptz[]) AS t(u, n, m, s, b, d, a)
      ON CONFLICT DO NOTHING
    `
  }

  // A few finished requests a day from the crowd, so request volume per unit is real history.
  const hist = { id: [], member: [], data: [], at: [] }
  for (let d = 13; d >= 1; d--) {
    for (let n = 0; n < 8; n++) {
      const c = crowd[Math.floor(rnd() * crowd.length)]
      const cat = ['food', 'errand', 'ride', 'pet', 'family', 'delivery'][Math.floor(rnd() * 6)]
      const slot = SLOTS[Math.floor(rnd() * SLOTS.length)]
      const at = `${etDay(Date.now() - d * 86400000)}T${String(slot).padStart(2, '0')}:15:00-04:00`
      const rid = `rh${String(d).padStart(2, '0')}${n}`
      hist.id.push(rid); hist.member.push(c.id); hist.at.push(at)
      hist.data.push(JSON.stringify({ id: rid, memberId: c.id, member: `${c.first} ${c.last}`, role: 'Nurse', cat, text: 'Completed demo request', source: 'ask', createdAt: Date.parse(at), status: 'completed' }))
    }
  }
  await sql`
    INSERT INTO portal_requests (id, member_id, status, data, created_at, updated_at)
    SELECT i, m, 'completed', d::jsonb, a, a FROM unnest(${hist.id}::text[], ${hist.member}::uuid[], ${hist.data}::text[], ${hist.at}::timestamptz[]) AS t(i, m, d, a)
    ON CONFLICT DO NOTHING
  `

  // A finished, rated job (Marcus for Dr. Patel) and a few messages, so ratings and inboxes aren't empty.
  await sql`INSERT INTO portal_ratings (request_id, job_id, rep_id, member_id, stars, note) VALUES ('r3', 'j5', ${REP.marcus}, ${id(302)}, 5, 'Fast and friendly. Thank you!') ON CONFLICT DO NOTHING`
  const msgs = [
    ['staff', id(301), id(101), 'console', 'HOP Concierge', 'Hi Jordan, welcome to HOP Client. Message us here any time and a real person on the team will answer.'],
    ['rep', id(203), id(101), 'console', 'HOP Concierge', 'Morning Andre. You are on the north route today. Message HQ here if anything comes up.'],
  ]
  const have = (await sql`SELECT count(*)::int AS n FROM portal_messages WHERE thread_key = ANY(${[id(301), id(203)]})`)[0].n
  if (!have) {
    for (const [k, key, sender, role, name, body] of msgs) {
      await sql`INSERT INTO portal_messages (thread_kind, thread_key, sender_id, sender_role, sender_name, body) VALUES (${k}, ${key}, ${sender}, ${role}, ${name}, ${body})`
    }
  }

  console.log('Demo data ready. Every account uses DEMO_PASSWORD:')
  for (const u of USERS) console.log(`  ${u.role.padEnd(15)} ${u.email.padEnd(20)} ${u.first} ${u.last}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
