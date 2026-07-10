import { useEffect, useState } from 'react'
import { hopAdminListRequests, hopUpdateRequestStatus, type HopAdminRequest } from '../../../hop/api'

const STATUS_OPTIONS = ['submitted', 'in_progress', 'completed', 'cancelled'] as const

export function HopAdminRequestsPage() {
  const [requests, setRequests] = useState<HopAdminRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    hopAdminListRequests()
      .then((result) => setRequests(result.requests))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id)
    try {
      await hopUpdateRequestStatus(id, status)
      load()
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Requests</h1>

      <section className="hop-card">
        {loading && <p className="hop-muted">Loading…</p>}
        {!loading && requests.length === 0 && <p className="hop-muted">No requests yet.</p>}
        {!loading && requests.length > 0 && (
          <table className="hop-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Type</th>
                <th>Details</th>
                <th>Submitted</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>
                    {req.first_name} {req.last_name}
                    <div className="hop-muted">{req.email}</div>
                  </td>
                  <td>{req.service_type}</td>
                  <td>{req.details || '—'}</td>
                  <td>{new Date(req.created_at).toLocaleString()}</td>
                  <td>
                    <select
                      value={req.status}
                      disabled={updatingId === req.id}
                      onChange={(e) => updateStatus(req.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
