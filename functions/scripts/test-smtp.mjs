/**
 * Test Google Workspace / other SMTP locally before deploying.
 *
 *   cd functions
 *   SMTP_PASS='your-google-app-password' npm run test-smtp
 *
 * Google Workspace requires an App Password (not your normal Gmail login):
 *   https://myaccount.google.com/apppasswords
 *
 * Optional: SMTP_USER, SMTP_HOST, SMTP_PORT, NOTIFY_EMAIL (see .env.theconcierge-e94e8)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import nodemailer from 'nodemailer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env.theconcierge-e94e8')

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i === -1) continue
    const key = trimmed.slice(0, i).trim()
    const val = trimmed.slice(i + 1).trim()
    if (!(key in process.env)) process.env[key] = val
  }
}

loadDotEnv(envPath)

const user = process.env.SMTP_USER ?? 'micah@hvconcierge.com'
const pass = process.env.SMTP_PASS
const notify = process.env.NOTIFY_EMAIL ?? user
const configuredHost = process.env.SMTP_HOST ?? 'smtp.gmail.com'
const configuredPort = Number(process.env.SMTP_PORT ?? '587')

if (!pass) {
  console.error('Set SMTP_PASS to a Google App Password (16 characters), e.g.:')
  console.error("  SMTP_PASS='xxxx xxxx xxxx xxxx' npm run test-smtp")
  console.error('Create one at: https://myaccount.google.com/apppasswords')
  process.exit(1)
}

const profiles = [
  { name: 'google-starttls', host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true },
  { name: 'google-ssl', host: 'smtp.gmail.com', port: 465, secure: true },
  {
    name: 'configured',
    host: configuredHost,
    port: configuredPort,
    secure: configuredPort === 465,
    requireTLS: configuredPort === 587,
  },
]

const seen = new Set()
const unique = profiles.filter((p) => {
  const k = `${p.host}:${p.port}`
  if (seen.has(k)) return false
  seen.add(k)
  return true
})

console.log(`Testing SMTP as ${user} → ${notify}`)
console.log('(Google Workspace: use an App Password, not your normal sign-in password.)\n')

for (const profile of unique) {
  const transporter = nodemailer.createTransport({
    host: profile.host,
    port: profile.port,
    secure: profile.secure,
    requireTLS: profile.requireTLS,
    auth: { user, pass: pass.replace(/\s/g, '') },
  })

  try {
    const info = await transporter.sendMail({
      from: `"The Concierge (test)" <${user}>`,
      to: notify,
      subject: `[SMTP test] ${profile.name}`,
      text: `If you received this, use SMTP_HOST=${profile.host} and SMTP_PORT=${profile.port}`,
    })
    console.log(`✓ ${profile.name} (${profile.host}:${profile.port}) — messageId ${info.messageId}`)
    console.log('\nThen set the secret and deploy:')
    console.log('  firebase functions:secrets:set SMTP_PASS')
    console.log('  firebase deploy --only functions')
    process.exit(0)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`✗ ${profile.name} (${profile.host}:${profile.port}) — ${msg}`)
  }
}

console.error('\nAll profiles failed.')
console.error('For Google Workspace: create an App Password at https://myaccount.google.com/apppasswords')
console.error('(2-Step Verification must be on). Use that 16-character password as SMTP_PASS.')
process.exit(1)
