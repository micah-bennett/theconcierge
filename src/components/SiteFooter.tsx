import { Link, NavLink } from 'react-router-dom'
import { Phone } from 'lucide-react'
import { SOCIAL_LINKS } from '../site/contact'
import { OFFICE_PHONE_DISPLAY, OFFICE_PHONE_TEL } from '../site'

const SERVICE_LINKS = [
  { to: '/personal-services', label: 'Personal services' },
  { to: '/hop', label: 'HOP — healthcare concierge' },
  { to: '/plans', label: 'Plans & membership' },
  { to: '/request', label: 'Request service' },
] as const

const COMPANY_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/contact', label: 'Contact' },
  { to: '/hop/login', label: 'HOP member login' },
] as const

export function SiteFooter() {
  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <img
            className="site-footer__mark"
            src="/logo-mark-white.png?v=1"
            alt=""
            width={48}
            height={48}
            loading="lazy"
            decoding="async"
          />
          <p className="site-footer__name">The Concierge</p>
          <p className="site-footer__tagline">People · Support · A Better Tomorrow</p>
          <a className="site-footer__phone" href={`tel:${OFFICE_PHONE_TEL}`}>
            <Phone size={16} strokeWidth={2} aria-hidden />
            {OFFICE_PHONE_DISPLAY}
          </a>
        </div>

        <nav className="site-footer__col" aria-labelledby="footer-services-heading">
          <h2 className="site-footer__col-title" id="footer-services-heading">
            Services
          </h2>
          <ul className="site-footer__list">
            {SERVICE_LINKS.map((item) => (
              <li key={item.to}>
                <Link className="site-footer__link" to={item.to}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="site-footer__col" aria-labelledby="footer-company-heading">
          <h2 className="site-footer__col-title" id="footer-company-heading">
            Company
          </h2>
          <ul className="site-footer__list">
            {COMPANY_LINKS.map((item) => (
              <li key={item.to}>
                <NavLink className="site-footer__link" to={item.to}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-footer__col">
          <h2 className="site-footer__col-title" id="footer-social-heading">
            Connect
          </h2>
          <ul className="site-footer__list" aria-labelledby="footer-social-heading">
            {SOCIAL_LINKS.map((item) => (
              <li key={item.id}>
                <a
                  className="site-footer__link"
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${item.label} — ${item.handle}`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* The one place the parent entity is named — the brand reads as
          standalone everywhere else on the site. */}
      <div className="site-footer__legal">
        <p>
          © {new Date().getFullYear()} The Concierge · Hudson Valley Concierge Service LLC
        </p>
        <p>Serving the Hudson Valley, New York</p>
      </div>
    </footer>
  )
}
