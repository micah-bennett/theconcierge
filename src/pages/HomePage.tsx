import type { CSSProperties, ComponentType } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeCheck,
  Car,
  ConciergeBell,
  HeartPulse,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { AudienceIcon, type AudienceIconType } from '../components/AudienceIcon'
import { TeamBand } from '../components/TeamBand'
import { OFFICE_PHONE_DISPLAY, OFFICE_PHONE_TEL } from '../site'

/** Team photography, not a solo portrait — the brand leads with the bench. */
const HERO_IMAGE = '/hero-team-2000.webp'
const HERO_SRCSET = '/hero-team-900.webp 900w, /hero-team-2000.webp 1717w'

const HOME_HIGHLIGHTS = [
  '24/7 VIP availability',
  'Same-day capable',
  'Hudson Valley based',
  'Discreet & trusted',
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
    desc: 'Our team handles scheduling, vendors, logistics, and all the details.',
  },
  {
    step: '03',
    title: 'You Get Time Back',
    desc: 'Tasks handled. Peace of mind restored. Time for what matters most.',
  },
] as const

const HOME_SERVICES: ReadonlyArray<{
  Icon: ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>
  title: string
  desc: string
  href: string
}> = [
  {
    Icon: Car,
    title: 'Transportation',
    desc: "Airport runs, appointments, errands — we drive so you don't have to.",
    href: '/personal-services',
  },
  {
    Icon: Package,
    title: 'Delivery & Errands',
    desc: 'Same-day pickup, drop-off, and errand runs across the Hudson Valley.',
    href: '/personal-services',
  },
  {
    Icon: ConciergeBell,
    title: 'Concierge',
    desc: 'Reservations, planning, coordination — your personal lifestyle assistant.',
    href: '/personal-services',
  },
  {
    Icon: HeartPulse,
    title: 'Healthcare Concierge',
    desc: 'HOP transport, patient support, and healthcare logistics.',
    href: '/hop',
  },
]

/** Credentials, not vibes. Copy mirrors the certifications in src/site/services.ts. */
const HOME_TRUST: ReadonlyArray<{
  Icon: ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>
  headline: string
  subtext: string
}> = [
  {
    Icon: BadgeCheck,
    headline: 'CPR, AED & First Aid certified',
    subtext: 'Narcan-trained team members on staff',
  },
  {
    Icon: ShieldCheck,
    headline: 'HIPAA-aware handling',
    subtext: 'Discreet courier and patient logistics',
  },
  {
    Icon: Users,
    headline: 'A full team, not one person',
    subtext: 'Coverage that does not depend on one calendar',
  },
  {
    Icon: MapPin,
    headline: 'Serving the Hudson Valley',
    subtext: 'Local since 2012, hundreds of requests handled',
  },
]

export function HomePage() {
  return (
    <section className="slide slide--home" id="home" aria-label="Welcome">
      {/* Hero — full-bleed team photography.
          NOTE: the .home-hero__media / .home-hero__img class pair is load-bearing.
          useSiteMotion.initHeroParallax() queries exactly those selectors to drive
          the scroll parallax; renaming either silently disables it. */}
      <div className="home-hero home-hero--full">
        <div className="home-hero__media motion-enter">
          <img
            className="home-hero__img"
            src={HERO_IMAGE}
            srcSet={HERO_SRCSET}
            sizes="100vw"
            alt="The Concierge team at the Hudson Valley office"
            width={1717}
            height={916}
            decoding="async"
            loading="eager"
            fetchPriority="high"
          />
        </div>
        <div className="home-hero__inner">
          <div className="home-hero__content">
            <p className="home-hero__eyebrow motion-enter motion-enter--delay-1">Hudson Valley, NY</p>
            <h1 className="home-hero__headline motion-enter motion-enter--delay-2">
              Get Your Time Back.
            </h1>
            <p className="home-hero__lead motion-enter motion-enter--delay-3">
              A full concierge team supporting busy professionals, healthcare staff, families, and
              businesses throughout the Hudson Valley.
            </p>
            <div className="home-hero__action motion-enter motion-enter--delay-4">
              <a className="home-hero__cta" href={`tel:${OFFICE_PHONE_TEL}`}>
                <Phone size={17} strokeWidth={2} aria-hidden />
                {OFFICE_PHONE_DISPLAY}
              </a>
              <Link className="home-hero__cta home-hero__cta--ghost" to="/request">
                Request service
              </Link>
            </div>
            <ul
              className="home-hero__highlights motion-enter motion-enter--delay-4"
              aria-label="Why The Concierge"
            >
              {HOME_HIGHLIGHTS.map((item) => (
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
                <span className="home-how__step-num" aria-hidden="true">
                  {item.step}
                </span>
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
                    <service.Icon size={24} strokeWidth={1.5} aria-hidden />
                  </span>
                  <h3 className="home-services__card-title">{service.title}</h3>
                  <p className="home-services__card-desc">{service.desc}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* The team — the brand answer: this is a company, not one person. */}
      <TeamBand />

      {/* Credentials */}
      <div className="home-stats" aria-label="Credentials">
        <div className="home-stats__inner">
          {HOME_TRUST.map((item, i) => (
            <div
              key={item.headline}
              className="home-stats__item motion-reveal"
              style={{ '--motion-delay': `${60 + i * 100}ms` } as CSSProperties}
            >
              <span className="home-stats__icon">
                <item.Icon size={20} strokeWidth={1.5} aria-hidden />
              </span>
              <p className="home-stats__headline">{item.headline}</p>
              <p className="home-stats__subtext">{item.subtext}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Who We Serve */}
      <div className="home-audiences motion-reveal" aria-labelledby="home-audiences-heading">
        <div className="home-audiences__content">
          <h2
            id="home-audiences-heading"
            className="home-audiences__heading motion-reveal motion-reveal--delay-1"
          >
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

      {/* Closing CTA — the page previously just stopped with no ask. */}
      <div className="home-cta motion-reveal" aria-labelledby="home-cta-heading">
        <div className="home-cta__inner">
          <p className="tc-eyebrow">Tell us what you need</p>
          <h2 className="home-cta__title" id="home-cta-heading">
            One call. Handled.
          </h2>
          <p className="home-cta__lead">
            Tell us what is on your plate and our team will take it from there — one request, one
            point of contact, handled end to end.
          </p>
          <div className="home-cta__actions">
            <a className="home-hero__cta" href={`tel:${OFFICE_PHONE_TEL}`}>
              <Phone size={17} strokeWidth={2} aria-hidden />
              {OFFICE_PHONE_DISPLAY}
            </a>
            <Link className="home-hero__cta home-hero__cta--ghost" to="/request">
              Request service
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
