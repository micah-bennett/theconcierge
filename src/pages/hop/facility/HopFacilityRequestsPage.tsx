import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { hopCreateRequest, hopListRequests, type HopServiceRequest } from '../../../hop/api'
import { useToast } from '../../../hop/useToast'
import { EmptyState } from '../../../hop/EmptyState'

// "My Requests" tab (decision #4, docs/hop/architecture.md "Facility portal") — a Facility Admin
// also has a regular HOP member identity under this same account (role='facility'), so they can
// submit/track their own requests without leaving the portal or logging in separately. Reuses
// the existing GET/POST /api/hop/requests calls with zero backend change — requireUser has no
// role check, and the requests GET/POST handlers only special-case role==='admin'; every other
// role (including 'facility') is already scoped to "my own requests" automatically.

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

export function HopFacilityRequestsPage() {
  const toast = useToast()
  const [requests, setRequests] = useState<HopServiceRequest[] | null>(null)
  const [serviceType, setServiceType] = useState('ride')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(load, [])

  function load() {
    hopListRequests()
      .then((result) => setRequests(result.requests))
      .catch(() => setRequests([]))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await hopCreateRequest({ serviceType, details, requestedFor: null })
      setDetails('')
      load()
      toast.success('Request submitted.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the request')
    } finally {
      setSubmitting(false)
    }
  }

  const loading = requests === null

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">My requests</h1>
      <p className="hop-page-sub">Your own HOP requests — submitted and tracked from the same account as your Facility dashboard.</p>

      <section className="hop-card">
        <h2>📋 Submit a request</h2>
        <form className="hop-form-stack" onSubmit={handleSubmit}>
          {error && (
            <div className="hop-auth-card__error" role="alert">
              {error}
            </div>
          )}
          <label className="hop-field">
            <span>What do you need?</span>
            <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
              {SERVICE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="hop-field">
            <span>Details</span>
            <textarea rows={3} maxLength={1000} required value={details} onChange={(e) => setDetails(e.target.value)} />
          </label>
          <button type="submit" className="hop-btn-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      </section>

      <section className="hop-card">
        <h2>🕒 Your requests</h2>
        {loading && <div className="hop-skeleton-bar" />}
        {!loading && requests.length === 0 && <EmptyState icon="📋" message="No requests yet." />}
        {!loading && requests.length > 0 && (
          <ul className="hop-history-list">
            {requests.map((r) => (
              <li key={r.id} className="hop-history-list__item">
                <span className="hop-history-list__type">
                  {SERVICE_TYPES.find((t) => t.value === r.service_type)?.label || r.service_type}
                </span>
                <span className={`hop-status hop-status--${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span>
                <span className="hop-history-list__date">{new Date(r.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
