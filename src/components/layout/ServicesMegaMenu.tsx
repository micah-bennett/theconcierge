import { Link } from 'react-router-dom'
import { SERVICES } from '../../site/services'

type Props = {
  open: boolean
  onItemClick: () => void
}

export function ServicesMegaMenu({ open, onItemClick }: Props) {
  return (
    <div className={`mkt-mega${open ? ' mkt-mega--open' : ''}`} role="menu" aria-hidden={!open}>
      {SERVICES.map((service) => (
        <a
          key={service.id}
          className="mkt-mega__item"
          href={`/#${service.anchor}`}
          role="menuitem"
          onClick={onItemClick}
        >
          <span className="mkt-mega__icon">{service.icon}</span>
          <span className="mkt-mega__copy">
            <strong>{service.title}</strong>
            <span>{service.megaBlurb}</span>
          </span>
        </a>
      ))}
      <div className="mkt-mega__footer">
        <Link className="mkt-mega__cta" to="/contact" onClick={onItemClick}>
          Book a free consultation →
        </Link>
      </div>
    </div>
  )
}
