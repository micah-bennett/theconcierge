import { Link } from 'react-router-dom'
import { InfoPanel, PageHero, Quote } from './parts'

// HOP's primary marketing audience: hospitals, healthcare facilities and the people who work there.
// Facts here come from what the Portal actually does (docs/portal/mvp-scope.md). No statistics,
// customer names or outcomes until leadership supplies them.

const STAFF_GET = [
  'Ask HOP for anything: errands, rides, meals, and family logistics',
  'A quick daily check-in on how the day is going',
  'Rewards for staying connected',
  'Real people on the other end, not a bot',
  'Sign in from any browser, with no app to download',
] as const

const LEADERS_GET = [
  'A unit heat map built from unit totals only, never names',
  'A privacy floor: any group smaller than 5 people is never shown',
  'Burnout Radar, so leaders can see strain building and act early',
  'Unit trends in stress, mood, missed breaks, and HOP requests',
] as const

const PROFESSIONAL_SUPPORT = [
  'Request coordination and follow-up that works around your shifts',
  'Trusted local and workplace resources',
  'Planning and organization support for life outside the hospital',
  'Service navigation and referrals when appropriate',
  'Personalized concierge options through The Concierge by HOP',
] as const

export function HealthcarePage() {
  return (
    <>
      {/* [CONFIRM] new healthcare copy, review with leadership */}
      <PageHero
        eyebrow="HOP for Healthcare"
        title="Radical Hospitality for the people who keep healthcare running."
        lead="HOP partners with hospitals and healthcare facilities to take everyday errands and logistics off the plates of nurses, doctors, and every healthcare professional, so they can focus on care and on their own lives."
      >
        <div className="hs-button-row">
          <Link className="hs-btn hs-btn--primary" to="/contact?interest=healthcare">
            Bring HOP to your hospital
          </Link>
          <Link className="hs-btn hs-btn--secondary" to="/portal">
            Sign in to the HOP Portal
          </Link>
        </div>
      </PageHero>

      <section className="hs-section">
        {/* [CONFIRM] new healthcare copy, review with leadership */}
        <div className="hs-container hs-split">
          <div>
            <p className="hs-eyebrow">For your staff · HOP Client</p>
            <h2>You take care of everyone else. We take care of the errands.</h2>
            <p className="hs-lead">
              HOP Client is the web app your staff use to reach HOP. One request, and a real person
              on the HOP team picks it up and gets it done.
            </p>
          </div>
          <InfoPanel title="What staff get" items={STAFF_GET} />
        </div>
      </section>

      <section className="hs-section hs-section--pale">
        {/* [CONFIRM] new healthcare copy, review with leadership */}
        <div className="hs-container hs-split">
          <InfoPanel title="What leaders get" items={LEADERS_GET} />
          <div>
            <p className="hs-eyebrow">For leaders · Facility View</p>
            <h2>See where support is needed, without seeing anyone’s personal details.</h2>
            <p className="hs-lead">
              Facility View gives hospital leaders a picture of their units, never of individuals.
              Privacy is built in on the server, so a name or a small group never reaches the
              screen.
            </p>
          </div>
        </div>
      </section>

      <section className="hs-section">
        {/* [CONFIRM] new healthcare copy, review with leadership */}
        <div className="hs-container hs-split">
          <InfoPanel
            heading="h2"
            title="Personalized, practical support"
            intro="Every healthcare professional’s needs are different, and shifts rarely leave time for the rest of life. HOP helps create a clear path from “I need help with this” to a practical next step."
            items={PROFESSIONAL_SUPPORT}
          />
          <Quote
            text="“Support is more meaningful when it is easy to access, respectful of a person’s time, and built around what they actually need.”"
            attribution="HOP Approach"
          />
        </div>
      </section>

      <section className="hs-cta">
        {/* [CONFIRM] new healthcare copy, review with leadership */}
        <div className="hs-container">
          <p className="hs-eyebrow">Let’s talk</p>
          <h2>Bring Radical Hospitality to your hospital.</h2>
          <p>
            Tell us about your teams and what would make their days easier. We will start with a
            conversation and shape a HOP program around your people.
          </p>
          <div className="hs-button-row">
            <Link className="hs-btn hs-btn--primary" to="/contact?interest=healthcare">
              Bring HOP to your hospital
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
