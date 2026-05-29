import { Link } from 'react-router-dom'
import { COMPANY_CONTACT, SOCIAL_LINKS, type SocialPlatform } from '../site/contact'

function SocialIcon({ platform }: { platform: SocialPlatform }) {
  switch (platform) {
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden>
          <path
            fill="currentColor"
            d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
          />
        </svg>
      )
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden>
          <path
            fill="currentColor"
            d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM6.977 20.452H3.695V9h3.282v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
          />
        </svg>
      )
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden>
          <path
            fill="currentColor"
            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
          />
        </svg>
      )
  }
}

export function ContactPage() {
  return (
    <section className="slide slide--contact" aria-labelledby="contact-page-heading">
      <div className="contact-page">
        <header className="contact-page__intro">
          <p className="contact-page__eyebrow">Hudson Valley, NY</p>
          <h1 className="contact-page__title" id="contact-page-heading">
            Contact
          </h1>
          <p className="contact-page__lead">
            Call, email, or connect on social — we respond quickly and discreetly. Prefer a callback?
            Submit a request and our team will reach out.
          </p>
        </header>

        <div className="contact-page__channels">
          <a className="contact-phone-card" href={`tel:${COMPANY_CONTACT.phoneTel}`}>
            <span className="contact-phone-card__label">Call us</span>
            <span className="contact-phone-card__number">{COMPANY_CONTACT.phoneDisplay}</span>
            <span className="contact-phone-card__hint">Tap to call · 24/7 VIP availability</span>
          </a>

          <div className="contact-action-row">
            <a className="contact-action" href={COMPANY_CONTACT.emailHref}>
              <span className="contact-action__label">Email</span>
              <span className="contact-action__value">{COMPANY_CONTACT.email}</span>
            </a>
            <Link className="contact-action contact-action--gold" to="/request">
              <span className="contact-action__label">Request service</span>
              <span className="contact-action__value">We&apos;ll call you back</span>
            </Link>
          </div>
        </div>

        <section className="contact-social" aria-labelledby="contact-social-heading">
          <h2 className="contact-social__title" id="contact-social-heading">
            Follow us
          </h2>
          <p className="contact-social__lead">
            Stay connected for service updates, tips, and Hudson Valley concierge news.
          </p>
          <ul className="contact-social__grid">
            {SOCIAL_LINKS.map((item) => (
              <li key={item.id}>
                <a
                  className={`contact-social-card contact-social-card--${item.id}`}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="contact-social-card__icon">
                    <SocialIcon platform={item.id} />
                  </span>
                  <span className="contact-social-card__body">
                    <span className="contact-social-card__platform">{item.label}</span>
                    <span className="contact-social-card__handle">{item.handle}</span>
                    <span className="contact-social-card__blurb">{item.blurb}</span>
                  </span>
                  <span className="contact-social-card__arrow" aria-hidden>
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <footer className="contact-page__meta">
          <p className="contact-page__company">{COMPANY_CONTACT.name}</p>
          <address className="contact-page__address">
            {COMPANY_CONTACT.addressLine1}
            <br />
            {COMPANY_CONTACT.addressLine2}
          </address>
          <a
            className="contact-page__web"
            href={COMPANY_CONTACT.webHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            {COMPANY_CONTACT.webLabel}
          </a>
        </footer>
      </div>
    </section>
  )
}
