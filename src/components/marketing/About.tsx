const TRUST_BADGES = [
  { icon: '🩺', label: 'CPR · AED · First Aid · Narcan certified' },
  { icon: '📍', label: 'GPS-tracked · Documented hand-offs · 24/7' },
  { icon: '🏔️', label: 'Serving Hudson Valley & NYC Metro since 2011' },
  { icon: '🛡️', label: 'Insured, bonded & fully compliant' },
] as const

export function About() {
  return (
    <section className="mkt-about" id="about" aria-labelledby="about-heading">
      <div className="mkt-about__grid">
        <div>
          <p className="mkt-eyebrow">Why We Exist</p>
          <h2 id="about-heading" className="mkt-section-title" style={{ marginBottom: '24px' }}>
            Sometimes the most critical care
            <br />
            <span className="mkt-gradient-text">has nothing to do with medicine.</span>
          </h2>

          <p className="mkt-about__story-lead">
            A Patient Care Coordinator — the person responsible for overseeing a patient&apos;s stay from admission
            to discharge — once called us in a moment no one plans for.
          </p>

          <p className="mkt-about__para">
            A patient came in alone. No family nearby. No friends close enough to call. When the time came for
            the hardest news a hospital delivers, the coordinator realized there was no one to sit with him, and
            no one to look after the dog waiting for him at home.
          </p>

          <p className="mkt-about__para">
            The hospital staff did everything they could. But it took nearly eight hours, a dozen phone calls,
            and favors from three different departments to arrange something as simple as pet care.
          </p>

          <div className="mkt-about__moment">
            <span className="mkt-about__moment-icon">💡</span>
            <p>
              <strong>That&apos;s when the light bulb went off.</strong> If they had just called The Concierge, it
              would have taken one call and twenty minutes — not eight hours and a dozen favors.
            </p>
          </div>

          <p className="mkt-about__close">
            Sometimes the simplest things get past us. But as a hospital or healthcare team, you shouldn&apos;t
            have to choose between patient care and the logistics surrounding it.{' '}
            <strong>That&apos;s exactly the gap we fill.</strong>
          </p>

          <div className="mkt-trust-badges">
            {TRUST_BADGES.map((badge) => (
              <div key={badge.label} className="mkt-badge-item">
                <span aria-hidden="true">{badge.icon}</span>
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mkt-about__stack" aria-hidden="true">
          <div className="mkt-a-card">
            <p className="mkt-a-card__num">13+</p>
            <p className="mkt-a-card__lbl">Years in service</p>
          </div>
          <div className="mkt-a-card mkt-a-card--2">
            <p className="mkt-a-card__num">1 dispatcher</p>
            <p className="mkt-a-card__lbl">One number. Always.</p>
          </div>
          <div className="mkt-a-card mkt-a-card--3">
            <p className="mkt-a-card__num">Zero</p>
            <p className="mkt-a-card__lbl">Readmissions on our watch</p>
          </div>
        </div>
      </div>
    </section>
  )
}
