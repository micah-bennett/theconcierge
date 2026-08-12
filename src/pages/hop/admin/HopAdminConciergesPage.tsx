import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { hopAdminCreateConcierge, hopAdminListConcierges, hopAdminUpdateConciergeStatus, type HopConcierge } from '../../../hop/api'

export function HopAdminConciergesPage() {
  const [concierges, setConcierges] = useState<HopConcierge[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<'concierge' | 'user'>('concierge')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createResult, setCreateResult] = useState<{
    email: string
    hopNumber: string
    temporaryPassword: string | null
    emailSent: boolean
    role: 'concierge' | 'user'
  } | null>(null)

  function load() {
    setLoading(true)
    hopAdminListConcierges()
      .then((result) => setConcierges(result.concierges))
      .catch(() => setConcierges([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setCreateError(null)
    setCreateResult(null)
    setCreating(true)
    try {
      const result = await hopAdminCreateConcierge({ email, firstName, lastName, role })
      setCreateResult({
        email: result.concierge.email,
        hopNumber: result.concierge.hop_number,
        temporaryPassword: result.temporaryPassword,
        emailSent: result.emailSent,
        role,
      })
      setEmail('')
      setFirstName('')
      setLastName('')
      setRole('concierge')
      if (role === 'concierge') load()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not create the account')
    } finally {
      setCreating(false)
    }
  }

  async function toggleStatus(concierge: HopConcierge) {
    setUpdatingId(concierge.id)
    try {
      const nextStatus = concierge.status === 'active' ? 'disabled' : 'active'
      await hopAdminUpdateConciergeStatus(concierge.id, nextStatus)
      load()
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Team</h1>
      <p className="hop-page-sub">Create concierge or member accounts and manage who can be assigned to requests.</p>

      <section className="hop-card">
        <h2>➕ Add an account</h2>
        <form className="hop-form-stack" onSubmit={handleCreate}>
          {createError && (
            <div className="hop-auth-card__error" role="alert">
              {createError}
            </div>
          )}
          {createResult && (
            <div className="hop-banner hop-banner--success" role="status">
              {createResult.emailSent ? (
                <>
                  {createResult.role === 'concierge' ? 'Concierge' : 'Member'} account created for{' '}
                  {createResult.email} (HOP number <strong>{createResult.hopNumber}</strong>) — an invite email
                  with a set-password link was sent.
                </>
              ) : (
                <>
                  {createResult.role === 'concierge' ? 'Concierge' : 'Member'} account created for{' '}
                  {createResult.email} (HOP number <strong>{createResult.hopNumber}</strong>). Email delivery
                  isn't configured yet — share this temporary password directly:{' '}
                  <strong>{createResult.temporaryPassword}</strong>
                </>
              )}
              {createResult.role === 'user' && (
                <> Find the new account on the <Link to="/hop/admin/users">Users</Link> tab.</>
              )}
            </div>
          )}

          <label className="hop-field">
            <span>Account type</span>
            <select value={role} onChange={(e) => setRole(e.target.value as 'concierge' | 'user')}>
              <option value="concierge">Concierge</option>
              <option value="user">Member</option>
            </select>
          </label>

          <div className="hop-field-row">
            <label className="hop-field">
              <span>First name</span>
              <input type="text" required maxLength={80} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </label>
            <label className="hop-field">
              <span>Last name</span>
              <input type="text" required maxLength={80} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>
          </div>

          <label className="hop-field">
            <span>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <button type="submit" className="hop-btn-primary" disabled={creating}>
            {creating ? 'Creating…' : role === 'concierge' ? 'Create concierge account' : 'Create member account'}
          </button>
        </form>
      </section>

      <section className="hop-card">
        {loading && <p className="hop-muted">Loading…</p>}
        {!loading && concierges.length === 0 && <p className="hop-muted">No concierges yet.</p>}
        {!loading && concierges.length > 0 && (
          <table className="hop-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>HOP #</th>
                <th>Email</th>
                <th>Status</th>
                <th>Headline</th>
                <th>Open requests</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {concierges.map((concierge) => (
                <tr key={concierge.id}>
                  <td>
                    {concierge.first_name} {concierge.last_name}
                  </td>
                  <td>{concierge.hop_number}</td>
                  <td>{concierge.email}</td>
                  <td>
                    <span className={`hop-status hop-status--${concierge.status}`}>{concierge.status}</span>
                  </td>
                  <td>{concierge.headline || '—'}</td>
                  <td>{concierge.open_assigned}</td>
                  <td>{new Date(concierge.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      type="button"
                      className="hop-btn-ghost"
                      disabled={updatingId === concierge.id}
                      onClick={() => toggleStatus(concierge)}
                    >
                      {concierge.status === 'active' ? 'Disable' : 'Activate'}
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
