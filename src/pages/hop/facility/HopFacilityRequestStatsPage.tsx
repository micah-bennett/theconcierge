import { useEffect, useState } from 'react'
import { hopFacilityRequestStats, type HopFacilityStatBucket } from '../../../hop/api'
import { EmptyState } from '../../../hop/EmptyState'

// Hand-rolled bar chart, no charting library — see docs/hop/architecture.md, "Facility portal".
function Bars({ buckets, formatLabel }: { buckets: HopFacilityStatBucket[]; formatLabel: (bucket: string) => string }) {
  const max = Math.max(1, ...buckets.map((b) => b.count))
  return (
    <div className="hop-trend-chart" style={{ height: '160px' }}>
      {buckets.map((b) => (
        <div key={b.bucket} className="hop-trend-chart__col">
          <div className="hop-trend-chart__bar-track">
            <div className="hop-trend-chart__bar" style={{ height: `${(b.count / max) * 100}%` }} />
          </div>
          <span className="hop-trend-chart__value">{b.count}</span>
          <span className="hop-trend-chart__label">{formatLabel(b.bucket)}</span>
        </div>
      ))}
    </div>
  )
}

export function HopFacilityRequestStatsPage() {
  const [daily, setDaily] = useState<HopFacilityStatBucket[]>([])
  const [weekly, setWeekly] = useState<HopFacilityStatBucket[]>([])
  const [monthly, setMonthly] = useState<HopFacilityStatBucket[]>([])
  const [yearly, setYearly] = useState<HopFacilityStatBucket[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hopFacilityRequestStats()
      .then((result) => {
        setDaily(result.daily.slice(-14))
        setWeekly(result.weekly.slice(-12))
        setMonthly(result.monthly.slice(-12))
        setYearly(result.yearly)
        setTotal(result.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Request stats</h1>
      <p className="hop-page-sub">How much your staff are actually using HOP — daily, weekly, monthly, and yearly.</p>

      {loading && <div className="hop-skeleton-bar" />}
      {!loading && total === 0 && <EmptyState icon="📈" message="No requests submitted yet." />}
      {!loading && total > 0 && (
        <>
          <div className="hop-stat-grid">
            <div className="hop-card hop-stat-card">
              <span className="hop-stat-card__value">{total}</span>
              <span className="hop-stat-card__label">Total requests, all time</span>
            </div>
          </div>

          <section className="hop-card">
            <h2>Last 14 days</h2>
            <Bars buckets={daily} formatLabel={(b) => new Date(b).toLocaleDateString(undefined, { day: 'numeric' })} />
          </section>

          <section className="hop-card">
            <h2>Last 12 weeks</h2>
            <Bars buckets={weekly} formatLabel={(b) => new Date(b).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })} />
          </section>

          <section className="hop-card">
            <h2>Last 12 months</h2>
            <Bars buckets={monthly} formatLabel={(b) => new Date(b).toLocaleDateString(undefined, { month: 'short' })} />
          </section>

          <section className="hop-card">
            <h2>By year</h2>
            <Bars buckets={yearly} formatLabel={(b) => new Date(b).getFullYear().toString()} />
          </section>
        </>
      )}
    </div>
  )
}
