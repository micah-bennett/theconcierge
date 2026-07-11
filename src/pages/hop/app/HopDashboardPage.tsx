import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useHopAuth } from '../../../hop/useHopAuth'
import { hopGoogleCalendarEvents, type HopCalendarEvent } from '../../../hop/api'
import { HopWhyBanner } from '../../../hop/dashboard/HopWhyBanner'
import { HopBurnoutStats } from '../../../hop/dashboard/HopBurnoutStats'
import { HopHowItWorks } from '../../../hop/dashboard/HopHowItWorks'
import { HopServicesOverview } from '../../../hop/dashboard/HopServicesOverview'
import { HopFeatureHighlights } from '../../../hop/dashboard/HopFeatureHighlights'
import { HopAboutStory } from '../../../hop/dashboard/HopAboutStory'

const QUICK_REQUESTS = [
  { type: 'ride', icon: '🚗', label: 'Ride' },
  { type: 'meal', icon: '🍴', label: 'Meal' },
  { type: 'errand', icon: '📦', label: 'Errand' },
  { type: 'wellness', icon: '❤️', label: 'Wellness' },
  { type: 'family_home', icon: '🏠', label: 'Family & home' },
  { type: 'other', icon: '🤖', label: 'Something else' },
] as const

export function HopDashboardPage() {
  const { user } = useHopAuth()
  const [events, setEvents] = useState<HopCalendarEvent[] | null>(null)
  const [connected, setConnected] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(true)

  useEffect(() => {
    let cancelled = false
    hopGoogleCalendarEvents()
      .then((result) => {
        if (cancelled) return
        setConnected(result.connected)
        setEvents(result.events)
      })
      .catch(() => {
        if (!cancelled) setEvents([])
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
          <Link key={item.type} to={`/hop/app/requests?type=${item.type}`} className="hop-quick-card">
            <span className="hop-quick-card__icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      <section className="hop-card">
        <div className="hop-card__header">
          <h2>Upcoming on your calendar</h2>
          {!connected && <Link to="/hop/app/integrations">Connect Google Calendar →</Link>}
        </div>
        {loadingEvents && <p className="hop-muted">Loading…</p>}
        {!loadingEvents && !connected && (
          <p className="hop-muted">Connect your calendar to see upcoming events here.</p>
        )}
        {!loadingEvents && connected && events && events.length === 0 && (
          <p className="hop-muted">Nothing on your calendar right now.</p>
        )}
        {!loadingEvents && connected && events && events.length > 0 && (
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

      <HopWhyBanner />

      <section className="hop-dash-section">
        <HopBurnoutStats />
      </section>

      <section className="hop-dash-section">
        <HopHowItWorks />
      </section>

      <section className="hop-dash-section">
        <HopServicesOverview />
      </section>

      <section className="hop-dash-section">
        <HopFeatureHighlights />
      </section>

      <section className="hop-dash-section">
        <HopAboutStory />
      </section>
    </div>
  )
}
