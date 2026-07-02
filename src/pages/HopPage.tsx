import type { CSSProperties } from 'react'
import { OFFICE_PHONE_DISPLAY, OFFICE_PHONE_TEL } from '../site'

const HOP_SERVICES: readonly {
  title: string
  body: string
  icon: React.ReactNode
}[] = [
  {
    title: 'Transportation Coordination',
    body: 'Ride scheduling, patient transport, and family logistics — handled before your staff ever has to think about it.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v7a2 2 0 0 1-2 2h-2" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
        <path d="M9 17h6" />
      </svg>
    ),
  },
  {
    title: 'Prescription Pickup',
    body: 'Pharmacy runs dispatched on demand. Medications picked up and delivered so patients and families don\'t have to wait.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M9 12h6M12 9v6" />
      </svg>
    ),
  },
  {
    title: 'Food & Grocery Support',
    body: 'Meal pickup, grocery delivery, and nutrition coordination for patients, families, and staff — without pulling a nurse off the floor.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    title: 'Deliveries & Errands',
    body: 'Documents, supplies, personal items, and anything else that needs to move — picked up and dropped off on your timeline.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 10H3M21 10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2M21 10l-4-7H7l-4 7" />
        <circle cx="7" cy="17" r="1" />
        <circle cx="17" cy="17" r="1" />
      </svg>
    ),
  },
  {
    title: 'Urgent Concierge Requests',
    body: 'Same-day, immediate response for time-sensitive needs. When something can\'t wait, HOP moves first.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    title: 'Patient & Family Support',
    body: 'Help families navigate logistics — lodging, meals, errands — so they can focus on their loved ones and your staff can focus on care.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
]

const HOP_STEPS = [
  {
    number: '01',
    title: 'Submit a Request',
    body: 'Your team calls or contacts HOP. Takes sixty seconds. No forms, no friction.',
  },
  {
    number: '02',
    title: 'HOP Dispatches',
    body: 'A dedicated HVCS concierge picks it up and handles everything start to finish.',
  },
  {
    number: '03',
    title: 'Handled.',
    body: 'Your staff stays focused on patient care. We close the loop and confirm completion.',
  },
]

const HOP_FOR = [
  'Hospitals & health systems',
  'Outpatient clinics',
  'Private practices',
  'Nursing & rehabilitation facilities',
  'Home health agencies',
  'Hospice care teams',
]

export function HopPage() {
  return (
    <section className="slide slide--hop" aria-labelledby="hop-page-heading">
      <div className="hop-page">

        {/* Hero */}
        <header className="hop-hero motion-reveal">
          <p className="hop-hero__eyebrow motion-reveal motion-reveal--delay-1">
            Healthcare Concierge by HVCS
          </p>
          <h1 className="hop-hero__headline motion-reveal motion-reveal--delay-2" id="hop-page-heading">
            Your Team Gives Everything.<br />
            <span className="hop-hero__headline-accent">Let HOP Handle the Rest.</span>
          </h1>
          <p className="hop-hero__lead motion-reveal motion-reveal--delay-3">
            HOP is a concierge support program powered by Hudson Valley Concierge Service. We handle
            the non-clinical logistics — transportation, prescriptions, food, deliveries, and urgent
            errands — so healthcare professionals can stay focused on what matters most: patient care.
          </p>
          <a
            className="hop-hero__cta motion-reveal motion-reveal--delay-3"
            href={`tel:${OFFICE_PHONE_TEL}`}
          >
            Partner with HOP — {OFFICE_PHONE_DISPLAY}
          </a>
        </header>

        {/* Problem callout */}
        <div className="hop-problem motion-reveal motion-reveal--delay-1">
          <p className="hop-problem__label">The Problem</p>
          <p className="hop-problem__statement">
            Healthcare staff spend hours each week on non-clinical logistics — coordinating rides,
            chasing prescriptions, managing family requests. Every minute spent on errands is a minute
            away from patient care. HOP removes that burden entirely.
          </p>
        </div>

        {/* What HOP handles */}
        <section className="hop-services" aria-labelledby="hop-services-heading">
          <h2 className="plans-page__title" id="hop-services-heading">
            What HOP Handles
          </h2>
          <div className="hop-services__grid">
            {HOP_SERVICES.map((service, index) => (
              <article
                key={service.title}
                className="hop-card motion-reveal motion-lift"
                style={{ '--motion-delay': `${80 + index * 70}ms` } as CSSProperties}
              >
                <div className="hop-card__icon" aria-hidden>
                  {service.icon}
                </div>
                <h3 className="hop-card__title">{service.title}</h3>
                <p className="hop-card__body">{service.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="hop-how" aria-labelledby="hop-how-heading">
          <h2 className="plans-page__title" id="hop-how-heading">
            How It Works
          </h2>
          <div className="hop-how__steps">
            {HOP_STEPS.map((step, index) => (
              <div
                key={step.number}
                className="hop-step motion-reveal motion-lift"
                style={{ '--motion-delay': `${80 + index * 100}ms` } as CSSProperties}
              >
                <span className="hop-step__number">{step.number}</span>
                <h3 className="hop-step__title">{step.title}</h3>
                <p className="hop-step__body">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Who it's for */}
        <section className="hop-for motion-reveal" aria-labelledby="hop-for-heading">
          <h2 className="plans-page__title" id="hop-for-heading">
            Who It&apos;s For
          </h2>
          <ul className="hop-for__list">
            {HOP_FOR.map((item, index) => (
              <li
                key={item}
                className="hop-for__item motion-reveal"
                style={{ '--motion-delay': `${60 + index * 60}ms` } as CSSProperties}
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="contact-block hop-cta" aria-labelledby="hop-cta-heading">
          <p className="hop-cta__eyebrow">Ready to reduce staff burnout?</p>
          <h3 className="contact-block__title" id="hop-cta-heading">
            Call to learn how HOP can support your team
          </h3>
          <a className="contact-block__phone" href={`tel:${OFFICE_PHONE_TEL}`}>
            {OFFICE_PHONE_DISPLAY}
          </a>
        </section>

      </div>
    </section>
  )
}
