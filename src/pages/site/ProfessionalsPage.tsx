import { Link } from 'react-router-dom'
import { InfoPanel, PageHero, Quote } from './parts'

const PROFESSIONAL_SUPPORT = [
  'Request coordination and follow-up',
  'Trusted local and workplace resources',
  'Planning and organization support',
  'Service navigation and referrals when appropriate',
  'Personalized concierge options through The Concierge by HOP',
] as const

export function ProfessionalsPage() {
  return (
    <>
      <PageHero
        eyebrow="HOP for Professionals"
        title="More room to focus on what matters."
        lead="HOP gives busy professionals a supportive, practical way to manage the everyday details that compete for their time and attention."
      >
        <div className="hs-button-row">
          <Link className="hs-btn hs-btn--primary" to="/contact">
            Talk with HOP
          </Link>
        </div>
      </PageHero>
      <section className="hs-section">
        <div className="hs-container hs-split">
          <InfoPanel
            heading="h2"
            title="Personalized, practical support"
            intro="Every person’s needs are different. HOP can help create a clear path from “I need help with this” to a practical next step."
            items={PROFESSIONAL_SUPPORT}
          />
          <Quote
            text="“Support is more meaningful when it is easy to access, respectful of a person’s time, and built around what they actually need.”"
            attribution="HOP Approach"
          />
        </div>
      </section>
    </>
  )
}
