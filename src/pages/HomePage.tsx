import { Link } from 'react-router-dom'
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

export function HomePage() {
  return (
    <section className="slide slide--home" id="home" aria-label="Welcome">
      <div className="home-hero home-hero--split">
        <div className="home-hero__media">
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
          <p className="home-hero__eyebrow">Hudson Valley, NY</p>
          <h1 className="home-hero__headline">
            Concierge Packages for Life, Business, and Everything in Motion
          </h1>
          <p className="home-hero__lead">
            Whether you are managing a household, leading a business, supporting a team, or building
            something of your own, time is one of your most valuable assets.
            <br />
            <br />
            The Concierge provides dependable personal, professional, and business support designed to keep
            your day moving with ease. From everyday errands and scheduling to corporate coordination,
            executive assistance, and high-level lifestyle management, our packages are built around the
            way you live, work, and lead.
          </p>
          <p className="home-hero__punch">One call. Handled.</p>
          <div className="home-hero__cta-row">
            <a className="home-hero__cta" href={`tel:${OFFICE_PHONE_TEL}`}>
              Get Started — {OFFICE_PHONE_DISPLAY}
            </a>
            <Link className="home-hero__cta-secondary" to="/contact">
              Contact &amp; social
            </Link>
          </div>
          <div className="home-hero__highlights" aria-label="Why The Concierge">
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
    </section>
  )
}
