import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hopAdminListUsers, hopAdminUpdateUserStatus, type HopAdminUser } from '../../../hop/api'

export function HopAdminUsersPage() {
  const [users, setUsers] = useState<HopAdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    hopAdminListUsers()
      .then((result) => setUsers(result.users))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function toggleStatus(user: HopAdminUser) {
    setUpdatingId(user.id)
    try {
      const nextStatus = user.status === 'active' ? 'disabled' : 'active'
      await hopAdminUpdateUserStatus(user.id, nextStatus)
      load()
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Users</h1>

      <section className="hop-card">
        {loading && <p className="hop-muted">Loading…</p>}
        {!loading && users.length === 0 && <p className="hop-muted">No HOP users yet.</p>}
        {!loading && users.length > 0 && (
          <table className="hop-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Integrations</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    {user.first_name} {user.last_name}
                  </td>
                  <td>{user.email}</td>
                  <td>{user.phone || '—'}</td>
                  <td>
                    <span className={`hop-status hop-status--${user.status}`}>{user.status}</span>
                  </td>
                  <td>{user.connected_integrations}</td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link className="hop-btn-ghost" to={`/hop/admin/messages?userId=${user.id}`}>
                      Message
                    </Link>
                    <button
                      type="button"
                      className="hop-btn-ghost"
                      disabled={updatingId === user.id}
                      onClick={() => toggleStatus(user)}
                    >
                      {user.status === 'active' ? 'Disable' : 'Activate'}
                    </button>
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
