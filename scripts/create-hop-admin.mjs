#!/usr/bin/env node
// One-off tool to create a HOP admin account. There is no self-serve admin signup —
// see docs/hop/architecture.md. Requires DATABASE_URL in the environment.
import { createInterface } from 'node:readline/promises'
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Set DATABASE_URL in your environment first, e.g.:')
  console.error('  DATABASE_URL="$(grep DATABASE_URL .env.local | cut -d= -f2-)" node scripts/create-hop-admin.mjs')
  process.exit(1)
}

const rl = createInterface({ input: process.stdin, output: process.stdout })

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

try {
  const email = (await rl.question('Admin email: ')).trim().toLowerCase()
  if (!isValidEmail(email)) throw new Error('That does not look like a valid email address')

  const firstName = (await rl.question('First name: ')).trim()
  const lastName = (await rl.question('Last name: ')).trim()
  if (!firstName || !lastName) throw new Error('First and last name are required')

  const password = await rl.question('Password (min 10 characters, visible while typing): ')
  if (password.length < 10) throw new Error('Password must be at least 10 characters')

  const sql = neon(databaseUrl)
  const existing = await sql`SELECT id FROM hop_users WHERE LOWER(email) = ${email}`
  if (existing.length > 0) throw new Error(`An account with ${email} already exists`)

  const passwordHash = await bcrypt.hash(password, 12)
  const rows = await sql`
    INSERT INTO hop_users (email, password_hash, first_name, last_name, role)
    VALUES (${email}, ${passwordHash}, ${firstName}, ${lastName}, 'admin')
    RETURNING id
  `
  console.log(`Created HOP admin ${email} (id: ${rows[0].id})`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  rl.close()
}
