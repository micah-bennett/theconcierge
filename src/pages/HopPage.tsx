import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

// ── Donut chart ──────────────────────────────────────────────────
const DONUT_R = 45
const DONUT_CIRC = 2 * Math.PI * DONUT_R // ≈ 282.74

const RAW_SEGMENTS = [
  { pct: 0.42, color: '#f87171', label: 'Burned out', val: '42%' },
  { pct: 0.31, color: '#fb923c', label: 'At risk', val: '31%' },
  { pct: 0.27, color: '#4ade80', label: 'Thriving', val: '27%' },
] as const

let _segAcc = 0
const DONUT_SEGS = RAW_SEGMENTS.map((s) => {
  const len = s.pct * DONUT_CIRC
  const offset = _segAcc
  _segAcc += len
  return { ...s, len, offset }
})

function DonutChart() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="hop-donut"
      role="img"
      aria-label="Clinician burnout status donut chart"
    >
      <circle cx="60" cy="60" r={DONUT_R} fill="none" stroke="#1e1b3a" strokeWidth="18" />
      {DONUT_SEGS.map((s) => (
        <circle
          key={s.label}
          cx="60"
          cy="60"
          r={DONUT_R}
          fill="none"
          stroke={s.color}
          strokeWidth="18"
          strokeDasharray={`${s.len} ${DONUT_CIRC}`}
          strokeDashoffset={-s.offset}
          transform="rotate(-90 60 60)"
        />
      ))}
    </svg>
  )
}

// ── Data ─────────────────────────────────────────────────────────
const HERO_STATS = [
  { val: '42%', color: '#f87171', label: 'of clinicians report burnout', source: 'AMA 2025' },
  { val: '$500K+', color: '#fb923c', label: 'to replace one physician', source: 'avg replacement cost' },
  { val: '$4.6B', color: '#fbbf24', label: 'lost to burnout annually', source: 'per year, US hospitals' },
] as const

const CHIPS = ['Rides', 'Meals', 'Errands', 'Wellness', 'Family & home', 'HOP AI'] as const

const BAR_DATA = [
  { label: 'Physician', pct: 94, color: '#f87171' },
  { label: 'CRNA', pct: 31, color: '#fb923c' },
  { label: 'NP/PA', pct: 22, color: '#fbbf24' },
  { label: 'RN', pct: 13, color: '#6366f1' },
  { label: 'LPN', pct: 6, color: '#06b6d4' },
] as const

const PROB_STATS = [
  { icon: '⚠️', val: '2×', label: 'more likely to make a medical error when burned out' },
  { icon: '💵', val: '$4.6B', label: 'lost to physician burnout per year (Han et al.)' },
  { icon: '📋', val: '1 in 5', label: 'nurses plan to leave the profession this year' },
  { icon: '📉', val: '-22%', label: 'patient satisfaction with short-staffed teams' },
] as const

const SERVICES = [
  { icon: '🚗', label: 'Rides', desc: 'Airport, commute, anywhere', bg: '#1e1b4b' },
  { icon: '🍴', label: 'Meals', desc: 'To your unit or home', bg: '#134e4a' },
  { icon: '📦', label: 'Errands', desc: 'Pharmacy, dry cleaning, gifts', bg: '#2e1065' },
  { icon: '❤️', label: 'Wellness', desc: 'Therapy, fitness, recovery', bg: '#4c0519' },
  { icon: '🏠', label: 'Family & home', desc: 'Childcare, pet care, pickups', bg: '#451a03' },
  { icon: '🤖', label: 'HOP AI', desc: 'Planning, research, anything', bg: '#1e1b4b' },
] as const

const HOW_STEPS = [
  { num: '01', ico: '⚡', title: 'Ask once', desc: 'One request — any need' },
  { num: '02', ico: '👥', title: 'Concierge acts', desc: 'Real person + HOP matches the best provider' },
  { num: '03', ico: '📡', title: 'Track live', desc: 'Status updates in real time, zero chasing' },
  { num: '04', ico: '✓', title: 'Verified done', desc: 'Proof on delivery. Auto-fallback if needed' },
] as const

