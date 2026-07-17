import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { hopResetPassword } from '../../hop/api'

export function HopResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      await hopResetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset your password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="hop-auth-page">
      <div className="hop-auth-card">
        <Link to="/" className="hop-auth-card__brand">HOP</Link>
        <h1 className="hop-auth-card__title">Set a new password</h1>

        {!token ? (
          <p className="hop-auth-card__error">
            This reset link is missing its token. Request a new one from the sign-in page.
          </p>
        ) : done ? (
          <>
            <p className="hop-auth-card__sub">
              Your password has been updated. You&apos;ve been signed out everywhere — sign in again with your
              new password.
            </p>
            <p className="hop-auth-card__footer">
              <Link to="/hop/login">Go to sign in</Link>
            </p>
          </>
        ) : (
          <form className="hop-form-stack" onSubmit={handleSubmit}>
            <p className="hop-auth-card__sub">Choose a new password for your account.</p>

            {error && <div className="hop-auth-card__error">{error}</div>}

            <label className="hop-field">
              <span>New password</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <label className="hop-field">
              <span>Confirm password</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>

            <button type="submit" className="hop-btn-primary" disabled={submitting}>
              {submitting ? 'Resetting…' : 'Reset password'}
            </button>

            <p className="hop-auth-card__footer hop-auth-card__footer--muted">
              <Link to="/hop/login">Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
