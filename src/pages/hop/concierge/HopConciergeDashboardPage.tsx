import { useEffect, useState } from 'react'
import { hopConciergeMyRequests } from '../../../hop/api'
import { useHopAuth } from '../../../hop/useHopAuth'

const OPEN_STATUSES = new Set(['assigned', 'in_progress', 'en_route', 'arrived'])

export function HopConciergeDashboardPage() {
  const { user } = useHopAuth()
  const [counts, setCounts] = useState<{ assigned: number; active: number; completed: number } | null>(null)

  useEffect(() => {
    hopConciergeMyRequests()
      .then((result) => {
        const requests = result.requests
        setCounts({
          assigned: requests.length,
          active: requests.filter((r) => OPEN_STATUSES.has(r.status)).length,
          completed: requests.filter((r) => r.status === 'completed').length,
        })
      })
      .catch(() => setCounts({ assigned: 0, active: 0, completed: 0 }))
  }, [])

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Welcome, {user?.firstName}.</h1>
      <p className="hop-page-sub">Here's what's on your plate today.</p>

      <div className="hop-stat-grid">
        <div className="hop-card hop-stat-card">
          <span className="hop-stat-card__value">{counts?.assigned ?? '—'}</span>
          <span className="hop-stat-card__label">Assigned to you</span>
        </div>
        <div className="hop-card hop-stat-card">
          <span className="hop-stat-card__value">{counts?.active ?? '—'}</span>
          <span className="hop-stat-card__label">Active right now</span>
        </div>
        <div className="hop-card hop-stat-card">
          <span className="hop-stat-card__value">{counts?.completed ?? '—'}</span>
          <span className="hop-stat-card__label">Completed</span>
        </div>
      </div>
    </div>
  )
}
