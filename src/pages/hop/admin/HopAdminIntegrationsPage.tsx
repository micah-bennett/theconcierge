import { useEffect, useState } from 'react'
import { hopAdminListIntegrations, type HopAdminIntegration } from '../../../hop/api'

export function HopAdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState<HopAdminIntegration[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hopAdminListIntegrations()
      .then((result) => setIntegrations(result.integrations))
      .catch(() => setIntegrations([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Integrations</h1>
      <p className="hop-page-sub">Connections users have set up across the platform.</p>

      <section className="hop-card">
        {loading && <p className="hop-muted">Loading…</p>}
        {!loading && integrations.length === 0 && <p className="hop-muted">No integrations connected yet.</p>}
        {!loading && integrations.length > 0 && (
          <table className="hop-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Connected</th>
                <th>Last synced</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((integration) => (
                <tr key={`${integration.user_id}-${integration.provider}`}>
                  <td>
                    {integration.first_name} {integration.last_name}
                    <div className="hop-muted">{integration.email}</div>
                  </td>
                  <td>{integration.provider}</td>
                  <td>
                    <span className={`hop-status hop-status--${integration.status}`}>{integration.status}</span>
                  </td>
                  <td>{integration.connected_at ? new Date(integration.connected_at).toLocaleString() : '—'}</td>
                  <td>{integration.last_synced_at ? new Date(integration.last_synced_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
