const STEPS = [
  { num: '01', icon: '⚡', title: 'Request once', desc: 'One message covers rides, errands, prescriptions, or anything else.' },
  { num: '02', icon: '🤝', title: 'We coordinate', desc: 'Your concierge matches the right person, route, or vendor.' },
  { num: '03', icon: '📍', title: 'Live status', desc: "GPS-tracked, documented hand-offs — you'll know before you check." },
  { num: '04', icon: '✓', title: 'Verified done', desc: 'Proof of delivery and same-day confirmation. Nothing falls through.' },
] as const

const BEFORE = [
  'Ends a 12-hr shift, still needs to arrange a ride home',
  'Calls 3 apps — none available near the hospital',
  'Skips picking up prescriptions again',
  'Gets home exhausted with nothing done',
] as const

const AFTER = [
  'Taps one request — ride, prescriptions, groceries',
  'HOP handles everything instantly',
  'Gets live status, no follow-up calls needed',
  'Wakes up ready. Books next shift without hesitation.',
] as const

export function HopHowItWorks() {
  return (
    <div>
      <p className="hop-dash-eyebrow">How it works</p>
      <h2 className="hop-dash-title">
        One request. <span className="hop-dash-gradient">Consider it handled.</span>
      </h2>

      <div className="hop-dash-steps">
        {STEPS.map((step) => (
          <div key={step.num} className="hop-dash-step">
            <span className="hop-dash-step__icon">{step.icon}</span>
            <div className="hop-dash-step__num">{step.num}</div>
            <h3 className="hop-dash-step__title">{step.title}</h3>
            <p className="hop-dash-step__desc">{step.desc}</p>
          </div>
        ))}
      </div>

      <div className="hop-dash-ba-grid">
        <div className="hop-dash-ba-card hop-dash-ba-card--before">
          <div className="hop-dash-ba-card__hd">
            <span>⚠</span>
            <span>Without HOP</span>
          </div>
          <ul className="hop-dash-ba-list">
            {BEFORE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="hop-dash-ba-card hop-dash-ba-card--after">
          <div className="hop-dash-ba-card__hd">
            <span>✓</span>
            <span>With HOP</span>
          </div>
          <ul className="hop-dash-ba-list">
            {AFTER.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
