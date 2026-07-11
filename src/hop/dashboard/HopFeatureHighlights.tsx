const FEATURE_CARDS = [
  {
    icon: '⚙️',
    title: 'Single Gateway',
    desc: 'One request dispatches transport, pharmacy pickup, meal delivery, errands, and more.',
  },
  {
    icon: '📈',
    title: 'Staff Wellness Dashboard',
    desc: 'Real-time visibility into staff utilization and wellbeing trends for your care team.',
  },
  {
    icon: '📋',
    title: 'Admin Analytics',
    desc: 'Administrators get a live data view: retention impact, service utilization, and gap mapping.',
  },
  {
    icon: '🚐',
    title: 'HVCS Transport Integration',
    desc: 'Every transport request routes seamlessly to our official partner, HVCS Transportation.',
  },
] as const

export function HopFeatureHighlights() {
  return (
    <div>
      <p className="hop-dash-eyebrow">What you get with HOP</p>
      <h2 className="hop-dash-title">More than a request form.</h2>

      <div className="hop-dash-feature-grid">
        {FEATURE_CARDS.map((card) => (
          <div key={card.title} className="hop-dash-feature-card">
            <span className="hop-dash-feature-card__icon">{card.icon}</span>
            <h3 className="hop-dash-feature-card__title">{card.title}</h3>
            <p className="hop-dash-feature-card__desc">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
