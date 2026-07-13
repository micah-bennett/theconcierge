import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { hopCreateRequest, hopListRequests, type HopServiceRequest } from '../../../hop/api'

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
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

// Family Care sends a category here (see HopFamilyCarePage) — family_home has no separate DB
// column for it, so it's folded into the free-text details the concierge already reads.
const FAMILY_CARE_CATEGORY_LABEL: Record<string, string> = {
  childcare: 'Childcare support',
  eldercare: 'Eldercare support',
  school_activity: 'School and activity logistics',
  pet_care: 'Pet care',
  household_emergency: 'Household emergency',
  other: 'Other family need',
}

export function HopRequestsPage() {
  const [searchParams] = useSearchParams()
  const [requests, setRequests] = useState<HopServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [serviceType, setServiceType] = useState(searchParams.get('type') || 'ride')
  const [details, setDetails] = useState(() => {
    const category = searchParams.get('category')
    const label = category ? FAMILY_CARE_CATEGORY_LABEL[category] : undefined
    return label ? `${label} — ` : ''
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
        {!loading && requests.length > 0 && (
          <table className="hop-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Details</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>{SERVICE_TYPES.find((s) => s.value === req.service_type)?.label || req.service_type}</td>
                  <td>
                    <span className={`hop-status hop-status--${req.status}`}>
                      {STATUS_LABEL[req.status] || req.status}
                    </span>
                  </td>
                  <td>{req.details || '—'}</td>
                  <td>{new Date(req.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
