import { useEffect, useState } from 'react'
import { hopAdminListIntegrations, hopAdminListRequests, hopAdminListUsers } from '../../../hop/api'

export function HopAdminDashboardPage() {
  const [counts, setCounts] = useState<{ users: number; openRequests: number; connectedIntegrations: number } | null>(
    null,
  )

  useEffect(() => {
    Promise.all([hopAdminListUsers(), hopAdminListRequests(), hopAdminListIntegrations()])
      .then(([users, requests, integrations]) => {
        setCounts({
          users: users.users.length,
          openRequests: requests.requests.filter((r) => r.status === 'submitted' || r.status === 'in_progress')
            .length,
          connectedIntegrations: integrations.integrations.filter((i) => i.status === 'connected').length,
        })
      })
      .catch(() => setCounts({ users: 0, openRequests: 0, connectedIntegrations: 0 }))
  }, [])

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Overview</h1>

      <div className="hop-stat-grid">
        <div className="hop-card hop-stat-card">
          <span className="hop-stat-card__value">{counts?.users ?? '—'}</span>
          <span className="hop-stat-card__label">👥 HOP users</span>
        </div>
        <div className="hop-card hop-stat-card">
          <span className="hop-stat-card__value">{counts?.openRequests ?? '—'}</span>
          <span className="hop-stat-card__label">📋 Open requests</span>
        </div>
        <div className="hop-card hop-stat-card">
          <span className="hop-stat-card__value">{counts?.connectedIntegrations ?? '—'}</span>
          <span className="hop-stat-card__label">🔗 Connected integrations</span>
        </div>
      </div>
    </div>
  )
}