const BEFORE_HOP = [
  'Ends 12-hr shift, still needs to arrange a ride',
  'Calls 3 apps, none available near the hospital',
  'Skips picking up prescriptions (again)',
  'Gets home exhausted, nothing done',
  "Books tomorrow's shift dreading it",
] as const

const WITH_HOP = [
  'Taps one request — ride, prescriptions, meal',
  'HOP concierge handles everything instantly',
  'Gets live status, no follow-up calls',
  'Prescriptions waiting at home on arrival',
  'Wakes up ready. Books next shift without hesitation',
] as const

// ── Component ─────────────────────────────────────────────────────
export function HopPage() {
  return (
    <div className="hop-page">

      {/* ── Hero ── */}
      <section className="hop-section hop-section--hero" id="hop-hero">
        <div className="hop-inner">
          <div className="hop-ticker motion-reveal">
            <span className="hop-ticker__dot" />
            Radical Hospitality · where work-life balance is optimized
          </div>

          <h1 className="hop-h1 motion-reveal">
            Behind every patient is someone<br />
            <em className="hop-h1__gradient">running on empty.</em>
          </h1>

          <p className="hop-hero__sub motion-reveal motion-reveal--delay-1">
            HOP is the concierge for healthcare staff — one request handles the ride, meal,
            errand, or anything else. So they can focus on patients, not logistics.
          </p>

          <div className="hop-hero__ctas motion-reveal motion-reveal--delay-2">
            <Link className="hop-btn-primary" to="/hop/signup">
              Get started →
            </Link>
            <Link className="hop-btn-ghost" to="/hop/login">
              Log in
            </Link>
          </div>
          <div className="hop-hero__ctas hop-hero__ctas--secondary motion-reveal motion-reveal--delay-2">
            <a
              className="hop-link-inline"
              href="https://hop-pilot-hvcs.pplx.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              See it from the floor →
            </a>
            <a
              className="hop-link-inline"
              href="https://hop-pilot-hvcs.pplx.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              VBC Dashboard
            </a>
          </div>

          <div className="hop-hero__stats motion-reveal motion-reveal--delay-1">
            {HERO_STATS.map((s) => (
              <div key={s.val} className="hop-hero__stat-card">
                <span className="hop-hero__stat-val" style={{ color: s.color }}>{s.val}</span>
                <span className="hop-hero__stat-label">{s.label}</span>
                <span className="hop-hero__stat-source">{s.source}</span>
              </div>
            ))}
          </div>

          <div className="hop-ask motion-reveal motion-reveal--delay-2">
            <div className="hop-ask__bar">
              <span className="hop-ask__ico">⚡</span>
              <span className="hop-ask__placeholder">Ask HOP for anything...</span>
              <a
                className="hop-ask__btn"
                href="https://hop-pilot-hvcs.pplx.app"
                target="_blank"
                rel="noopener noreferrer"
              >
                Request
              </a>
            </div>
            <div className="hop-ask__chips">
              {CHIPS.map((chip) => (
                <span key={chip} className="hop-ask__chip">{chip}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── The Problem ── */}
      <section className="hop-section" id="the-problem">
        <div className="hop-inner">
          <p className="hop-eyebrow motion-reveal">The Crisis No One Is Solving</p>
          <h2 className="hop-h2 motion-reveal motion-reveal--delay-1">
            Your care team is running on empty.
          </h2>
          <p className="hop-sub motion-reveal motion-reveal--delay-2">
            No paragraph needed. The data says it all.
          </p>

          <div className="hop-charts motion-reveal motion-reveal--delay-1">
            <div className="hop-chart-card">
              <div className="hop-chart-card__hd">
                <strong>Clinician burnout status</strong>
                <span>% of US physicians &amp; nurses — AMA 2025</span>
              </div>
              <div className="hop-donut-row">
                <DonutChart />
                <div className="hop-donut-legend">
                  {RAW_SEGMENTS.map((s) => (
                    <div key={s.label} className="hop-legend-item">
                      <span className="hop-legend-dot" style={{ background: s.color }} />
                      <span className="hop-legend-name">{s.label}</span>
                      <span className="hop-legend-val" style={{ color: s.color }}>{s.val}</span>
                    </div>
                  ))}
                  <div className="hop-legend-badge">73% need support now</div>
                </div>
              </div>
            </div>

            <div className="hop-chart-card">
              <div className="hop-chart-card__hd">
                <strong>Cost to replace one clinician</strong>
                <span>Average replacement cost in $K · NSI 2025</span>
              </div>
              <div className="hop-bar-chart">
                <div className="hop-bar-chart__y">
                  {['$800K', '$600K', '$400K', '$200K', '$0K'].map((l) => (
                    <span key={l}>{l}</span>
                  ))}
                </div>
                <div className="hop-bar-chart__cols">
                  {BAR_DATA.map((b) => (
                    <div key={b.label} className="hop-bar-col">
                      <div
                        className="hop-bar-col__fill"
                        style={{ height: `${b.pct}%`, background: b.color }}
                      />
                      <span className="hop-bar-col__lbl">{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="hop-prob-stats">
            {PROB_STATS.map((s, i) => (
              <div
                key={s.val}
                className="hop-prob-stat motion-reveal"
                style={{ '--motion-delay': `${i * 65}ms` } as CSSProperties}
              >
                <span className="hop-prob-stat__ico">{s.icon}</span>
                <span className="hop-prob-stat__val">{s.val}</span>
                <span className="hop-prob-stat__lbl">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's Included ── */}
      <section className="hop-section" id="whats-included">
        <div className="hop-inner">
          <h2 className="hop-h2 motion-reveal">One request. Consider it handled.</h2>
          <p className="hop-sub motion-reveal motion-reveal--delay-1">
            HOP covers every need — a real concierge takes it from submission to done.
          </p>

          <div className="hop-services-grid">
            {SERVICES.map((s, i) => (
              <div
                key={s.label}
                className="hop-service-card motion-reveal motion-lift"
                style={{ '--motion-delay': `${50 + i * 55}ms` } as CSSProperties}
              >
                <div className="hop-service-card__ico" style={{ background: s.bg }}>
                  {s.icon}
                </div>
                <strong className="hop-service-card__name">{s.label}</strong>
                <span className="hop-service-card__desc">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="hop-section" id="how-it-works">
        <div className="hop-inner">
          <h2 className="hop-h2 motion-reveal">How HOP gives the day back</h2>
          <p className="hop-sub motion-reveal motion-reveal--delay-1">
            Four steps. One request. Zero follow-up.
          </p>

          <div className="hop-steps">
            {HOW_STEPS.map((step, i) => (
              <div
                key={step.num}
                className="hop-step motion-reveal"
                style={{ '--motion-delay': `${50 + i * 65}ms` } as CSSProperties}
              >
                <div className="hop-step__circle">
                  <span className="hop-step__ico">{step.ico}</span>
                </div>
                <span className="hop-step__num">{step.num}</span>
                <strong className="hop-step__title">{step.title}</strong>
                <span className="hop-step__desc">{step.desc}</span>
              </div>
            ))}
          </div>

          <div className="hop-compare motion-reveal motion-reveal--delay-1">
            <div className="hop-compare__col hop-compare__col--before">
              <div className="hop-compare__hd">
                <span>⚠️</span>
                <strong>Before HOP</strong>
              </div>
              <ul className="hop-compare__list">
                {BEFORE_HOP.map((item) => (
                  <li key={item} className="hop-compare__item hop-compare__item--before">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="hop-compare__col hop-compare__col--after">
              <div className="hop-compare__hd">
                <span>✅</span>
                <strong>With HOP</strong>
              </div>
              <ul className="hop-compare__list">
                {WITH_HOP.map((item) => (
                  <li key={item} className="hop-compare__item hop-compare__item--after">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
