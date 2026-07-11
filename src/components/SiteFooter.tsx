import { NavLink } from 'react-router-dom'
import { SOCIAL_LINKS } from '../site/contact'
import { OFFICE_PHONE_DISPLAY, OFFICE_PHONE_TEL } from '../site'

export function SiteFooter() {
  return (
    <footer className="site-footer" aria-label="Contact and social">
      <div className="site-footer__inner">
        <a className="site-footer__phone" href={`tel:${OFFICE_PHONE_TEL}`}>
          {OFFICE_PHONE_DISPLAY}
        </a>
        <NavLink
          to="/contact"
          className={({ isActive }) =>
            `site-footer__contact-link${isActive ? ' site-footer__contact-link--active' : ''}`
          }
        >
          Contact &amp; social
        </NavLink>
        <ul className="site-footer__social" aria-label="Social media">
          {SOCIAL_LINKS.map((item) => (
            <li key={item.id}>
              <a
                className="site-footer__social-link"
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
    </footer>
  )
}
