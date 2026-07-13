import { Link } from 'react-router-dom'

const FAMILY_CARE_CHOICES = [
  { category: 'childcare', icon: '🧒', label: 'Childcare support' },
  { category: 'eldercare', icon: '🧓', label: 'Eldercare support' },
  { category: 'school_activity', icon: '🎒', label: 'School and activity logistics' },
  { category: 'pet_care', icon: '🐾', label: 'Pet care' },
  { category: 'household_emergency', icon: '🏚️', label: 'Household emergency' },
  { category: 'other', icon: '🤝', label: 'Other family need' },
] as const

export function HopFamilyCarePage() {
  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Family Care</h1>
      <p className="hop-page-sub">Get help with the logistics that can't wait.</p>

      <div className="hop-quick-grid">
        {FAMILY_CARE_CHOICES.map((choice) => (
          <Link
            key={choice.category}
            to={`/hop/app/requests?type=family_home&category=${choice.category}`}
            className="hop-quick-card"
          >
            <span className="hop-quick-card__icon">{choice.icon}</span>
            <span>{choice.label}</span>
          </Link>
        ))}
      </div>

      <section className="hop-card">
        <p className="hop-muted">
          Submitting a request here reaches a real concierge, who reviews it and follows up with
          you — the same way as any other HOP request. It doesn't guarantee coverage, a specific
          outcome, or emergency response.
        </p>
        <div className="hop-banner hop-banner--error" role="alert">
          If this is an emergency or someone is in immediate danger, call 911 (or your local
          emergency number) — don't wait on a HOP request.
        </div>
      </section>
    </div>
  )
}
