import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useHopAuth } from '../../../hop/useHopAuth'
import { hopGoogleCalendarEvents, type HopCalendarEvent } from '../../../hop/api'

const QUICK_REQUESTS = [
  { to: '/hop/app/requests?type=ride', icon: '🚗', label: 'Ride' },
  { to: '/hop/app/requests?type=meal', icon: '🍴', label: 'Meal' },
  { to: '/hop/app/requests?type=errand', icon: '📦', label: 'Errand' },
  { to: '/hop/app/requests?type=wellness', icon: '❤️', label: 'Wellness' },
  { to: '/hop/app/family-care', icon: '🏠', label: 'Family Care' },
  { to: '/hop/app/wellness', icon: '🌿', label: 'How are you doing today?' },
  { to: '/hop/app/requests?type=other', icon: '🤖', label: 'Something else' },
] as const

export function HopDashboardPage() {
  const { user } = useHopAuth()
  const [events, setEvents] = useState<HopCalendarEvent[] | null>(null)
  const [connected, setConnected] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [eventsError, setEventsError] = useState(false)

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

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Welcome back, {user?.firstName}.</h1>
      <p className="hop-page-sub">One request handles the rest. What do you need?</p>

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
          <h2>Upcoming on your calendar</h2>
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
