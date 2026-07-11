import { Link } from 'react-router-dom'
import { SERVICES } from '../../site/services'

export function Services() {
  return (
    <section className="mkt-services" id="services" aria-labelledby="services-heading">
      <div className="mkt-services__inner">
        <p className="mkt-eyebrow">What&apos;s covered</p>
        <h2 id="services-heading" className="mkt-section-title">
          Every need. <span className="mkt-gradient-text">One gateway.</span>
        </h2>
        <p className="mkt-section-sub">
          A real concierge takes it from submission to done — for individuals, families, and facilities alike.
        </p>

        <div className="mkt-services__grid">
          {SERVICES.map((service) => (
            <article
              key={service.id}
              id={service.anchor}
              className={`mkt-svc-card${service.featured ? ' mkt-svc-card--featured' : ''}`}
            >
              <div className="mkt-svc-card__icon-wrap">{service.icon}</div>
              <span className="mkt-svc-card__tag">{service.tag}</span>
              <h3 className="mkt-svc-card__title">{service.title}</h3>
              <p className="mkt-svc-card__desc">{service.desc}</p>
              <ul className="mkt-svc-card__list">
                {service.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link className="mkt-svc-card__link" to="/contact">
                Request a consult →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
