import { useEffect, useMemo, useState } from 'react'
import { hopFacilityHeatmap, type HopFacilityHeatmapBucket } from '../../../hop/api'
import { EmptyState } from '../../../hop/EmptyState'

const LEVEL_WEIGHT: Record<string, number> = { green: 0, yellow: 1, orange: 2, red: 3 }
const LEVEL_COLOR: Record<string, string> = {
  green: 'rgba(74, 222, 128, 0.9)',
  yellow: 'rgba(251, 191, 36, 0.9)',
  orange: 'rgba(249, 115, 22, 0.9)',
  red: 'rgba(248, 113, 113, 0.9)',
}

// Hand-rolled hour x department grid — no charting library, consistent with the prior UI-polish
// cycle's no-new-dependency precedent. Aggregate/de-identified only, per the hard rule carried
// over from the wellness check-in principle — see docs/hop/architecture.md.
export function HopFacilityHeatMapPage() {
  const [buckets, setBuckets] = useState<HopFacilityHeatmapBucket[] | null>(null)

  useEffect(() => {
    hopFacilityHeatmap()
      .then((result) => setBuckets(result.buckets))
      .catch(() => setBuckets([]))
  }, [])

  const { departments, grid } = useMemo(() => {
    const depts = Array.from(new Set((buckets || []).map((b) => b.department))).sort()
    // For each department x hour, pick the "worst" (highest-weight) level present, weighted by
    // count so a single stray response doesn't dominate — average weight across responses.
    const cellMap = new Map<string, { totalWeight: number; count: number }>()
    for (const b of buckets || []) {
      const key = `${b.department}|${b.hour}`
      const weight = (LEVEL_WEIGHT[b.level] ?? 0) * b.count
      const existing = cellMap.get(key)
      if (existing) {
        existing.totalWeight += weight
        existing.count += b.count
      } else {
        cellMap.set(key, { totalWeight: weight, count: b.count })
      }
    }
    return { departments: depts, grid: cellMap }
  }, [buckets])

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const loading = buckets === null

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Heat map</h1>
      <p className="hop-page-sub">
        When stress levels rise across a shift, by hour and department (last 30 days) — so you
        can see whether it's workload, timing, or a specific team.
      </p>

      {loading && <div className="hop-skeleton-bar" />}
      {!loading && buckets.length === 0 && (
        <EmptyState icon="🌡️" message="No mood check-in data yet." />
      )}
      {!loading && buckets.length > 0 && (
        <section className="hop-card" style={{ overflowX: 'auto' }}>
          <table className="hop-table">
            <thead>
              <tr>
                <th>Department</th>
                {hours.map((h) => (
                  <th key={h} style={{ fontSize: '0.7rem' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept}>
                  <td>{dept}</td>
                  {hours.map((h) => {
                    const cell = grid.get(`${dept}|${h}`)
                    const avgWeight = cell ? cell.totalWeight / cell.count : null
                    const level =
                      avgWeight === null
                        ? null
                        : avgWeight < 0.5
                          ? 'green'
                          : avgWeight < 1.5
                            ? 'yellow'
                            : avgWeight < 2.5
                              ? 'orange'
                              : 'red'
                    return (
                      <td
                        key={h}
                        style={{
                          background: level ? LEVEL_COLOR[level] : 'transparent',
                          minWidth: '1.5rem',
                          textAlign: 'center',
                        }}
                        title={cell ? `${cell.count} response(s)` : undefined}
                      />
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hop-muted" style={{ marginTop: '0.75rem' }}>
            Darker/redder cells mean a higher average reported stress level in that hour.
            Aggregate only — no individual is ever identified.
          </p>
        </section>
      )}
    </div>
  )
}
