const DONUT_R = 48
const DONUT_CIRC = 2 * Math.PI * DONUT_R

const RAW_SEGMENTS = [
  { pct: 0.44, color: '#6366f1', label: 'Patient care & clinical duties' },
  { pct: 0.35, color: '#f97316', label: 'Admin & scheduling' },
  { pct: 0.21, color: '#ef4444', label: 'Personal logistics' },
] as const

let _acc = 0
const DONUT_SEGMENTS = RAW_SEGMENTS.map((s) => {
  const len = s.pct * DONUT_CIRC
  const offset = _acc
  _acc += len
  return { ...s, len, offset }
})

const BAR_DATA = [
  { label: 'Readmission per patient', pct: 85, color: '#ef4444', val: '$15.2K', green: false },
  { label: 'Lost productivity / RN', pct: 65, color: '#f97316', val: '$11.7K', green: false },
  { label: 'Turnover cost / nurse', pct: 100, color: '#8b5cf6', val: '$56K', green: false },
  { label: 'Concierge program / mo', pct: 10, color: '#06b6d4', val: 'Much less', green: true },
] as const

const STRIP_STATS = [
  { icon: '⏱', num: '21hrs', label: 'lost weekly to personal logistics per caregiver', source: 'Caregiver Action Network' },
  { icon: '🏥', num: '1 in 5', label: 'discharges end in readmission from logistics gaps', source: 'CMS 2024' },
  { icon: '📋', num: '47', label: 'open tasks the avg nurse carries mentally at shift start', source: 'ANA 2024' },
  { icon: '💵', num: '$56K', label: 'average cost to replace one burned-out nurse', source: 'NSI Nursing Solutions 2024' },
] as const

const INSIGHT_PILLS = [
  'Workforce Wellness Trends',
  'Burnout Early Signals',
  'Logistics Gap Mapping',
  'Turnover Risk Scoring',
  'Readmission Correlation',
] as const

const KPI_CARDS = [
  { num: '42%', label: 'of nurses report burnout — up from 31% pre-pandemic', source: 'ANA 2024', highlight: false },
  { num: '$4.6B', label: 'annual cost of nurse turnover to U.S. hospitals', source: 'NSI Nursing Solutions 2024', highlight: false },
  { num: '3×', label: 'more likely to stay when non-clinical needs are supported', source: 'Journal of Nursing Management', highlight: false },
  { num: 'Proactive', label: 'Hospital leadership acts on wellness data — before staff resign', source: 'HOP Intelligence Dashboard', highlight: true },
] as const

export function ProblemStats() {
  return (
    <section className="mkt-problem" id="problem" aria-labelledby="problem-heading">
      <div className="mkt-problem__inner">
        <p className="mkt-eyebrow" style={{ textAlign: 'center' }}>
          The data doesn&apos;t lie
        </p>
        <h2 id="problem-heading" className="mkt-section-title" style={{ textAlign: 'center' }}>
          When staff thrive,
          <br />
          <span className="mkt-gradient-text">hospitals win.</span>
        </h2>
        <p className="mkt-section-sub" style={{ textAlign: 'center', marginLeft: 'auto', marginRight: 'auto' }}>
          We reduce the invisible load on your healthcare staff — and give hospitals the data to prove it.
        </p>

        <div className="mkt-chart-grid">
          <div className="mkt-chart-card">
            <p className="mkt-chart-card__label">Where professional hours go each week</p>
            <p className="mkt-chart-card__sub">Avg. healthcare professional · Caregiver Action Network 2024</p>
            <div className="mkt-donut-wrap">
              <svg viewBox="0 0 120 120" className="mkt-donut-chart" role="img" aria-label="Where professional hours go each week">
                <circle cx="60" cy="60" r={DONUT_R} fill="none" stroke="#1e1e2e" strokeWidth="20" />
                {DONUT_SEGMENTS.map((s) => (
                  <circle
                    key={s.label}
                    cx="60"
                    cy="60"
                    r={DONUT_R}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="20"
                    strokeDasharray={`${s.len} ${DONUT_CIRC}`}
                    strokeDashoffset={-s.offset}
                  />
                ))}
              </svg>
              <div className="mkt-donut-center">
                <span className="mkt-donut-pct">21%</span>
                <span className="mkt-donut-lbl">lost</span>
              </div>
            </div>
            <div className="mkt-legend">
              {RAW_SEGMENTS.map((s) => (
                <div key={s.label} className="mkt-legend__item">
                  <span className="mkt-legend__dot" style={{ background: s.color }} />
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          <div className="mkt-chart-card">
            <p className="mkt-chart-card__label">Cost of unmanaged care gaps</p>
            <p className="mkt-chart-card__sub">Annual burden on facilities · CMS &amp; AHRQ 2024</p>
            <div className="mkt-bar-chart">
              {BAR_DATA.map((bar) => (
                <div key={bar.label} className="mkt-bar-row">
                  <span className="mkt-bar-lbl">{bar.label}</span>
                  <div className="mkt-bar-track">
                    <div className="mkt-bar-fill" style={{ width: `${bar.pct}%`, background: bar.color }} />
                  </div>
                  <span className={`mkt-bar-val${bar.green ? ' mkt-bar-val--green' : ''}`}>{bar.val}</span>
                </div>
              ))}
            </div>
            <p className="mkt-chart-note">The prevention is a fraction of the problem.</p>
          </div>
        </div>

        <div className="mkt-stat-strip">
          {STRIP_STATS.map((s) => (
            <div key={s.label} className="mkt-strip-card">
              <span className="mkt-strip-card__icon">{s.icon}</span>
              <p className="mkt-strip-card__num">{s.num}</p>
              <p className="mkt-strip-card__lbl">
                {s.label}
                <span className="mkt-strip-card__src">{s.source}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="mkt-insight">
          <div>
            <p className="mkt-eyebrow">The HOP Advantage</p>
            <h3 className="mkt-insight__title">
              Your hospital gets a data layer
              <br />
              no EHR can give you.
            </h3>
            <p className="mkt-insight__body">
              Every concierge interaction — every ride, errand, pickup, and prescription — is a data point about
              staff wellbeing and workload.
            </p>
            <p className="mkt-insight__body">This is proactive hospital management. Not reactive damage control.</p>
            <div className="mkt-insight__pills">
              {INSIGHT_PILLS.map((pill) => (
                <span key={pill} className="mkt-d-pill">
                  {pill}
                </span>
              ))}
            </div>
          </div>
          <div className="mkt-insight__right">
            {KPI_CARDS.map((kpi) => (
              <div key={kpi.label} className={`mkt-kpi-card${kpi.highlight ? ' mkt-kpi-card--highlight' : ''}`}>
                <p className="mkt-kpi-num">{kpi.num}</p>
                <p className="mkt-kpi-lbl">{kpi.label}</p>
                <p className="mkt-kpi-src">{kpi.source}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
