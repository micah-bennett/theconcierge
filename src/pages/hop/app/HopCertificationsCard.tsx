import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  hopAddCertification,
  hopDeleteCertification,
  hopListCertifications,
  type HopCertification,
} from '../../../hop/api'
import { useToast } from '../../../hop/useToast'
import { EmptyState } from '../../../hop/EmptyState'

const EXPIRY_WARNING_DAYS = 30

function expiryStatus(expiresAt: string | null): 'none' | 'expired' | 'soon' | 'ok' {
  if (!expiresAt) return 'none'
  const daysLeft = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (daysLeft < 0) return 'expired'
  if (daysLeft <= EXPIRY_WARNING_DAYS) return 'soon'
  return 'ok'
}

// See docs/hop/architecture.md, "Certifications + renewal reminders" — the in-app expiry nag on
// the dashboard reads this same data via hopListCertifications(), see HopDashboardPage.tsx.
export function HopCertificationsCard() {
  const toast = useToast()
  const [certifications, setCertifications] = useState<HopCertification[] | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [issuingBody, setIssuingBody] = useState('')
  const [issuedAt, setIssuedAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(load, [])

  function load() {
    hopListCertifications()
      .then((result) => setCertifications(result.certifications))
      .catch(() => setCertifications([]))
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setAdding(true)
    try {
      await hopAddCertification({
        name,
        issuingBody,
        issuedAt: issuedAt || null,
        expiresAt: expiresAt || null,
      })
      setName('')
      setIssuingBody('')
      setIssuedAt('')
      setExpiresAt('')
      setShowForm(false)
      load()
      toast.success('Certification added.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add certification')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: string) {
    await hopDeleteCertification(id)
    load()
  }

  const loading = certifications === null

  return (
    <section className="hop-card">
      <h2>📜 Certifications</h2>
      <p className="hop-muted">
        Track your certifications here — if one is close to expiring, you'll see a reminder on
        your dashboard until it's renewed.
      </p>

      {loading && <div className="hop-skeleton-bar" />}
      {!loading && certifications.length === 0 && !showForm && (
        <EmptyState icon="📜" message="No certifications added yet." />
      )}
      {!loading && certifications.length > 0 && (
        <ul className="hop-history-list">
          {certifications.map((cert) => {
            const status = expiryStatus(cert.expires_at)
            return (
              <li key={cert.id} className="hop-history-list__item">
                <span className="hop-history-list__type">
                  {cert.name}
                  {cert.issuing_body ? ` — ${cert.issuing_body}` : ''}
                </span>
                {cert.expires_at && (
                  <span
                    className={
                      status === 'expired' || status === 'soon' ? 'hop-status hop-status--error' : 'hop-muted'
                    }
                  >
                    {status === 'expired' ? 'Expired ' : 'Expires '}
                    {cert.expires_at}
                  </span>
                )}
                <button
                  type="button"
                  className="hop-btn-ghost"
                  onClick={() => handleDelete(cert.id)}
                  aria-label={`Remove ${cert.name}`}
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {showForm ? (
        <form className="hop-form-stack" onSubmit={handleAdd}>
          {error && (
            <div className="hop-auth-card__error" role="alert">
              {error}
            </div>
          )}
          <div className="hop-field-row">
            <label className="hop-field">
              <span>Certification name</span>
              <input type="text" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="hop-field">
              <span>Issuing body (optional)</span>
              <input
                type="text"
                maxLength={120}
                value={issuingBody}
                onChange={(e) => setIssuingBody(e.target.value)}
              />
            </label>
          </div>
          <div className="hop-field-row">
            <label className="hop-field">
              <span>Issued (optional)</span>
              <input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
            </label>
            <label className="hop-field">
              <span>Expires (optional)</span>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </label>
          </div>
          <div className="hop-field-row">
            <button type="submit" className="hop-btn-primary" disabled={adding}>
              {adding ? 'Adding…' : 'Add certification'}
            </button>
            <button type="button" className="hop-btn-ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="hop-btn-secondary" onClick={() => setShowForm(true)}>
          ➕ Add certification
        </button>
      )}
    </section>
  )
}
