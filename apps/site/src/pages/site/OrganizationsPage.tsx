import { Link } from 'react-router-dom'
import { InfoPanel, PageHero, Quote } from './parts'

// The non-healthcare category: employers and businesses across industries. Healthcare
// organizations have their own page (HealthcarePage.tsx).

const ORG_CARDS = [
  {
    icon: '◌',
    title: 'Employee experience',
    desc: 'Create accessible support options that help employees feel seen, connected, and better able to manage everyday demands.',
  },
  {
    icon: '↗',
    title: 'On-site hospitality',
    desc: 'Bring a warm, organized, service-oriented presence into the places where people work, gather, or receive support.',
  },
  {
    icon: '≋',
    title: 'Adaptive programs',
    desc: 'Start with your priorities, learn from use and feedback, and evolve the program as people’s needs change.',
  },
] as const

const PARTNERSHIP_INCLUDES = [
  'Support-needs discovery and experience design',
  'On-site hospitality and resource coordination',
  'Employee-facing request and resource pathways',
  'Concierge-style support programs',
  'HOP Portal access and program insight',
] as const

const EMPLOYEE_SUPPORT = [
  'Request coordination and follow-up',
  'Trusted local and workplace resources',
  'Planning and organization support',
  'Service navigation and referrals when appropriate',
  'Personalized concierge options through The Concierge by HOP',
] as const

export function OrganizationsPage() {
  return (
    <>
      <PageHero
        eyebrow="HOP for Organizations"
        title="Create a workplace experience that feels more human."
        lead="HOP partners with employers and businesses across industries that want to support their people in practical, thoughtful, and responsive ways—without relying on one-size-fits-all programs."
      >
        <div className="hs-button-row">
          <Link className="hs-btn hs-btn--primary" to="/contact?interest=organization">
            Discuss a HOP Program
          </Link>
        </div>
      </PageHero>
      <section className="hs-section">
        <div className="hs-container">
          <div className="hs-section-head">
            <div>
              <p className="hs-eyebrow">Designed for many environments</p>
              <h2>Hospitality is a workplace advantage.</h2>
            </div>
            <p>
              HOP can be shaped for companies, professional teams, campuses, residential
              communities, and other people-centered organizations.
            </p>
          </div>
          <div className="hs-cards-3">
            {ORG_CARDS.map((card) => (
              <article key={card.title} className="hs-card">
                <div className="hs-icon-box" aria-hidden="true">
                  {card.icon}
                </div>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="hs-section hs-section--pale">
        <div className="hs-container hs-split">
          <InfoPanel title="A HOP partnership can include" items={PARTNERSHIP_INCLUDES} />
          <div>
            <p className="hs-eyebrow">Built around your culture</p>
            <h2>Support should fit the way your people work.</h2>
            <p className="hs-lead">
              HOP is not positioned as a generic perks platform. It is a human-centered
              partnership designed to be present, adaptive, and useful in the moments that matter.
            </p>
          </div>
        </div>
      </section>
      <section className="hs-section">
        <div className="hs-container hs-split">
          <InfoPanel
            heading="h2"
            title="Personalized, practical support for your employees"
            intro="Every person’s needs are different. HOP can help each of your employees find a clear path from “I need help with this” to a practical next step."
            items={EMPLOYEE_SUPPORT}
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
