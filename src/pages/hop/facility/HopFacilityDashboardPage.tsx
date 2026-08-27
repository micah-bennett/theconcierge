import { useEffect, useState } from 'react'
import { hopFacilityOverview, type HopFacilityMorale, type HopFacilityOnDutyStaff } from '../../../hop/api'

const MORALE_LABEL: Record<string, string> = {
  green: '🟢 Doing well',
  yellow: '🟡 Managing',
  orange: '🟠 Stretched',
  red: '🔴 Struggling',
}

// See docs/hop/architecture.md, "Facility portal" — everything here is aggregate/de-identified;
// no member name is ever attached to a mood level.
export function HopFacilityDashboardPage() {
  const [onDuty, setOnDuty] = useState<HopFacilityOnDutyStaff[]>([])
  const [onDutyCount, setOnDutyCount] = useState(0)
  const [overtimeCount, setOvertimeCount] = useState(0)
  const [morale, setMorale] = useState<HopFacilityMorale[]>([])
  const [moodResponseCount, setMoodResponseCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hopFacilityOverview()
      .then((result) => {
        setOnDuty(result.onDuty)
        setOnDutyCount(result.onDutyCount)
        setOvertimeCount(result.overtimeCount)
        setMorale(result.morale)
        setMoodResponseCount(result.moodResponseCount)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Overview</h1>
      <p className="hop-page-sub">
        The value concierge services are creating for your staff, today — see the other tabs for
        trends over time.
      </p>

      {loading && <div className="hop-skeleton-bar" />}

      {!loading && (
        <>
          <div className="hop-stat-grid">
            <div className="hop-card hop-stat-card">
              <span className="hop-stat-card__value">{onDutyCount}</span>
              <span className="hop-stat-card__label">Concierge staff on duty</span>
            </div>
            <div className="hop-card hop-stat-card">
              <span className="hop-stat-card__value">{overtimeCount}</span>
              <span className="hop-stat-card__label">Worked past shift end today</span>
            </div>
            <div className="hop-card hop-stat-card">
              <span className="hop-stat-card__value">{moodResponseCount}</span>
              <span className="hop-stat-card__label">Mood check-ins today</span>
            </div>
          </div>

          <section className="hop-card">
            <h2>💚 Today's morale</h2>
            {morale.length === 0 && <p className="hop-muted">No mood check-ins yet today.</p>}
            {morale.length > 0 && (
              <ul className="hop-history-list">
                {morale.map((m) => (
                  <li key={m.level} className="hop-history-list__item">
                    <span className="hop-history-list__type">{MORALE_LABEL[m.level] || m.level}</span>
                    <span className="hop-muted">{m.percent}%</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="hop-muted" style={{ marginTop: '0.5rem' }}>
              Aggregate only — no individual member is ever identified in this view.
            </p>
          </section>

          <section className="hop-card">
            <h2>🧑‍💼 Working today</h2>
            {onDuty.length === 0 && <p className="hop-muted">No one currently clocked in.</p>}
            {onDuty.length > 0 && (
              <ul className="hop-history-list">
                {onDuty.map((s) => (
                  <li key={s.id} className="hop-history-list__item">
                    <span className="hop-history-list__type">
                      {s.first_name} {s.last_name}
                    </span>
                    <span className="hop-muted">{s.role === 'concierge' ? 'Concierge' : 'Admin'}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
