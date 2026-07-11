const TRUST_BADGES = [
  { icon: '🩺', label: 'CPR · AED · First Aid · Narcan certified' },
  { icon: '📍', label: 'GPS-tracked · Documented hand-offs · 24/7' },
  { icon: '🛡️', label: 'Insured, bonded & fully compliant' },
] as const

export function HopAboutStory() {
  return (
    <div>
      <p className="hop-dash-eyebrow">Why We Exist</p>
      <h2 className="hop-dash-title">
        Sometimes the most critical care <span className="hop-dash-gradient">has nothing to do with medicine.</span>
      </h2>

      <p className="hop-dash-story-lead">
        A Patient Care Coordinator once called us in a moment no one plans for.
      </p>

      <p className="hop-dash-para">
        A patient came in alone — no family nearby, no friends close enough to call. When the
        hardest news came, there was no one to sit with him, and no one to look after the dog
        waiting for him at home.
      </p>

      <p className="hop-dash-para">
        The hospital staff did everything they could. But it took nearly eight hours, a dozen
        phone calls, and favors from three departments to arrange something as simple as pet care.
      </p>

      <div className="hop-dash-moment">
        <span className="hop-dash-moment__icon">💡</span>
        <p>
          <strong>That&apos;s when the light bulb went off.</strong> One call to HOP would have
          taken twenty minutes — not eight hours and a dozen favors.
        </p>
      </div>

      <div className="hop-dash-badges">
        {TRUST_BADGES.map((badge) => (
          <div key={badge.label} className="hop-dash-badge-item">
            <span aria-hidden="true">{badge.icon}</span>
            <span>{badge.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
