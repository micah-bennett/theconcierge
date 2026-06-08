import type { CSSProperties } from 'react'
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

export function HomePage() {
  return (
    <section className="slide slide--home" id="home" aria-label="Welcome">
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
