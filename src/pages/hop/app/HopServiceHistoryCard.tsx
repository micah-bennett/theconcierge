import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hopListRequests, type HopServiceRequest } from '../../../hop/api'
import { EmptyState } from '../../../hop/EmptyState'

const SERVICE_LABEL: Record<string, string> = {
  ride: '🚗 Ride',
  meal: '🍽️ Meal',
  errand: '🛍️ Errand',
  wellness: '❤️ Wellness',
  family_home: '👨‍👩‍👧 Family & home',
  other: '✨ Other',
}

// Reuses the same GET /api/hop/requests call HopRequestsPage.tsx already makes — every service
// request the member has ever submitted, with no separate endpoint needed. See docs/hop/
// architecture.md's "Member Profile" note.
export function HopServiceHistoryCard() {
  const [requests, setRequests] = useState<HopServiceRequest[] | null>(null)

  useEffect(() => {
    hopListRequests()
      .then((result) => setRequests(result.requests))
      .catch(() => setRequests([]))
  }, [])

  const loading = requests === null
  const list = requests ?? []
  const completedCount = list.filter((r) => r.status === 'completed').length
  const ratingsGiven = list.filter((r) => r.my_rating !== null)
  const avgRatingGiven =
    ratingsGiven.length > 0
      ? (ratingsGiven.reduce((sum, r) => sum + (r.my_rating?.stars ?? 0), 0) / ratingsGiven.length).toFixed(1)
      : null
  const recent = list.slice(0, 5)

  return (
    <section className="hop-card">
      <h2>🧾 Service history</h2>
      {loading && (
        <>
          <div className="hop-skeleton-bar hop-skeleton-bar--title" />
          <div className="hop-skeleton-bar" />
          <div className="hop-skeleton-bar" />
        </>
      )}
      {!loading && list.length === 0 && (
        <EmptyState
          icon="🧾"
          message="No requests yet."
          action={
            <Link to="/hop/app/requests" className="hop-btn-secondary">
              Submit your first request
            </Link>
          }
        />
      )}
      {!loading && list.length > 0 && (
        <>
          <div className="hop-history-stats">
            <div className="hop-history-stats__item">
              <span className="hop-history-stats__value">{list.length}</span>
              <span className="hop-history-stats__label">Total requests</span>
            </div>
            <div className="hop-history-stats__item">
              <span className="hop-history-stats__value">{completedCount}</span>
              <span className="hop-history-stats__label">Completed</span>
            </div>
            <div className="hop-history-stats__item">
              <span className="hop-history-stats__value">{avgRatingGiven ?? '—'}</span>
              <span className="hop-history-stats__label">
                Avg. rating given{ratingsGiven.length > 0 ? ` (${ratingsGiven.length})` : ''}
              </span>
            </div>
          </div>

          <ul className="hop-history-list">
            {recent.map((r) => (
              <li key={r.id} className="hop-history-list__item">
                <span className="hop-history-list__type">{SERVICE_LABEL[r.service_type] ?? r.service_type}</span>
                <span className={`hop-status hop-status--${r.status}`}>{r.status.replace('_', ' ')}</span>
                <span className="hop-history-list__date">{new Date(r.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>

          <Link to="/hop/app/requests" className="hop-btn-secondary">
            View all requests
          </Link>
        </>
      )}
    </section>
  )
}
