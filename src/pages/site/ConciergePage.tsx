import { Link } from 'react-router-dom'
import { InfoPanel, PageHero, Quote } from './parts'

const CONCIERGE_SUPPORT = [
  'Personal task, errand, and request coordination',
  'Appointment, calendar, and scheduling support',
  'Vendor research and coordination',
  'Travel, reservations, gifts, events, and special requests',
  'Local resource research and personalized planning',
] as const

export function ConciergePage() {
  return (
    <>
      <PageHero
        eyebrow="A HOP service"
        title="The Concierge by HOP"
        lead="Personalized support for the everyday details of life. HOP helps individuals, households, and busy professionals plan, coordinate, and move forward with more ease."
      >
        <div className="hs-button-row">
          <Link className="hs-btn hs-btn--primary" to="/contact?interest=concierge">
            Request Personal Support
          </Link>
        </div>
      </PageHero>
      <section className="hs-section">
        <div className="hs-container hs-split">
          <InfoPanel
            heading="h2"
            title="Support for life’s moving parts"
            intro="The Concierge by HOP provides a thoughtful, personalized approach to requests that take time, attention, organization, or local knowledge."
            items={CONCIERGE_SUPPORT}
          />
          <Quote
            text="“A trusted point of support can turn a long to-do list into a manageable next step.”"
            attribution="The Concierge by HOP"
          />
        </div>
      </section>
    </>
  )
}
