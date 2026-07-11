const DONUT_R = 42
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
  { num: '21hrs', label: 'lost weekly to personal logistics' },
  { num: '1 in 5', label: 'discharges end in readmission from logistics gaps' },
  { num: '47', label: 'open tasks the avg nurse carries at shift start' },
  { num: '$56K', label: 'average cost to replace one burned-out nurse' },
] as const

const KPI_CARDS = [
  { num: '42%', label: 'of nurses report burnout — up from 31% pre-pandemic', highlight: false },
  { num: '$4.6B', label: 'annual cost of nurse turnover to U.S. hospitals', highlight: false },
  { num: '3×', label: 'more likely to stay when non-clinical needs are supported', highlight: false },
  { num: 'Proactive', label: 'Leadership acts on wellness data — before staff resign', highlight: true },
] as const

export function HopBurnoutStats() {
  return (
    <div>
      <p className="hop-dash-eyebrow">The data behind HOP</p>
      <h2 className="hop-dash-title">
        When staff thrive, <span className="hop-dash-gradient">hospitals win.</span>
      </h2>
      <p className="hop-dash-sub">The numbers driving why HOP exists — and what it changes.</p>

      <div className="hop-dash-chart-grid">
        <div className="hop-dash-chart-card">
          <p className="hop-dash-chart-card__label">Where professional hours go each week</p>
          <p className="hop-dash-chart-card__sub">Avg. healthcare professional · Caregiver Action Network 2024</p>
          <div className="hop-dash-donut-wrap">
            <svg viewBox="0 0 120 120" className="hop-dash-donut-chart" role="img" aria-label="Where professional hours go each week">
              <circle cx="60" cy="60" r={DONUT_R} fill="none" stroke="#1e1e2e" strokeWidth="18" />
              {DONUT_SEGMENTS.map((s) => (
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
                />
              ))}
            </svg>
            <div className="hop-dash-donut-center">
              <span className="hop-dash-donut-pct">21%</span>
              <span className="hop-dash-donut-lbl">lost</span>
            </div>
          </div>
          <div className="hop-dash-legend">
            {RAW_SEGMENTS.map((s) => (
              <div key={s.label} className="hop-dash-legend__item">
                <span className="hop-dash-legend__dot" style={{ background: s.color }} />
                {s.label}
              </div>
            ))}
          </div>
        </div>

        <div className="hop-dash-chart-card">
          <p className="hop-dash-chart-card__label">Cost of unmanaged care gaps</p>
          <p className="hop-dash-chart-card__sub">Annual burden on facilities · CMS &amp; AHRQ 2024</p>
          <div className="hop-dash-bar-chart">
            {BAR_DATA.map((bar) => (
              <div key={bar.label} className="hop-dash-bar-row">
                <span className="hop-dash-bar-lbl">{bar.label}</span>
                <div className="hop-dash-bar-track">
                  <div className="hop-dash-bar-fill" style={{ width: `${bar.pct}%`, background: bar.color }} />
                </div>
                <span className={`hop-dash-bar-val${bar.green ? ' hop-dash-bar-val--green' : ''}`}>{bar.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hop-dash-strip">
        {STRIP_STATS.map((s) => (
          <div key={s.label} className="hop-dash-strip-card">
            <p className="hop-dash-strip-card__num">{s.num}</p>
            <p className="hop-dash-strip-card__lbl">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="hop-dash-insight">
        {KPI_CARDS.map((kpi) => (
          <div key={kpi.label} className={`hop-dash-kpi-card${kpi.highlight ? ' hop-dash-kpi-card--highlight' : ''}`}>
            <p className="hop-dash-kpi-num">{kpi.num}</p>
            <p className="hop-dash-kpi-lbl">{kpi.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
