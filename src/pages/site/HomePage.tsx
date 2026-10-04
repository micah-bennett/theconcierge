import { Link } from 'react-router-dom'
import { Steps, type Step } from './parts'

const HOME_CARDS = [
  {
    icon: '✦',
    title: 'HOP for Professionals',
    desc: 'Personalized requests, trusted resources, and practical support that helps professionals protect their time and energy.',
    link: { to: '/professionals', label: 'Explore professional support' },
  },
  {
    icon: '◫',
    title: 'HOP for Organizations',
    desc: 'Adaptive hospitality programs that strengthen employee experience, connection, and day-to-day workplace support.',
    link: { to: '/organizations', label: 'Explore organization support' },
  },
  {
    icon: '⌁',
    title: 'The HOP Portal',
    desc: 'A secure, web-based access point where members log in to request help, connect to services, and find resources.',
    link: { to: '/hop/login', label: 'Log in to the HOP Portal' },
  },
] as const

const HOME_FEATURES = [
  {
    title: 'Human-centered',
    desc: 'Service begins with the real needs, schedules, and pressures people are facing.',
  },
  {
    title: 'Adaptive support',
    desc: 'Programs can evolve as workplace needs and employee feedback change.',
  },
  {
    title: 'On-site and digital',
    desc: 'Bring support into the workplace while giving people a simple digital way to connect.',
  },
  {
    title: 'Designed around your people',
    desc: 'Build a service experience that fits your culture, priorities, and capacity.',
  },
] as const

const HOME_STEPS: ReadonlyArray<Step> = [
  {
    num: '01',
    title: 'Listen',
    desc: 'We learn about your people, priorities, environment, and the support gaps you want to address.',
  },
  {
    num: '02',
    title: 'Design',
    desc: 'We shape a responsive support experience using hospitality, coordination, resources, and digital access.',
  },
  {
    num: '03',
    title: 'Support and adapt',
    desc: 'HOP stays connected, helps people access support, and adjusts as needs change over time.',
  },
]

const CONCIERGE_INCLUDES = [
  'Planning, coordination, and research',
  'Appointment and schedule support',
  'Local resources and vendor coordination',
  'Special requests and everyday details',
] as const

