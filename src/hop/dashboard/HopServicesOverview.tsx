import { Link } from 'react-router-dom'
import { SERVICES } from '../../site/services'

export function HopServicesOverview() {
  return (
    <div>
      <p className="hop-dash-eyebrow">What&apos;s covered</p>
      <h2 className="hop-dash-title">
        Every need. <span className="hop-dash-gradient">One gateway.</span>
      </h2>
      <p className="hop-dash-sub">The categories HOP concierges handle every day.</p>

      <div className="hop-dash-svc-grid">
        {SERVICES.map((service) => (
          <div key={service.id} className="hop-dash-svc-card">
            <span className="hop-dash-svc-card__icon" aria-hidden="true">
              {service.icon}
            </span>
            <h3 className="hop-dash-svc-card__title">{service.title}</h3>
            <p className="hop-dash-svc-card__desc">{service.desc}</p>
          </div>
        ))}
      </div>

      <Link to="/hop/app/requests" className="hop-btn-primary">
        Submit a request →
      </Link>
    </div>
  )
}
