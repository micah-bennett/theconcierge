#!/usr/bin/env node
// Creates the first Concierge Console account (every later account is invited from the
// Console's Team screen). Run from the repo root after `npm run db:migrate`:
//
//   DATABASE_URL=... npm run hop:create-console-admin -- --email you@example.com --first Micah --last Bennett
//
// It asks for the password (hidden) unless HOP_ADMIN_PASSWORD is set. Refuses if the email exists.
import { createInterface } from 'node:readline'
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

function arg(name) {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : undefined
}

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (hidden) {
      rl._writeToOutput = (s) => rl.output.write(s.includes(question) ? s : '*')
    }
    rl.question(question, (answer) => {
      rl.close()
      if (hidden) process.stdout.write('\n')
      resolve(answer.trim())
    })
  })
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('Set DATABASE_URL first (Neon → your project → Connection string).')
  process.exit(1)
}

const email = (arg('email') || (await ask('Email: '))).toLowerCase()
const first = arg('first') || (await ask('First name: '))
const last = arg('last') || (await ask('Last name: '))
const password = process.env.HOP_ADMIN_PASSWORD || (await ask('Password (10+ characters): ', { hidden: true }))

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !first || !last) {
  console.error('Email, first name, and last name are all required.')
  process.exit(1)
}
if (password.length < 10) {
  console.error('Password must be at least 10 characters.')
  process.exit(1)
}

const sql = neon(url)
const exists = await sql`SELECT 1 FROM portal_users WHERE lower(email) = ${email}`
if (exists.length) {
  console.error(`An account for ${email} already exists. Nothing changed.`)
  process.exit(1)
}

const hash = await bcrypt.hash(password, 12)
await sql`
  INSERT INTO portal_users (email, password_hash, role, first_name, last_name, status)
  VALUES (${email}, ${hash}, 'console', ${first}, ${last}, 'active')
`
console.log(`Console account created for ${first} ${last} <${email}>. Sign in at the Concierge Console's /login.`)
