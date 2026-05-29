import nodemailer from 'nodemailer'
import type { SendMailOptions } from 'nodemailer'
import { logger } from 'firebase-functions/v2'

export type SmtpProfile = {
  name: string
  host: string
  port: number
  secure: boolean
  requireTLS?: boolean
}

/** Google Workspace first, then configured host, then legacy GoDaddy/M365 fallbacks. */
export function smtpProfilesFor(host: string, port: number): SmtpProfile[] {
  const primary: SmtpProfile = {
    name: 'configured',
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
  }

  const candidates: SmtpProfile[] = [
    {
      name: 'google-starttls',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
    },
    {
      name: 'google-ssl',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
    },
    primary,
    {
      name: 'godaddy-starttls',
      host: 'smtpout.secureserver.net',
      port: 587,
      secure: false,
      requireTLS: true,
    },
    {
      name: 'microsoft365',
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      requireTLS: true,
    },
  ]

  const seen = new Set<string>()
  return candidates.filter((p) => {
    const key = `${p.host}:${p.port}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function isAuthFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /535|534|454|421|authentication failed|invalid login|5\.7\./i.test(msg)
}

/** Google App Passwords are often copied with spaces — strip them for SMTP auth. */
export function normalizeSmtpPass(pass: string): string {
  return pass.replace(/\s/g, '')
}

export async function sendMailWithSmtpFallback(options: {
  user: string
  pass: string
  host: string
  port: number
  mail: SendMailOptions
}): Promise<string> {
  const profiles = smtpProfilesFor(options.host, options.port)
  let lastError: unknown

  for (const profile of profiles) {
    const transporter = nodemailer.createTransport({
      host: profile.host,
      port: profile.port,
      secure: profile.secure,
      requireTLS: profile.requireTLS,
      auth: {
        user: options.user,
        pass: normalizeSmtpPass(options.pass),
      },
    })

    try {
      await transporter.sendMail(options.mail)
      logger.info('SMTP send succeeded', {
        profile: profile.name,
        host: profile.host,
        port: profile.port,
      })
      return profile.name
    } catch (err) {
      lastError = err
      const message = err instanceof Error ? err.message : String(err)
      logger.warn('SMTP send attempt failed', {
        profile: profile.name,
        host: profile.host,
        port: profile.port,
        error: message,
      })
      if (!isAuthFailure(err)) {
        throw err
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
