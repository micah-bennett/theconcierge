import type { CSSProperties } from 'react'
import { OFFICE_PHONE_DISPLAY, OFFICE_PHONE_TEL } from '../site'

const HOP_CARDS = [
  {
    icon: '⚙',
    title: 'Single Gateway',
    desc: 'One request dispatches transport, pharmacy pickup, meal delivery, errands, and more — your team sends one message and we handle everything.',
  },
  {
    icon: '📈',
    title: 'Staff Wellness Dashboard',
    desc: 'Real-time visibility into staff utilization and wellbeing trends. See where the load is building before burnout happens.',
  },
  {
    icon: '📋',
    title: 'Admin Analytics',
    desc: 'Hospital administrators get a live data view: retention impact, service utilization, logistics gap mapping, and turnover risk scoring.',
  },
  {
    icon: '🚌',
    title: 'HVCS Transport Integration',
    desc: 'Every transport request routes seamlessly to our official partner, HVCS Transport — CPR-certified, insured, and documented.',
  },
] as const

const HOP_STATS = [
  { num: '1', label: 'app replaces 5 disconnected tools' },
  { num: '3×', label: 'higher staff retention when non-clinical needs are supported' },
  { num: '42%', label: 'of nurses report burnout — HOP is built to change that' },
  { num: '$4.6B', label: 'lost annually to nurse turnover in U.S. hospitals' },
] as const

export function HopPage() {
  return (
    <section className="slide slide--hop" aria-labelledby="hop-page-heading">
      <div className="hop-page">

        {/* Eyebrow + Headline */}
        <header className="hop-hero motion-reveal">
          <span className="hop-pill motion-reveal motion-reveal--delay-1">
            Two Ways to Work With Us
          </span>
          <h1 className="hop-headline motion-reveal motion-reveal--delay-2" id="hop-page-heading">
            Website or App —<br />
            <em className="hop-headline__em">your choice.</em>
          </h1>
        </header>

        {/* Path explainer */}
        <div className="hop-paths motion-reveal motion-reveal--delay-1">
          <div className="hop-path-card">
            <span className="hop-path-icon">🌐</span>
            <div>
              <strong className="hop-path-title">Using the website (you&apos;re here)</strong>
              <p className="hop-path-desc">
                Browse services, get information, and place one-time requests directly — no account,
                no download needed. Call or submit a request and we handle it.
              </p>
            </div>
          </div>
          <div className="hop-paths__divider" aria-hidden>vs.</div>
          <div className="hop-path-card hop-path-card--app">
            <span className="hop-path-icon">📱</span>
            <div>
              <strong className="hop-path-title">HOP App — for ongoing users</strong>
              <p className="hop-path-desc">
                Healthcare professionals and facility staff who need concierge support regularly use
                HOP for faster dispatch, wellness tracking, and admin analytics.
              </p>
            </div>
          </div>
        </div>

        {/* Feature cards */}
        <div className="hop-cards">
          {HOP_CARDS.map((card, index) => (
            <article
              key={card.title}
              className="hop-card motion-reveal motion-lift"
              style={{ '--motion-delay': `${80 + index * 70}ms` } as CSSProperties}
            >
              <span className="hop-card__icon" aria-hidden>{card.icon}</span>
              <h3 className="hop-card__title">{card.title}</h3>
              <p className="hop-card__desc">{card.desc}</p>
            </article>
          ))}
        </div>

        {/* CTAs */}
        <div className="hop-ctas motion-reveal">
          <a
            className="hop-cta-primary"
            href="https://hop-pilot-hvcs.pplx.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Try Live App →
          </a>
          <a className="hop-cta-secondary" href={`tel:${OFFICE_PHONE_TEL}`}>
            Book a demo for your facility — {OFFICE_PHONE_DISPLAY}
          </a>
        </div>

        {/* Stat strip */}
        <div className="hop-stats">
          {HOP_STATS.map((stat, index) => (
            <div
              key={stat.num}
              className="hop-stat motion-reveal"
              style={{ '--motion-delay': `${60 + index * 60}ms` } as CSSProperties}
            >
              <span className="hop-stat__num">{stat.num}</span>
              <span className="hop-stat__label">{stat.label}</span>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
