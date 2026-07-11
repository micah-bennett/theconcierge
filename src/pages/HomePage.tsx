import type { CSSProperties, ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { AudienceIcon, type AudienceIconType } from '../components/AudienceIcon'
import { OFFICE_PHONE_DISPLAY, OFFICE_PHONE_TEL } from '../site'

const HERO_IMAGE = '/hero-home.png'

const HOME_HIGHLIGHTS_LEFT = [
  '24/7 VIP Availability',
  'Your time, reclaimed',
  'Same-day capable',
] as const

const HOME_HIGHLIGHTS_RIGHT = [
  'Hudson Valley Based',
  'Discreet & trusted',
  'Dedicated to you',
] as const

const HOME_AUDIENCES: ReadonlyArray<{
  icon: AudienceIconType
  title: string
  quote: string
}> = [
  {
    icon: 'healthcare',
    title: 'For Healthcare Professionals',
    quote: "We handle life's logistics while you focus on patient care.",
  },
  {
    icon: 'families',
    title: 'For Busy Families',
    quote: 'More family time. Less running around.',
  },
  {
    icon: 'business',
    title: 'For Businesses',
    quote: 'Workplace concierge solutions that support employees and impress clients.',
  },
  {
    icon: 'seniors',
    title: 'For Seniors',
    quote: 'Reliable support with dignity and care.',
  },
]

// How It Works steps
const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'You Request',
    desc: 'One call, text, or message. Tell us what you need — big or small.',
  },
  {
    step: '02',
    title: 'We Coordinate',
    desc: 'We handle scheduling, vendors, logistics, and all the details.',
  },
  {
    step: '03',
    title: 'You Get Time Back',
    desc: 'Tasks handled. Peace of mind restored. Time for what matters most.',
  },
] as const

// Service card icons
function IconArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="12" x2="20" y2="12" />
      <polyline points="14,6 20,12 14,18" />
    </svg>
  )
}

function IconDiamond() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12,2 22,12 12,22 2,12" />
    </svg>
  )
}

function IconStar() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function IconCross() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  )
}

// Service cards
const HOME_SERVICES: ReadonlyArray<{
  Icon: ComponentType
  title: string
  desc: string
  href: string
}> = [
  {
    Icon: IconArrow,
    title: 'Transportation',
    desc: "Airport runs, appointments, errands — we drive so you don't have to.",
    href: '/personal-services',
  },
  {
    Icon: IconDiamond,
    title: 'Delivery & Errands',
    desc: 'Same-day pickup, drop-off, and errand runs across the Hudson Valley.',
    href: '/personal-services',
  },
  {
    Icon: IconStar,
    title: 'Concierge',
    desc: 'Reservations, planning, coordination — your personal lifestyle assistant.',
    href: '/personal-services',
  },
  {
    Icon: IconCross,
    title: 'Healthcare Concierge',
    desc: 'HOP transport, patient support, and healthcare logistics.',
    href: '/hop',
  },
]

// Trust bar items
const HOME_TRUST = [
  { headline: 'Hundreds of Requests Handled', subtext: 'Everyday tasks to complex logistics' },
  { headline: 'Founded in 2012', subtext: 'Serving the Hudson Valley for over a decade' },
  { headline: 'Always Available', subtext: '24/7 VIP support, whenever you need it' },
] as const

export function HomePage() {
  return (
    <section className="slide slide--home" id="home" aria-label="Welcome">

      {/* Hero */}
      <div className="home-hero home-hero--split">
        <div className="home-hero__media motion-enter">
          <img
            className="home-hero__img"
            src={HERO_IMAGE}
            alt="Hudson Valley concierge — professional lifestyle support"
            width={1200}
            height={1800}
            decoding="async"
            fetchPriority="high"
          />
        </div>
        <div className="home-hero__content">
          <p className="home-hero__eyebrow motion-enter motion-enter--delay-1">Hudson Valley, NY</p>
          <h1 className="home-hero__headline motion-enter motion-enter--delay-2">Get Your Time Back.</h1>
          <p className="home-hero__lead motion-enter motion-enter--delay-3">
            Concierge support for busy professionals, healthcare teams, families, and businesses
            throughout the Hudson Valley.
          </p>
          <div className="home-hero__action motion-enter motion-enter--delay-4">
            <p className="home-hero__punch">One call. Handled.</p>
            <a className="home-hero__cta" href={`tel:${OFFICE_PHONE_TEL}`}>
              Get Started — {OFFICE_PHONE_DISPLAY}
            </a>
          </div>
          <div className="home-hero__highlights motion-reveal motion-reveal--delay-2" aria-label="Why The Concierge">
            <ul className="home-hero__highlights-col">
              {HOME_HIGHLIGHTS_LEFT.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <ul className="home-hero__highlights-col">
              {HOME_HIGHLIGHTS_RIGHT.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="home-how" aria-labelledby="home-how-heading">
        <div className="home-how__inner">
          <h2 id="home-how-heading" className="home-how__label motion-reveal">
            How It Works
          </h2>
          <ol className="home-how__steps">
            {HOW_IT_WORKS_STEPS.map((item, i) => (
              <li
                key={item.step}
                className="home-how__step motion-reveal"
                style={{ '--motion-delay': `${80 + i * 120}ms` } as CSSProperties}
              >
                <span className="home-how__step-num" aria-hidden="true">{item.step}</span>
                <h3 className="home-how__step-title">{item.title}</h3>
                <p className="home-how__step-desc">{item.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Service Cards */}
      <div className="home-services" aria-labelledby="home-services-heading">
        <div className="home-services__inner">
          <h2 id="home-services-heading" className="home-services__label motion-reveal">
            What We Handle
          </h2>
          <ul className="home-services__grid">
            {HOME_SERVICES.map((service, i) => (
              <li
                key={service.title}
                className="home-services__card motion-reveal"
                style={{ '--motion-delay': `${60 + i * 80}ms` } as CSSProperties}
              >
                <Link to={service.href} className="home-services__card-link">
                  <span className="home-services__icon">
                    <service.Icon />
                  </span>
                  <h3 className="home-services__card-title">{service.title}</h3>
                  <p className="home-services__card-desc">{service.desc}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Trust Bar */}
      <div className="home-stats motion-reveal" aria-label="Why clients trust us">
        <div className="home-stats__inner">
          {HOME_TRUST.map((item, i) => (
            <div
              key={item.headline}
              className="home-stats__item motion-reveal"
              style={{ '--motion-delay': `${60 + i * 100}ms` } as CSSProperties}
            >
              <p className="home-stats__headline">{item.headline}</p>
              <p className="home-stats__subtext">{item.subtext}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Who We Serve */}
      <div className="home-audiences motion-reveal" aria-labelledby="home-audiences-heading">
        <div className="home-audiences__content">
          <h2 id="home-audiences-heading" className="home-audiences__heading motion-reveal motion-reveal--delay-1">
            Who we serve
          </h2>
          <ul className="home-audiences__list">
            {HOME_AUDIENCES.map((audience, index) => (
              <li
                key={audience.title}
                className="home-audiences__item motion-reveal"
                style={{ '--motion-delay': `${120 + index * 90}ms` } as CSSProperties}
              >
                <AudienceIcon type={audience.icon} className="home-audiences__icon" />
                <div className="home-audiences__item-body">
                  <h3 className="home-audiences__item-title">{audience.title}</h3>
                  <p className="home-audiences__item-desc">{audience.quote}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </section>
  )
}
