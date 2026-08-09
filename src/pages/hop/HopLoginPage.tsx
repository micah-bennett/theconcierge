import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useHopAuth } from '../../hop/useHopAuth'

export function HopLoginPage() {
  const { login, user, loading } = useHopAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (loading || !user) return
    navigate(user.role === 'admin' ? '/hop/admin' : '/hop/app', { replace: true })
  }, [loading, user, navigate])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const user = await login(identifier, password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(user.role === 'admin' ? '/hop/admin' : from || '/hop/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="hop-auth-page">
      <form className="hop-auth-card" onSubmit={handleSubmit}>
        <Link to="/" className="hop-auth-card__brand">HOP</Link>
        <h1 className="hop-auth-card__title">Welcome back</h1>
        <p className="hop-auth-card__sub">Sign in to manage your requests and integrations.</p>

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

        <p className="hop-auth-card__footer">
          New to HOP? <Link to="/hop/signup">Create an account</Link>
        </p>
        <p className="hop-auth-card__footer hop-auth-card__footer--muted">
          <Link to="/hop/forgot-password">Forgot password?</Link>
        </p>
        <p className="hop-auth-card__footer hop-auth-card__footer--muted">
          <Link to="/hop/admin/login">Admin sign in</Link>
        </p>
      </form>
    </div>
  )
}
