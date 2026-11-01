import { Link } from 'react-router-dom'
import { HopBrand } from './HopBrand'
import { PHONE_DIGITS, PHONE_DISPLAY, PHONE_HREF } from '../site/contact'

const FOOTER_LINKS = [
  { to: '/healthcare', label: 'Healthcare' },
  { to: '/organizations', label: 'Organizations' },
  { to: '/concierge', label: 'Concierge' },
  { to: '/portal', label: 'HOP Portal' },
  { to: '/contact', label: 'Contact' },
] as const

const BLOG_URL = 'https://blog.hopserves.com'

export function SiteFooter() {
  return (
    <footer className="hs-footer">
      <div className="hs-container">
        <div className="hs-footer__grid">
          <Link className="hs-brand" to="/" aria-label="HOP Home">
            <HopBrand variant="white" />
          </Link>
          <nav className="hs-footer__links" aria-label="Footer">
            {FOOTER_LINKS.map((item) => (
              <Link key={item.to} to={item.to}>
                {item.label}
              </Link>
            ))}
            <a href={BLOG_URL}>Blog</a>
          </nav>
        </div>
        <p className="hs-footer__phone">
          Call HOP at{' '}
          <a href={PHONE_HREF} aria-label={`Call HOP at ${PHONE_DIGITS}`}>
            {PHONE_DISPLAY}
          </a>{' '}
          <span>{PHONE_DIGITS}</span>
        </p>
        <p className="hs-footer__note">
          © {new Date().getFullYear()} HOP — Hospitality On-Site Professionals. A standalone
          hospitality and support brand.
        </p>
      </div>
    </footer>
  )
}
