import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useHopAuth } from '../../hop/useHopAuth'

export function HopSignupPage() {
  const { signup } = useHopAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signup({ firstName, lastName, email, password })
      navigate('/hop/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="hop-auth-page">
      <form className="hop-auth-card" onSubmit={handleSubmit}>
        <Link to="/hop" className="hop-auth-card__brand">HOP</Link>
        <h1 className="hop-auth-card__title">Create your HOP account</h1>
        <p className="hop-auth-card__sub">One request handles the ride, meal, errand, or anything else.</p>

        {error && <div className="hop-auth-card__error">{error}</div>}

        <div className="hop-field-row">
          <label className="hop-field">
            <span>First name</span>
            <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </label>
          <label className="hop-field">
            <span>Last name</span>
            <input required value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
        </div>

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

        <label className="hop-field">
          <span>Password</span>
          <input
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="hop-field__hint">At least 10 characters.</span>
        </label>

        <button type="submit" className="hop-btn-primary" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="hop-auth-card__footer">
          Already have an account? <Link to="/hop/login">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
