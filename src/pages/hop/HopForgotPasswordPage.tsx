import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { hopForgotPassword } from '../../hop/api'

export function HopForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await hopForgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process that request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="hop-auth-page">
      <div className="hop-auth-card">
        <Link to="/" className="hop-auth-card__brand">HOP</Link>
        <h1 className="hop-auth-card__title">Reset your password</h1>

        {sent ? (
          <>
            <p className="hop-auth-card__sub">
              If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset your password.
              Check your inbox — the link expires in 30 minutes.
            </p>
            <p className="hop-auth-card__footer">
              <Link to="/hop/login">Back to sign in</Link>
            </p>
          </>
        ) : (
          <form className="hop-form-stack" onSubmit={handleSubmit}>
            <p className="hop-auth-card__sub">Enter your email and we&apos;ll send you a reset link.</p>

            {error && <div className="hop-auth-card__error">{error}</div>}

            <label className="hop-field">
              <span>Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <button type="submit" className="hop-btn-primary" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
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
