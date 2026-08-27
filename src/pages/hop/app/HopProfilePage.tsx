import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useHopAuth } from '../../../hop/useHopAuth'
import { useHopTheme } from '../../../hop/useHopTheme'
import { useToast } from '../../../hop/useToast'
import { HopServiceHistoryCard } from './HopServiceHistoryCard'
import { HopRewardsCard } from './HopRewardsCard'
import { HopSpecialDatesCard } from './HopSpecialDatesCard'
import { HopCertificationsCard } from './HopCertificationsCard'

export function HopProfilePage() {
  const { user, updateProfile } = useHopAuth()
  const { theme, toggleTheme } = useHopTheme()
  const toast = useToast()

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await updateProfile({ firstName, lastName, phone })
      toast.success('Your changes have been saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Profile</h1>

      <section className="hop-card">
        <h2>🪪 Account</h2>
        <form className="hop-form-stack" onSubmit={handleSubmit}>
          {error && (
            <div className="hop-auth-card__error" role="alert">
              {error}
            </div>
          )}

          <div className="hop-field-row">
            <label className="hop-field">
              <span>First name</span>
              <input
                type="text"
                required
                maxLength={80}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </label>
            <label className="hop-field">
              <span>Last name</span>
              <input
                type="text"
                required
                maxLength={80}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </label>
          </div>

          <div className="hop-field-row">
            <label className="hop-field">
              <span>Email</span>
              <input type="email" value={user?.email ?? ''} readOnly disabled />
            </label>
            <label className="hop-field">
              <span>HOP number</span>
              <input type="text" value={user?.hopNumber ?? ''} readOnly disabled />
            </label>
          </div>
          <p className="hop-muted">
            Your HOP number is a permanent ID for your account — you can use it instead of your
            email to sign in.
          </p>

          <div className="hop-field-row">
            <label className="hop-field">
              <span>Phone</span>
              <input
                type="tel"
                placeholder="(555) 555-5555"
                maxLength={30}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
          </div>
          <p className="hop-muted">
            Your phone number lets your concierge reach you directly and is only shared with HOP
            staff assigned to your requests.
          </p>

          <button type="submit" className="hop-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </section>

      <section className="hop-card">
        <h2>🎨 Appearance</h2>
        <p className="hop-muted">Choose how HOP looks on this device. This only affects HOP, not the main site.</p>
        <button
          type="button"
          className="hop-btn-secondary"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☀️ Switch to light mode' : '🌙 Switch to dark mode'}
        </button>
      </section>

      <section className="hop-card">
        <h2>🔒 Security</h2>
        <p className="hop-muted">
          To change your password, request a reset link by email and follow the instructions
          there. This keeps password changes verified, even if you're already signed in.
        </p>
        <Link to="/hop/forgot-password" className="hop-btn-secondary">
          Change password
        </Link>
      </section>

      <section className="hop-card">
        <h2>🔗 Connected services</h2>
        <p className="hop-muted">Manage your calendar and other connected accounts.</p>
        <Link to="/hop/app/integrations" className="hop-btn-secondary">
          Manage integrations
        </Link>
      </section>

      <HopSpecialDatesCard />
      <HopCertificationsCard />
      <HopServiceHistoryCard />
      <HopRewardsCard />
    </div>
  )
}
