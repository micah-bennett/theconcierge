import { createHmac, randomBytes } from 'node:crypto'
import { parseCookie as parseCookieHeader, stringifySetCookie } from 'cookie'
import bcrypt from 'bcryptjs'
import type { NeonQueryFunction } from '@neondatabase/serverless'

export type HopUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'user' | 'admin'
  status: 'active' | 'disabled'
}

const SESSION_COOKIE = 'hop_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const MAX_FAILED_ATTEMPTS = 8
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000 // 30 minutes

type Sql = NeonQueryFunction<false, false>

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

function sessionPepper(): string {
  const secret = process.env.SESSION_HASH_SECRET?.trim()
  if (!secret) throw new Error('SESSION_HASH_SECRET is not configured')
  return secret
}

function hashToken(token: string): string {
  return createHmac('sha256', sessionPepper()).update(token).digest('hex')
}

function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === 'https:'
}

export function setSessionCookie(request: Request, token: string): string {
  return stringifySetCookie({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
}

export function clearSessionCookie(request: Request): string {
  return stringifySetCookie({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

function readSessionToken(request: Request): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  const cookies = parseCookieHeader(header)
  return cookies[SESSION_COOKIE] || null
}

const OAUTH_STATE_COOKIE = 'hop_oauth_state'

export function setOAuthStateCookie(request: Request, state: string): string {
  return stringifySetCookie({
    name: OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
}

export function readOAuthStateCookie(request: Request): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  return parseCookieHeader(header)[OAUTH_STATE_COOKIE] || null
}

export function clearOAuthStateCookie(request: Request): string {
  return stringifySetCookie({
    name: OAUTH_STATE_COOKIE,
    value: '',
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export async function createSession(sql: Sql, userId: string, request: Request): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  const userAgent = (request.headers.get('user-agent') || '').slice(0, 300)
  await sql`
    INSERT INTO hop_sessions (user_id, token_hash, user_agent, expires_at)
    VALUES (${userId}, ${hashToken(token)}, ${userAgent}, ${expiresAt})
  `
  return token
}

export async function destroySession(sql: Sql, request: Request): Promise<void> {
  const token = readSessionToken(request)
  if (!token) return
  await sql`DELETE FROM hop_sessions WHERE token_hash = ${hashToken(token)}`
}

export async function destroyAllSessions(sql: Sql, userId: string): Promise<void> {
  await sql`DELETE FROM hop_sessions WHERE user_id = ${userId}`
}

export async function createPasswordResetToken(sql: Sql, userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString()
  await sql`
    INSERT INTO hop_password_resets (user_id, token_hash, expires_at)
    VALUES (${userId}, ${hashToken(token)}, ${expiresAt})
  `
  return token
}

export async function consumePasswordResetToken(sql: Sql, rawToken: string): Promise<string | null> {
  const rows = await sql`
    SELECT id, user_id FROM hop_password_resets
    WHERE token_hash = ${hashToken(rawToken)} AND expires_at > NOW() AND used_at IS NULL
  `
  const row = rows[0] as { id: string; user_id: string } | undefined
  if (!row) return null

  await sql`UPDATE hop_password_resets SET used_at = NOW() WHERE id = ${row.id}`
  return row.user_id
}

export async function getSessionUser(sql: Sql, request: Request): Promise<HopUser | null> {
  const token = readSessionToken(request)
  if (!token) return null

  const rows = await sql`
    SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.status
    FROM hop_sessions s
    JOIN hop_users u ON u.id = s.user_id
    WHERE s.token_hash = ${hashToken(token)} AND s.expires_at > NOW()
  `
  const row = rows[0] as
    | { id: string; email: string; first_name: string; last_name: string; role: string; status: string }
    | undefined
  if (!row || row.status !== 'active') return null

  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role as 'user' | 'admin',
    status: row.status as 'active' | 'disabled',
  }
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export function jsonWithCookie(body: unknown, status: number, cookie: string): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'Set-Cookie': cookie },
  })
}

export function unauthorized(): Response {
  return json({ error: 'Not signed in' }, 401)
}

export function forbidden(): Response {
  return json({ error: 'Not allowed' }, 403)
}

export async function requireUser(sql: Sql, request: Request): Promise<HopUser | Response> {
  const user = await getSessionUser(sql, request)
  if (!user) return unauthorized()
  return user
}

export async function requireAdmin(sql: Sql, request: Request): Promise<HopUser | Response> {
  const user = await getSessionUser(sql, request)
  if (!user) return unauthorized()
  if (user.role !== 'admin') return forbidden()
  return user
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response
}

type LoginCheckRow = {
  id: string
  password_hash: string
  role: string
  status: string
  failed_login_attempts: number
  locked_until: string | null
}

export function checkLoginLock(row: LoginCheckRow): string | null {
  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    return 'Too many failed attempts. Try again in a few minutes.'
  }
  return null
}

export async function recordFailedLogin(sql: Sql, userId: string, attempts: number): Promise<void> {
  const nextAttempts = attempts + 1
  const lockedUntil =
    nextAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS).toISOString() : null
  await sql`
    UPDATE hop_users
    SET failed_login_attempts = ${nextAttempts}, locked_until = ${lockedUntil}, updated_at = NOW()
    WHERE id = ${userId}
  `
}

export async function resetFailedLogins(sql: Sql, userId: string): Promise<void> {
  await sql`
    UPDATE hop_users
    SET failed_login_attempts = 0, locked_until = NULL, updated_at = NOW()
    WHERE id = ${userId}
  `
}

export function toPublicUser(row: {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
}): HopUser {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role as 'user' | 'admin',
    status: 'active',
  }
}
