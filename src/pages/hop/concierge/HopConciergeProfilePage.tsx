import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { hopConciergeGetProfile, hopConciergeUpdateProfile } from '../../../hop/api'
import { useHopAuth } from '../../../hop/useHopAuth'

export function HopConciergeProfilePage() {
  const { user } = useHopAuth()
  const [loading, setLoading] = useState(true)
  const [headline, setHeadline] = useState('')
  const [bio, setBio] = useState('')
  const [specialtiesText, setSpecialtiesText] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    hopConciergeGetProfile()
      .then((result) => {
        setHeadline(result.profile.headline)
        setBio(result.profile.bio)
        setSpecialtiesText(result.profile.specialties.join(', '))
        setYearsExperience(result.profile.years_experience?.toString() ?? '')
        setPhotoUrl(result.profile.photo_url ?? '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaved(false)
    setSaving(true)
    try {
      await hopConciergeUpdateProfile({
        headline,
        bio,
        specialties: specialtiesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        years_experience: yearsExperience.trim() ? Number(yearsExperience) : null,
        photo_url: photoUrl.trim() || null,
      })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="hop-page-body hop-app-loading">Loading…</div>

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Your profile</h1>
      <p className="hop-page-sub">Showcase your work — this is what admins and members see about you.</p>

      <section className="hop-card">
        <form className="hop-form-stack" onSubmit={handleSubmit}>
          {error && (
            <div className="hop-auth-card__error" role="alert">
              {error}
            </div>
          )}
          {saved && (
            <div className="hop-banner hop-banner--success" role="status">
              Your profile has been saved.
            </div>
          )}

          <label className="hop-field">
            <span>Name</span>
            <input type="text" value={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} readOnly disabled />
          </label>

          <label className="hop-field">
            <span>Headline</span>
            <input
              type="text"
              maxLength={140}
              placeholder="e.g. Ride, errand, and family-care specialist"
              value={headline}
              onChange={(e) => {
                setHeadline(e.target.value)
                setSaved(false)
              }}
            />
          </label>

          <label className="hop-field">
            <span>Bio</span>
            <textarea
              rows={5}
              maxLength={2000}
              placeholder="Tell members and admins a bit about your background and how you like to help."
              value={bio}
              onChange={(e) => {
                setBio(e.target.value)
                setSaved(false)
              }}
            />
          </label>

          <label className="hop-field">
            <span>Specialties (comma-separated)</span>
            <input
              type="text"
              placeholder="Rides & transportation, Family & childcare logistics, Errands"
              value={specialtiesText}
              onChange={(e) => {
                setSpecialtiesText(e.target.value)
                setSaved(false)
              }}
            />
          </label>

          <div className="hop-field-row">
            <label className="hop-field">
              <span>Years of experience</span>
              <input
                type="number"
                min={0}
                max={80}
                value={yearsExperience}
                onChange={(e) => {
                  setYearsExperience(e.target.value)
                  setSaved(false)
                }}
              />
            </label>
            <label className="hop-field">
              <span>Photo URL</span>
              <input
                type="url"
                placeholder="https://…"
                value={photoUrl}
                onChange={(e) => {
                  setPhotoUrl(e.target.value)
                  setSaved(false)
                }}
              />
            </label>
          </div>
          <p className="hop-muted">
            Paste a link to a photo for now — direct photo upload isn't available yet.
          </p>

          <button type="submit" className="hop-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </section>

      {photoUrl && (
        <section className="hop-card">
          <h2>Preview</h2>
          <img
            src={photoUrl}
            alt=""
            style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', marginBottom: '0.75rem' }}
          />
          <p style={{ fontWeight: 600 }}>{headline || 'No headline yet'}</p>
          <p className="hop-muted">{bio || 'No bio yet'}</p>
        </section>
      )}
    </div>
  )
}
