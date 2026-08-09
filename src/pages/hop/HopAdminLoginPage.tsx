import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useHopAuth } from '../../hop/useHopAuth'

export function HopAdminLoginPage() {
  const { login } = useHopAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const user = await login(identifier, password)
      if (user.role === 'admin') {
        navigate('/hop/admin', { replace: true })
      } else if (user.role === 'concierge') {
        navigate('/hop/concierge', { replace: true })
      } else {
        setError('This account is not a staff account.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="hop-auth-page hop-auth-page--admin">
      <form className="hop-auth-card" onSubmit={handleSubmit}>
        <Link to="/" className="hop-auth-card__brand">HOP admin</Link>
        <h1 className="hop-auth-card__title">Concierge staff sign in</h1>
        <p className="hop-auth-card__sub">Manage HOP users, requests, and integrations.</p>

        {error && <div className="hop-auth-card__error">{error}</div>}

        <label className="hop-field">
          <span>Email or HOP number</span>
          <input
            type="text"
            required
            autoComplete="username"
            placeholder="you@example.com or HOP001"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </label>

        <label className="hop-field">
          <span>Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button type="submit" className="hop-btn-primary" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="hop-auth-card__footer hop-auth-card__footer--muted">
          <Link to="/hop/forgot-password">Forgot password?</Link>
        </p>
        <p className="hop-auth-card__footer hop-auth-card__footer--muted">
          <Link to="/hop/login">User sign in</Link>
        </p>
      </form>
    </div>
  )
}
