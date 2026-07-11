import { Fragment } from 'react'

const STEPS = [
  { num: '01', icon: '⚡', title: 'Request once', desc: 'Text, call, or tap. One message covers rides, errands, prescriptions, or anything else.' },
  { num: '02', icon: '🤝', title: 'We coordinate', desc: 'Your dedicated concierge matches the right person, route, or vendor — real humans, not a call center.' },
  { num: '03', icon: '📍', title: 'Live status', desc: "GPS-tracked, documented hand-offs. You'll know it's done before you even think to check." },
  { num: '04', icon: '✓', title: 'Verified done', desc: 'Proof of delivery, hand-off report, and same-day confirmation. Nothing falls through the cracks.' },
] as const

const BEFORE = [
  'Ends a 12-hr shift, still needs to arrange a ride home',
  'Calls 3 apps — none available near the hospital',
  'Skips picking up prescriptions again',
  "Texts family members to coordinate mom's appointment",
  'Gets home exhausted with nothing done',
  'Books tomorrow’s shift dreading the same loop',
] as const

const AFTER = [
  'Taps one request — ride, prescriptions, groceries',
  'Concierge handles everything instantly',
  'Gets live status, no follow-up calls needed',
  'Prescriptions waiting at home on arrival',
  'Family briefed automatically with a hand-off note',
  'Wakes up ready. Books next shift without hesitation.',
] as const

export function HowItWorks() {
  return (
    <section className="mkt-how" id="how" aria-labelledby="how-heading">
      <div className="mkt-how__inner">
        <p className="mkt-eyebrow">How it works</p>
        <h2 id="how-heading" className="mkt-section-title">
          One request. <span className="mkt-gradient-text">Consider it handled.</span>
        </h2>
        <p className="mkt-section-sub" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
          Four steps. Zero follow-up needed.
        </p>

        <div className="mkt-steps-row">
          {STEPS.map((step, i) => (
            <Fragment key={step.num}>
              <div className="mkt-step">
                <div className="mkt-step__icon">{step.icon}</div>
                <div className="mkt-step__num">{step.num}</div>
                <h3 className="mkt-step__title">{step.title}</h3>
                <p className="mkt-step__desc">{step.desc}</p>
              </div>
              {i < STEPS.length - 1 && <div className="mkt-step__connector" aria-hidden="true" />}
            </Fragment>
          ))}
        </div>

        <div className="mkt-ba-grid">
          <div className="mkt-ba-card mkt-ba-card--before">
            <div className="mkt-ba-card__hd">
              <span>⚠</span>
              <span>Without The Concierge</span>
            </div>
            <ul className="mkt-ba-list">
              {BEFORE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="mkt-ba-card mkt-ba-card--after">
            <div className="mkt-ba-card__hd">
              <span>✓</span>
              <span>With The Concierge</span>
            </div>
            <ul className="mkt-ba-list">
              {AFTER.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
