import { Link } from 'react-router-dom'

const FEATURE_CARDS = [
  {
    icon: '⚙️',
    title: 'Single Gateway',
    desc: 'One request dispatches transport, pharmacy pickup, meal delivery, errands, and more — no juggling five different apps.',
  },
  {
    icon: '📈',
    title: 'Staff Wellness Dashboard',
    desc: 'Real-time visibility into staff utilization and wellbeing trends. See who needs support before burnout hits.',
  },
  {
    icon: '📋',
    title: 'Admin Analytics',
    desc: 'Hospital administrators get a live data view: retention impact, service utilization, and logistics gap mapping.',
  },
  {
    icon: '🚐',
    title: 'HVCS Transport Integration',
    desc: 'Every transport request routes seamlessly to our official partner, HVCS Transportation — fully insured, always on call.',
  },
] as const

const STATS = [
  { num: '1', label: 'app replaces the ride, meal, errand & wellness apps' },
  { num: '3×', label: 'higher retention among supported staff' },
  { num: '42%', label: 'of nurses report burnout industry-wide' },
  { num: '$4.6B', label: 'lost annually to preventable turnover' },
] as const

export function HopTeaser() {
  return (
    <section className="home-hop-section" id="hop" aria-labelledby="hop-heading">
      <div className="home-hop-section__inner">
        <p className="mkt-eyebrow">Two Ways to Work With Us</p>
        <h2 id="hop-heading" className="home-hop-heading">
          Website or App —<br />
          <em className="mkt-gradient-text" style={{ fontStyle: 'normal' }}>
            your choice.
          </em>
        </h2>

        <div className="home-hop-explainer">
          <div className="home-hop-explainer__card">
            <span>🌐</span>
            <div>
              <strong>Using the website (you&apos;re here)</strong>
              <p>Browse services, get information, and place one-time requests directly — no account, no download.</p>
            </div>
          </div>
          <div className="home-hop-divider">vs.</div>
          <div className="home-hop-explainer__card home-hop-explainer__card--app">
            <span>📲</span>
            <div>
              <strong>HOP — for ongoing users</strong>
              <p>Healthcare professionals and facility staff who need concierge support regularly use HOP for that.</p>
            </div>
          </div>
        </div>

        <div className="home-hop-grid">
          {FEATURE_CARDS.map((card) => (
            <div key={card.title} className="home-hop-card">
              <span className="home-hop-card__icon">{card.icon}</span>
              <h3 className="home-hop-card__title">{card.title}</h3>
              <p className="home-hop-card__desc">{card.desc}</p>
            </div>
          ))}
        </div>

        <div className="home-hop-cta-row">
          <Link to="/hop/login" className="mkt-btn mkt-btn-primary">
            Launch HOP →
          </Link>
          <a href="/#relief" className="mkt-btn mkt-btn-ghost">
            Book a demo for your facility
          </a>
        </div>

        <div className="home-hop-stats">
          {STATS.map((stat) => (
            <div key={stat.label} className="home-hop-stat">
              <span className="home-hop-stat__num">{stat.num}</span>
              <span className="home-hop-stat__label">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