export function HomePage() {
  return (
    <>
      <section className="hs-hero">
        <div className="hs-container hs-hero__grid">
          <div>
            <p className="hs-eyebrow">Hospitality On-Site Professionals</p>
            <h1>Hospitality that helps people and workplaces thrive.</h1>
            <p className="hs-lead">
              HOP brings responsive, human-centered support to professionals and
              organizations—helping people manage the details, stay connected, and build a
              stronger workplace experience.
            </p>
            <div className="hs-button-row">
              <Link className="hs-btn hs-btn--primary" to="/organizations">
                Explore HOP for Organizations
              </Link>
              <Link className="hs-btn hs-btn--secondary" to="/professionals">
                Explore HOP for Professionals
              </Link>
            </div>
          </div>
          <div className="hs-hero__art" role="img" aria-label="Abstract illustration of connected professionals">
            <span className="hs-hero__art-label">Support that shows up</span>
            <div className="hs-hero__people" aria-hidden="true">
              <span className="hs-hero__person" />
              <span className="hs-hero__person" />
              <span className="hs-hero__person" />
            </div>
            <div className="hs-hero__card">
              <strong>Human-first support</strong>
              <span>
                Thoughtful service, responsive tools, and programs designed around real people.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="hs-section">
        <div className="hs-container">
          <div className="hs-section-head">
            <div>
              <p className="hs-eyebrow">One connected experience</p>
              <h2>Support where it matters most.</h2>
            </div>
            <p>
              HOP blends hospitality, practical coordination, and easy-to-use technology so people
              and organizations can access the right kind of help at the right time.
            </p>
          </div>
          <div className="hs-cards-3">
            {HOME_CARDS.map((card) => (
              <article key={card.title} className="hs-card">
                <div className="hs-icon-box" aria-hidden="true">
                  {card.icon}
                </div>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
                <Link className="hs-text-link" to={card.link.to}>
                  {card.link.label}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="hs-section hs-section--pale">
        <div className="hs-container hs-features-grid">
          <div>
            <p className="hs-eyebrow">Built for real needs</p>
            <h2>Responsive support—not a one-size-fits-all benefit.</h2>
            <p className="hs-lead">
              HOP helps organizations create a more human workplace by listening, adapting, and
              making practical support easier to access.
            </p>
            <div className="hs-feature-list">
              {HOME_FEATURES.map((feature) => (
                <div key={feature.title} className="hs-feature">
                  <span className="hs-feature__bullet" aria-hidden="true">
                    ✓
                  </span>
                  <div>
                    <strong>{feature.title}</strong>
                    <span>{feature.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <aside className="hs-app-panel">
            <span className="hs-badge hs-badge--dark">
              <span className="hs-badge__dot" />
              Now open
            </span>
            <h2>The HOP Portal</h2>
            <p>
              The HOP Portal is our web-based access point—members log in to submit requests,
              browse resources, and follow their support. No download required.
            </p>
            <div className="hs-button-row hs-app-panel__actions">
              <Link className="hs-btn hs-btn--primary" to="/hop/login">
                Log in to the HOP Portal
              </Link>
            </div>
            <div className="hs-phone" aria-label="HOP app preview">
              <div className="hs-phone__top" />
              <div className="hs-phone__brand">HOP</div>
              <div className="hs-phone__sub">HOP PORTAL</div>
              <div className="hs-phone__card">
                <small>Good morning</small>
                <strong>What would make today easier?</strong>
                <span>Submit a request, browse resources, or check your support plan.</span>
              </div>
              <div className="hs-phone__card hs-phone__card--blue">
                <small>In the Portal</small>
                <strong>Workplace resource guide</strong>
                <span>Practical options matched to your needs.</span>
              </div>
              <div className="hs-phone__row" />
              <div className="hs-phone__row hs-phone__row--short" />
            </div>
          </aside>
        </div>
      </section>

      <section className="hs-section">
        <div className="hs-container">
          <div className="hs-section-head">
            <div>
              <p className="hs-eyebrow">A clear path</p>
              <h2>How HOP works</h2>
            </div>
            <p>
              Whether HOP is supporting one person or an entire organization, the approach begins
              with understanding what would make a meaningful difference.
            </p>
          </div>
          <Steps steps={HOME_STEPS} />
          <div className="hs-button-row">
            <Link className="hs-btn hs-btn--primary" to="/how-it-works">
              Learn more about HOP
            </Link>
          </div>
        </div>
      </section>

      <section className="hs-concierge">
        <div className="hs-container hs-concierge__grid">
          <div>
            <p className="hs-eyebrow hs-eyebrow--on-dark">A HOP service</p>
            <h2>The Concierge by HOP</h2>
            <p>
              Personalized support for life’s everyday details. The Concierge by HOP gives
              individuals, families, and busy professionals a trusted place to turn for
              coordination, planning, and practical assistance.
            </p>
            <div className="hs-button-row">
              <Link className="hs-btn hs-btn--primary" to="/concierge">
                Explore The Concierge
              </Link>
            </div>
          </div>
          <aside className="hs-concierge__side">
            <strong>PERSONALIZED SUPPORT MAY INCLUDE</strong>
            <ul>
              {CONCIERGE_INCLUDES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="hs-cta">
        <div className="hs-container">
          <p className="hs-eyebrow">Let’s make support easier</p>
          <h2>Build a more supported experience for your people.</h2>
          <p>
            Tell HOP what would make life or work easier. We will start with a conversation and
            identify the right next steps.
          </p>
          <div className="hs-button-row">
            <Link className="hs-btn hs-btn--primary" to="/contact">
              Start a Conversation
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
