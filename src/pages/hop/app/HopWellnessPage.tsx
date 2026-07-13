import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  hopCreateWellnessCheckIn,
  hopListWellnessCheckIns,
  type HopWellnessCheckIn,
} from '../../../hop/api'

const FEELING_OPTIONS = [
  { value: 'doing_well', label: 'Doing well' },
  { value: 'stretched_thin', label: 'Stretched thin' },
  { value: 'low_energy', label: 'Low energy' },
  { value: 'overwhelmed', label: 'Overwhelmed' },
] as const

const SUPPORT_OPTIONS = [
  { value: 'meal', label: 'Meal support' },
  { value: 'ride', label: 'Ride or commute support' },
  { value: 'errands', label: 'Errands' },
  { value: 'wellness_appt', label: 'Wellness appointment' },
  { value: 'time_back_home', label: 'Time back at home' },
  { value: 'talk_to_concierge', label: 'Talk to a concierge' },
] as const

const SHIFT_PROTECTION_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'not_applicable', label: 'Not applicable' },
] as const

// Maps each "what would help most" answer to the closest existing service_type + a details
// prefix (see CATEGORY_LABEL in HopRequestsPage.tsx) — no new service_type is created.
const SUPPORT_TO_REQUEST: Record<string, { type: string; category: string }> = {
  meal: { type: 'meal', category: 'wellness_meal' },
  ride: { type: 'ride', category: 'wellness_ride' },
  errands: { type: 'errand', category: 'wellness_errands' },
  wellness_appt: { type: 'wellness', category: 'wellness_appt' },
  time_back_home: { type: 'family_home', category: 'wellness_time_back_home' },
  talk_to_concierge: { type: 'other', category: 'wellness_talk' },
}

const FEELING_LABEL: Record<string, string> = Object.fromEntries(FEELING_OPTIONS.map((o) => [o.value, o.label]))
const SUPPORT_LABEL: Record<string, string> = Object.fromEntries(SUPPORT_OPTIONS.map((o) => [o.value, o.label]))

export function HopWellnessPage() {
  const [feeling, setFeeling] = useState('')
  const [desiredSupport, setDesiredSupport] = useState('')
  const [note, setNote] = useState('')
  const [shiftProtection, setShiftProtection] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<HopWellnessCheckIn | null>(null)

  const [checkIns, setCheckIns] = useState<HopWellnessCheckIn[]>([])
  const [loadingCheckIns, setLoadingCheckIns] = useState(true)

  function loadCheckIns() {
    setLoadingCheckIns(true)
    hopListWellnessCheckIns()
      .then((result) => setCheckIns(result.checkIns))
      .catch(() => setCheckIns([]))
      .finally(() => setLoadingCheckIns(false))
  }

  useEffect(loadCheckIns, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!feeling) {
      setError("Let us know how you're feeling today")
      return
    }
    if (!desiredSupport) {
      setError('Let us know what would help most')
      return
    }

    setSubmitting(true)
    try {
      const { checkIn } = await hopCreateWellnessCheckIn({
        feeling,
        desiredSupport,
        note,
        shiftProtection: shiftProtection || null,
      })
      setSubmitted(checkIn)
      setFeeling('')
      setDesiredSupport('')
      setNote('')
      setShiftProtection('')
      loadCheckIns()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your check-in')
    } finally {
      setSubmitting(false)
    }
  }

  const requestLink = submitted ? SUPPORT_TO_REQUEST[submitted.desired_support] : null

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Wellness</h1>
      <p className="hop-page-sub">A little support can make a demanding week more manageable.</p>

      {submitted ? (
        <section className="hop-card">
          <h2>Thanks for checking in</h2>
          <p className="hop-muted">
            That takes a moment of honesty, and it matters. A concierge reviews check-ins and
            follows up if there's a good way to help.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {requestLink && (
              <Link
                className="hop-btn-primary"
                to={`/hop/app/requests?type=${requestLink.type}&category=${requestLink.category}`}
              >
                Request support now
              </Link>
            )}
            <button type="button" className="hop-btn-secondary" onClick={() => setSubmitted(null)}>
              Check in again
            </button>
          </div>
        </section>
      ) : (
        <form className="hop-card" onSubmit={handleSubmit}>
          <h2>Create a check-in</h2>
          {error && (
            <div className="hop-auth-card__error" role="alert">
              {error}
            </div>
          )}

          <label className="hop-field">
            <span>How are you feeling today?</span>
            <select value={feeling} onChange={(e) => setFeeling(e.target.value)}>
              <option value="" disabled>
                Choose one
              </option>
              {FEELING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="hop-field">
            <span>What would help most?</span>
            <select value={desiredSupport} onChange={(e) => setDesiredSupport(e.target.value)}>
              <option value="" disabled>
                Choose one
              </option>
              {SUPPORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="hop-field">
            <span>Anything you'd like to add? (optional)</span>
            <textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>

          <label className="hop-field">
            <span>Would support today help you protect a work shift? (optional)</span>
            <select value={shiftProtection} onChange={(e) => setShiftProtection(e.target.value)}>
              <option value="">Prefer not to say</option>
              {SHIFT_PROTECTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="hop-btn-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit check-in'}
          </button>
        </form>
      )}

      <section className="hop-card">
        <p className="hop-muted">
          Your check-in is private and used to help HOP coordinate support. It is not a medical
          assessment or employment-performance record.
        </p>
        <div className="hop-banner hop-banner--error" role="alert">
          If you're in immediate danger or experiencing a medical emergency, call 911 (or your
          local emergency number) right away.
        </div>
      </section>

      <section className="hop-card">
        <h2>Your recent check-ins</h2>
        {loadingCheckIns && <p className="hop-muted">Loading…</p>}
        {!loadingCheckIns && checkIns.length === 0 && <p className="hop-muted">No check-ins yet.</p>}
        {!loadingCheckIns && checkIns.length > 0 && (
          <ul className="hop-event-list">
            {checkIns.map((checkIn) => (
              <li key={checkIn.id}>
                <span className="hop-event-list__title">
                  {FEELING_LABEL[checkIn.feeling] || checkIn.feeling} —{' '}
                  {SUPPORT_LABEL[checkIn.desired_support] || checkIn.desired_support}
                </span>
                <span className="hop-event-list__time">{new Date(checkIn.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
