import { Link } from 'react-router-dom'
import { appUrl, CONCIERGE_URL } from '../../site/portalUrls'
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
          <Link className="hs-btn hs-btn--primary" to="/request">
            Make a Request
          </Link>
          <Link className="hs-btn hs-btn--secondary" to="/contact?interest=concierge">
            Start a Conversation
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
      <section className="hs-section hs-section--pale" id="concierge-paths">
        <div className="hs-container">
          {/* [CONFIRM] new concierge paths copy, review with leadership */}
          <div className="hs-section-head">
            <div>
              <p className="hs-eyebrow">Two ways to start</p>
              <h2>Keep an account, or just ask once.</h2>
            </div>
            <p>
              Choose what fits. Either way, a real person on the HOP team picks up your request and
              follows up with you.
            </p>
          </div>
          <div className="hs-cards-2">
            <article className="hs-card hs-portal-card">
              <div className="hs-icon-box" aria-hidden="true">
                ✦
              </div>
              <h3>Concierge Portal</h3>
              <span className="hs-portal-card__who">For people who want an account</span>
              <p>
                Request The Concierge by HOP, track every request and message the team, all from
                any browser.
              </p>
              {CONCIERGE_URL ? (
                <div className="hs-button-row hs-portal-card__actions">
                  <a className="hs-btn hs-btn--primary" href={appUrl(CONCIERGE_URL, '/login')}>
                    Sign in
                  </a>
                  <a className="hs-btn hs-btn--secondary" href={appUrl(CONCIERGE_URL, '/signup')}>
                    Create an account
                  </a>
                </div>
              ) : (
                <span className="hs-portal-card__soon">Coming soon</span>
              )}
            </article>
            <article className="hs-card hs-portal-card">
              <div className="hs-icon-box" aria-hidden="true">
                ↗
              </div>
              <h3>Request once, no account needed</h3>
              <span className="hs-portal-card__who">For a single request</span>
              <p>
                Tell us what you need and when. Errands, appointments, home help, airport rides and
                more. We will follow up to confirm the details.
              </p>
              <div className="hs-button-row hs-portal-card__actions">
                <Link className="hs-btn hs-btn--primary" to="/request">
                  Make a Request
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  )
}
