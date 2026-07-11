import { Link } from 'react-router-dom'
import { SOCIAL_LINKS } from '../site/contact'
import { OFFICE_PHONE_DISPLAY, OFFICE_PHONE_TEL } from '../site'

const LOGO_IMAGE = '/logo-mark-white.png?v=1'

export function SiteFooter() {
  return (
    <footer className="mkt-footer" aria-label="Site footer">
      <div className="mkt-footer__inner">
        <div className="mkt-footer__brand">
          <img src={LOGO_IMAGE} alt="" width={32} height={32} decoding="async" aria-hidden="true" />
          <div>
            <p className="mkt-footer__brand-name">THE CONCIERGE</p>
            <p className="mkt-footer__brand-sub">Hudson Valley Concierge Service LLC · Est. 2011</p>
          </div>
        </div>

        <nav className="mkt-footer__nav" aria-label="Footer navigation">
          <a href="/#problem">The Problem</a>
          <a href="/#how">How It Works</a>
          <a href="/#services">Services</a>
          <Link to="/personal-services">Personal Services</Link>
          <Link to="/plans">Plans</Link>
          <a href="/#about">About</a>
          <a href="/#request">Place a Request</a>
          <Link to="/contact">Contact</Link>
        </nav>

        <ul className="mkt-footer__social" aria-label="Social media">
          {SOCIAL_LINKS.map((item) => (
            <li key={item.id}>
              <a href={item.href} target="_blank" rel="noopener noreferrer" aria-label={`${item.label} — ${item.handle}`}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <a href={`tel:${OFFICE_PHONE_TEL}`}>{OFFICE_PHONE_DISPLAY}</a>
        <p className="mkt-footer__copy">
          © {new Date().getFullYear()} Hudson Valley Concierge Service LLC · theconcierge.life · All rights reserved.
        </p>
      </div>
    </footer>
  )
}
