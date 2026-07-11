import { Link } from 'react-router-dom'

type Props = {
  open: boolean
  onClose: () => void
}

export function MobileNavDrawer({ open, onClose }: Props) {
  return (
    <div className={`mkt-drawer${open ? ' mkt-drawer--open' : ''}`} aria-hidden={!open}>
      <a className="mkt-drawer__link" href="/#problem" onClick={onClose}>
        The Problem
      </a>
      <a className="mkt-drawer__link" href="/#how" onClick={onClose}>
        How It Works
      </a>
      <a className="mkt-drawer__link" href="/#services" onClick={onClose}>
        Services
      </a>
      <Link className="mkt-drawer__link" to="/personal-services" onClick={onClose}>
        Personal Services
      </Link>
      <Link className="mkt-drawer__link" to="/plans" onClick={onClose}>
        Plans
      </Link>
      <a className="mkt-drawer__link" href="/#hop" onClick={onClose}>
        HOP
      </a>
      <Link className="mkt-drawer__link" to="/contact" onClick={onClose}>
        Contact
      </Link>
      <Link className="mkt-btn mkt-btn-primary mkt-drawer__cta" to="/hop/login" onClick={onClose}>
        Launch HOP
      </Link>
      <a className="mkt-btn mkt-btn-outline-cyan mkt-drawer__cta" href="/#request" onClick={onClose}>
        Place a Request
      </a>
    </div>
  )
}
