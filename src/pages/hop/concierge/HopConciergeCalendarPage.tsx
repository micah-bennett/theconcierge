import { useEffect, useState } from 'react'
import { hopConciergeMyRequests, type HopAdminRequest } from '../../../hop/api'

const SERVICE_TYPE_LABEL: Record<string, string> = {
  ride: 'Ride',
  meal: 'Meal',
  errand: 'Errand',
  wellness: 'Wellness',
  family_home: 'Family & home',
  other: 'Something else',
}

// Phase 1 scope: a read-only agenda grouped by requested-for date, built from your assigned
// requests — not a full calendar UI or a personal Google Calendar sync. See
// docs/hop/architecture.md ("ConciergeHub") for why that's deferred.
function dateKey(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

export function HopConciergeCalendarPage() {
  const [requests, setRequests] = useState<HopAdminRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hopConciergeMyRequests()
      .then((result) => setRequests(result.requests))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false))
  }, [])

  const scheduled = requests
    .filter((r) => r.requested_for && r.status !== 'completed' && r.status !== 'cancelled')
    .sort((a, b) => new Date(a.requested_for as string).getTime() - new Date(b.requested_for as string).getTime())

  const groups = new Map<string, HopAdminRequest[]>()
  for (const req of scheduled) {
    const key = dateKey(req.requested_for as string)
    const list = groups.get(key) || []
    list.push(req)
    groups.set(key, list)
  }

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Calendar</h1>
      <p className="hop-page-sub">An agenda view of your assigned requests that have a needed-by time.</p>

      {loading && <p className="hop-muted">Loading…</p>}
      {!loading && groups.size === 0 && (
        <section className="hop-card">
          <p className="hop-muted">No scheduled requests right now.</p>
        </section>
      )}

      {!loading &&
        Array.from(groups.entries()).map(([day, dayRequests]) => (
          <section key={day} className="hop-card">
            <h2>{day}</h2>
            <ul className="hop-timeline">
              {dayRequests.map((req) => (
                <li key={req.id}>
                  <div className="hop-timeline__top">
                    <strong>{new Date(req.requested_for as string).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</strong>
                    <span>{SERVICE_TYPE_LABEL[req.service_type] || req.service_type}</span>
                  </div>
                  <span className="hop-muted">
                    {req.first_name} {req.last_name} — {req.details || 'No details'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  )
}
