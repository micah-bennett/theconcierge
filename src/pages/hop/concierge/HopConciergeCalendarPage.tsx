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

type Tab = 'upcoming' | 'history'

export function HopConciergeCalendarPage() {
  const [requests, setRequests] = useState<HopAdminRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('upcoming')

  useEffect(() => {
    hopConciergeMyRequests()
      .then((result) => setRequests(result.requests))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false))
  }, [])

  const upcoming = requests
    .filter((r) => r.requested_for && r.status !== 'completed' && r.status !== 'cancelled')
    .sort((a, b) => new Date(a.requested_for as string).getTime() - new Date(b.requested_for as string).getTime())

  // History: completed requests, most recent first, grouped/labeled by completion date
  // (updated_at) — not requested_for, since a past request may never have had one.
  const history = requests
    .filter((r) => r.status === 'completed')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  const shown = tab === 'upcoming' ? upcoming : history
  const timeField = tab === 'upcoming' ? 'requested_for' : 'updated_at'

  const groups = new Map<string, HopAdminRequest[]>()
  for (const req of shown) {
    const key = dateKey((req[timeField] as string) || req.created_at)
    const list = groups.get(key) || []
    list.push(req)
    groups.set(key, list)
  }

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Calendar</h1>
      <p className="hop-page-sub">An agenda view of your assigned requests — upcoming or completed.</p>

      <div className="hop-tabs">
        <button
          type="button"
          className={`hop-tab${tab === 'upcoming' ? ' hop-tab--active' : ''}`}
          onClick={() => setTab('upcoming')}
        >
          Upcoming ({upcoming.length})
        </button>
        <button
          type="button"
          className={`hop-tab${tab === 'history' ? ' hop-tab--active' : ''}`}
          onClick={() => setTab('history')}
        >
          History ({history.length})
        </button>
      </div>

      {loading && <p className="hop-muted">Loading…</p>}
      {!loading && groups.size === 0 && (
        <section className="hop-card">
          <p className="hop-muted">{tab === 'upcoming' ? 'No scheduled requests right now.' : 'No completed requests yet.'}</p>
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
                    <strong>
                      {new Date((req[timeField] as string) || req.created_at).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </strong>
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
