import { useState, type FormEvent } from 'react'
import { submitReliefCall } from '../../api/submitReliefCall'
import { OFFICE_PHONE_DISPLAY, OFFICE_PHONE_TEL } from '../../site'

const FEATURES = [
  'Free 15-minute discovery call',
  'Volume pricing & SLA agreements',
  'Integration with the HOP staff app',
  'HIPAA-aware documented hand-offs',
  'Dedicated account liaison',
] as const

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function ReliefCallSidebar() {
  const [name, setName] = useState('')
  const [titleFacility, setTitleFacility] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) return setError('Please enter your name.')
    if (!isValidEmail(email)) return setError('Please enter a valid email.')
    if (phone.replace(/\D/g, '').length < 10) return setError('Please enter a valid phone number.')

    setSubmitting(true)
    try {
      await submitReliefCall({
        name: name.trim(),
        titleFacility: titleFacility.trim(),
        email: email.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again or call us.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <aside className="mkt-relief-sidebar" id="relief" aria-labelledby="relief-heading">
      <div className="mkt-relief-card">
        <span className="mkt-relief-badge">For Hospitals &amp; Facilities</span>
        <h3 className="mkt-relief-title" id="relief-heading">
          Book a Relief Call
        </h3>
        <p className="mkt-relief-desc">
          Partner with The Concierge to support your staff and patients at scale — starting with a short
          discovery call.
        </p>
        <ul className="mkt-relief-features">
          {FEATURES.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>

        {success ? (
          <div className="mkt-request__success">
            <h3>You&apos;re on the calendar!</h3>
            <p>We&apos;ll reach out within 24 hours to schedule your relief call.</p>
          </div>
        ) : (
          <form className="mkt-form" onSubmit={handleSubmit}>
            <label className="mkt-field" htmlFor="rel-name">
              <span>Your name</span>
              <input id="rel-name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </label>
            <label className="mkt-field" htmlFor="rel-title">
              <span>Title &amp; facility</span>
              <input
                id="rel-title"
                value={titleFacility}
                onChange={(e) => setTitleFacility(e.target.value)}
                placeholder="e.g. Director of Nursing, Vassar Brothers"
              />
            </label>
            <label className="mkt-field" htmlFor="rel-email">
              <span>Email</span>
              <input id="rel-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </label>
            <label className="mkt-field" htmlFor="rel-phone">
              <span>Phone</span>
              <input id="rel-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" />
            </label>
            <label className="mkt-field" htmlFor="rel-notes">
              <span>What are you looking to solve?</span>
              <textarea id="rel-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>

            {error ? <p className="mkt-form-error">{error}</p> : null}

            <button type="submit" className="mkt-btn mkt-btn-primary mkt-btn-full" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Book My Relief Call'}
            </button>
          </form>
        )}

        <div className="mkt-relief-contact">
          <div className="mkt-relief-contact__item">
            <span aria-hidden="true">📞</span>
            <a href={`tel:${OFFICE_PHONE_TEL}`}>{OFFICE_PHONE_DISPLAY}</a>
          </div>
          <div className="mkt-relief-contact__item">
            <span aria-hidden="true">✉️</span>
            <span>micah@hvconcierge.com</span>
          </div>
          <div className="mkt-relief-contact__item">
            <span aria-hidden="true">🕑</span>
            <span>6 AM – 10 PM · 7 days</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
