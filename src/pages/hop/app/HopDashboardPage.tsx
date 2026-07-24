import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useHopAuth } from '../../../hop/useHopAuth'
import { hopGoogleCalendarEvents, hopListRequests, type HopCalendarEvent, type HopServiceRequest } from '../../../hop/api'

const QUICK_REQUESTS = [
  { to: '/hop/app/requests?type=ride', icon: '🚗', label: 'Ride' },
  { to: '/hop/app/requests?type=meal', icon: '🍴', label: 'Meals' },
  { to: '/hop/app/requests?type=errand', icon: '📦', label: 'Errands' },
  { to: '/hop/app/requests?type=wellness', icon: '❤️', label: 'Wellness' },
  { to: '/hop/app/family-care', icon: '🏠', label: 'Family Care' },
  { to: '/hop/app/requests?type=other', icon: '🤖', label: 'Other' },
] as const

const SERVICE_TYPE_LABEL: Record<string, string> = {
  ride: 'Ride',
  meal: 'Meal',
  errand: 'Errand',
  wellness: 'Wellness',
  family_home: 'Family & home',
  other: 'Something else',
}

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

function ActiveRequestTracker({ request }: { request: HopServiceRequest }) {
  return (
    <section className="hop-card hop-tracker-card">
      <div className="hop-card__header">
        <h2>🚦 Active request — {SERVICE_TYPE_LABEL[request.service_type] || request.service_type}</h2>
        <span className={`hop-status hop-status--${request.status}`}>
          {STATUS_LABEL[request.status] || request.status}
        </span>
      </div>
      {request.assignee_name && <p className="hop-muted">Concierge: {request.assignee_name}</p>}
      <Link to="/hop/app/requests">View request details →</Link>
    </section>
  )
}

export function HopDashboardPage() {
  const { user } = useHopAuth()
  const [events, setEvents] = useState<HopCalendarEvent[] | null>(null)
  const [connected, setConnected] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [eventsError, setEventsError] = useState(false)
  const [activeRequest, setActiveRequest] = useState<HopServiceRequest | null>(null)

  useEffect(() => {
    let cancelled = false
    hopGoogleCalendarEvents()
      .then((result) => {
        if (cancelled) return
        setConnected(result.connected)
        setEvents(result.events)
      })
      .catch(() => {
        if (!cancelled) {
          setEvents([])
          setEventsError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingEvents(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    hopListRequests()
      .then((result) => {
        if (cancelled) return
        const active = result.requests.find((req) => req.status !== 'completed' && req.status !== 'cancelled')
        setActiveRequest(active || null)
      })
      .catch(() => {
        if (!cancelled) setActiveRequest(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Today</h1>
      <p className="hop-page-sub">Welcome back, {user?.firstName}. What do you need?</p>

      {activeRequest && <ActiveRequestTracker request={activeRequest} />}

      <div className="hop-quick-grid">
        {QUICK_REQUESTS.map((item) => (
          <Link key={item.to} to={item.to} className="hop-quick-card">
            <span className="hop-quick-card__icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      <section className="hop-card">
        <div className="hop-card__header">
          <h2>📅 Upcoming on your calendar</h2>
          {!connected && !eventsError && <Link to="/hop/app/integrations">Connect Google Calendar →</Link>}
        </div>
        {loadingEvents && <p className="hop-muted">Loading…</p>}
        {!loadingEvents && eventsError && (
          <p className="hop-muted">
            Could not load your calendar. <Link to="/hop/app/integrations">Reconnect Google Calendar</Link>.
          </p>
        )}
        {!loadingEvents && !eventsError && !connected && (
          <p className="hop-muted">Connect your calendar to see upcoming events here.</p>
        )}
        {!loadingEvents && !eventsError && connected && events && events.length === 0 && (
          <p className="hop-muted">Nothing on your calendar right now.</p>
        )}
        {!loadingEvents && !eventsError && connected && events && events.length > 0 && (
          <ul className="hop-event-list">
            {events.map((event) => (
              <li key={event.id}>
                <span className="hop-event-list__title">{event.summary}</span>
                {event.start && <span className="hop-event-list__time">{new Date(event.start).toLocaleString()}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
