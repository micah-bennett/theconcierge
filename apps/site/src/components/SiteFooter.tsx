import { Link } from 'react-router-dom'
import { HopBrand } from './HopBrand'

const FOOTER_LINKS = [
  { to: '/organizations', label: 'Organizations' },
  { to: '/professionals', label: 'Professionals' },
  { to: '/concierge', label: 'The Concierge' },
  { to: '/portal', label: 'HOP Portal' },
  { to: '/contact', label: 'Contact' },
] as const

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
          </nav>
        </div>
        <p className="hs-footer__note">
          © {new Date().getFullYear()} HOP — Hospitality On-Site Professionals. A standalone
          hospitality and support brand.
        </p>
      </div>
    </footer>
  )
}
