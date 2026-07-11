import { StatCounter } from './StatCounter'

const STATS = [
  { target: 21, suffix: 'hrs/wk', label: 'lost to logistics by the avg caregiver', source: 'Caregiver Action Network' },
  { target: 1, suffix: 'in 5', label: 'discharges end in readmission from care gaps', source: 'CMS 2024' },
  { target: 13, suffix: 'yrs', label: 'serving the Hudson Valley & NYC Metro', source: 'Est. 2011' },
] as const

const ASK_TAGS = ['Rides', 'Meals', 'Errands', 'Prescriptions', 'Healthcare', 'Executive'] as const

export function Hero() {
  return (
    <section className="mkt-hero" id="hero" aria-labelledby="hero-heading">
      <div className="mkt-hero__glow" aria-hidden="true" />
      <div className="mkt-hero__inner">
        <div className="mkt-badge-pill">
          <span className="mkt-badge-dot" />
          Concierge Services for Healthcare Professionals — Radical Hospitality
        </div>

        <h1 id="hero-heading" className="mkt-hero__headline">
          Behind every great professional
          <br />
          <span className="mkt-gradient-text">is someone running on empty.</span>
        </h1>

        <p className="mkt-hero__sub">
          The Concierge is the off-duty button for healthcare teams, caregivers, and executives — one request
          handles the ride, errand, pickup, or anything else, so you can focus on what only you can do.
        </p>

        <div className="mkt-hero__paths">
          <div className="mkt-path-card">
            <span className="mkt-path-card__badge">For Nurses, Doctors & Care Professionals</span>
            <p className="mkt-path-card__copy">
              Need help now? Place a one-time request directly on this website — no app download required.
            </p>
            <a className="mkt-btn mkt-btn-primary" href="#request">
              Place a Request →
            </a>
          </div>
          <div className="mkt-path-card mkt-path-card--alt">
            <span className="mkt-path-card__badge mkt-path-card__badge--alt">For Hospitals & Facilities</span>
            <p className="mkt-path-card__copy">
              Partner with us to support your staff and patients at scale. Start with a free discovery call.
            </p>
            <a className="mkt-btn mkt-btn-ghost" href="#relief">
              Book a Relief Call →
            </a>
          </div>
        </div>

        <div className="mkt-stat-row" aria-label="Key statistics">
          {STATS.map((stat) => (
            <div key={stat.label} className="mkt-stat-card">
              <StatCounter target={stat.target} suffix={stat.suffix} />
              <p className="mkt-stat-card__label">{stat.label}</p>
              <p className="mkt-stat-card__source">{stat.source}</p>
            </div>
          ))}
        </div>

        <div className="mkt-ask-bar">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input type="text" placeholder="Tell us what you need handled…" aria-label="Concierge request" />
          <a href="#request" className="mkt-btn mkt-btn-primary">
            Request
          </a>
        </div>
        <div className="mkt-ask-tags" aria-label="Service categories">
          {ASK_TAGS.map((tag) => (
            <span key={tag} className="mkt-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
