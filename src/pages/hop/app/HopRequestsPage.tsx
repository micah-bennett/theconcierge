import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { hopCreateRequest, hopGetRideLocation, hopListRequests, type HopServiceRequest } from '../../../hop/api'

const SERVICE_TYPES = [
  { value: 'ride', label: 'Ride' },
  { value: 'meal', label: 'Meal' },
  { value: 'errand', label: 'Errand' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'family_home', label: 'Family & home' },
  { value: 'other', label: 'Something else' },
] as const

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  received: 'Received',
  assigned: 'Assigned',
  in_progress: 'In progress',
  en_route: 'En route',
  arrived: 'Arrived',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

// Shown instead of raw staff dispatch notes, which may contain internal operational detail not
// meant for members — see "Dispatch workflow" in docs/hop/architecture.md.
const MEMBER_STATUS_MESSAGE: Record<string, string> = {
  submitted: 'Your request has been submitted. A concierge will review it shortly.',
  received: 'Your request has been received and is being reviewed.',
  assigned: 'A concierge has been assigned to your request.',
  in_progress: 'Your concierge is working on your request.',
  en_route: 'Your ride is on the way.',
  arrived: 'Your ride has arrived.',
  completed: 'This request has been completed.',
  cancelled: 'This request was cancelled.',
}

// Family Care and Wellness send an optional category here — several service types have no
// separate DB column for the specific reason, so it's folded into the free-text details the
// concierge already reads instead of adding a schema change or a duplicate service type.
const CATEGORY_LABEL: Record<string, string> = {
  // Family Care (HopFamilyCarePage) — all submit as service_type=family_home.
  childcare: 'Childcare support',
  eldercare: 'Eldercare support',
  school_activity: 'School and activity logistics',
  pet_care: 'Pet care',
  household_emergency: 'Household emergency',
  other: 'Other family need',
  // Wellness (HopWellnessPage) "Request support now" — each maps to its closest service_type.
  wellness_meal: 'Wellness check-in — meal support',
  wellness_ride: 'Wellness check-in — ride or commute support',
  wellness_errands: 'Wellness check-in — errands',
  wellness_appt: 'Wellness check-in — wellness appointment',
  wellness_time_back_home: 'Wellness check-in — time back at home',
  wellness_talk: 'Wellness check-in — talk to a concierge',
}

const SHIFT_PROTECTION_LABEL: Record<string, string> = {
  yes: 'yes',
  no: 'no',
  not_applicable: 'not applicable',
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return `${hours} hr ago`
}

function RideTracker({ requestId }: { requestId: string }) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number; updatedAt: string } | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    function poll() {
      hopGetRideLocation(requestId)
        .then((result) => {
          if (!cancelled) setLocation(result.location)
        })
        .catch(() => {
          if (!cancelled) setLocation(null)
        })
        .finally(() => {
          if (!cancelled) setLoaded(true)
        })
    }
    poll()
    const interval = setInterval(poll, 15000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [requestId])

  if (!loaded) return null

  return (
    <div className="hop-card" style={{ marginTop: '0.75rem' }}>
      <h2>Ride tracking</h2>
      <p className="hop-muted">Live location is shared only while your ride is on the way.</p>
      {location ? (
        <>
          <a
            className="hop-ride-map-link"
            href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View driver location on map ↗
          </a>
          <p className="hop-muted">Last updated {timeAgo(location.updatedAt)}</p>
        </>
      ) : (
        <p className="hop-muted">Your driver hasn't started sharing their location yet.</p>
      )}
    </div>
  )
}

export function HopRequestsPage() {
  const [searchParams] = useSearchParams()
  const [requests, setRequests] = useState<HopServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [serviceType, setServiceType] = useState(searchParams.get('type') || 'ride')
  const [details, setDetails] = useState(() => {
    const category = searchParams.get('category')
    const label = category ? CATEGORY_LABEL[category] : undefined
    if (!label) return ''
    const shift = searchParams.get('shift')
    const shiftNote = shift && SHIFT_PROTECTION_LABEL[shift] ? ` (shift protection: ${SHIFT_PROTECTION_LABEL[shift]})` : ''
    return `${label}${shiftNote} — `
  })
  const [requestedFor, setRequestedFor] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function loadRequests() {
    setLoading(true)
    hopListRequests()
      .then((result) => setRequests(result.requests))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false))
  }

  useEffect(loadRequests, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await hopCreateRequest({
        serviceType,
        details,
        requestedFor: requestedFor ? new Date(requestedFor).toISOString() : null,
      })
      setDetails('')
      setRequestedFor('')
      loadRequests()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Requests</h1>
      <p className="hop-page-sub">One request handles it — a concierge takes it from submission to done.</p>

      <form className="hop-card" onSubmit={handleSubmit}>
        <h2>New request</h2>
        {error && <div className="hop-auth-card__error">{error}</div>}

        <label className="hop-field">
          <span>What do you need?</span>
          <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
            {SERVICE_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="hop-field">
          <span>Details</span>
          <textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} />
        </label>

        <label className="hop-field">
          <span>Needed by (optional)</span>
          <input type="datetime-local" value={requestedFor} onChange={(e) => setRequestedFor(e.target.value)} />
        </label>

        <button type="submit" className="hop-btn-primary" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit request'}
        </button>
      </form>

      <section className="hop-card">
        <h2>Your requests</h2>
        {loading && <p className="hop-muted">Loading…</p>}
        {!loading && requests.length === 0 && <p className="hop-muted">No requests yet.</p>}
        {!loading &&
          requests.map((req) => (
            <div key={req.id} className="hop-dispatch-card" style={{ paddingBottom: '1.25rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--hop-border)' }}>
              <div className="hop-dispatch-card__header">
                <div>
                  <strong>{SERVICE_TYPES.find((s) => s.value === req.service_type)?.label || req.service_type}</strong>
                  <div className="hop-muted">{new Date(req.created_at).toLocaleString()}</div>
                </div>
                <span className={`hop-status hop-status--${req.status}`}>{STATUS_LABEL[req.status] || req.status}</span>
              </div>

              {req.assignee_name && <p className="hop-muted">Concierge: {req.assignee_name}</p>}
              <p>{MEMBER_STATUS_MESSAGE[req.status] || 'Your request is being tracked.'}</p>

              {req.history.length > 0 && (
                <ul className="hop-timeline">
                  {req.history.map((entry, index) => (
                    <li key={index}>
                      <div className="hop-timeline__top">
                        <span className={`hop-status hop-status--${entry.status}`}>
                          {STATUS_LABEL[entry.status] || entry.status}
                        </span>
                        <span className="hop-timeline__time">{new Date(entry.created_at).toLocaleString()}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {req.service_type === 'ride' && req.status === 'en_route' && <RideTracker requestId={req.id} />}
            </div>
          ))}
      </section>
    </div>
  )
}
