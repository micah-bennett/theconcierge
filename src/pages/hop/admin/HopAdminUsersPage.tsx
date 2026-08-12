import { Fragment, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  hopAdminAwardPoints,
  hopAdminListUsers,
  hopAdminUpdateUserStatus,
  type HopAdminUser,
} from '../../../hop/api'
import { useToast } from '../../../hop/useToast'
import { EmptyState } from '../../../hop/EmptyState'

export function HopAdminUsersPage() {
  const toast = useToast()
  const [users, setUsers] = useState<HopAdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const [awardTargetId, setAwardTargetId] = useState<string | null>(null)
  const [awardDelta, setAwardDelta] = useState('')
  const [awardReason, setAwardReason] = useState('')
  const [awarding, setAwarding] = useState(false)
  const [awardError, setAwardError] = useState<string | null>(null)

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

  function openAwardForm(userId: string) {
    setAwardTargetId(awardTargetId === userId ? null : userId)
    setAwardDelta('')
    setAwardReason('')
    setAwardError(null)
  }

  async function handleAward(event: FormEvent, userId: string, firstName: string) {
    event.preventDefault()
    setAwardError(null)
    const delta = Number(awardDelta)
    if (!Number.isFinite(delta) || delta < 1 || delta > 1000) {
      setAwardError('Enter a point amount between 1 and 1000')
      return
    }
    setAwarding(true)
    try {
      const result = await hopAdminAwardPoints(userId, delta, awardReason)
      toast.success(`Awarded ${delta} point${delta === 1 ? '' : 's'} to ${firstName} — new balance ${result.balance}.`)
      setAwardDelta('')
      setAwardReason('')
      setAwardTargetId(null)
    } catch (err) {
      setAwardError(err instanceof Error ? err.message : 'Could not award points')
    } finally {
      setAwarding(false)
    }
  }

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Users</h1>

      <section className="hop-card">
        {loading && (
          <>
            <div className="hop-skeleton-bar hop-skeleton-bar--title" />
            <div className="hop-skeleton-bar" />
            <div className="hop-skeleton-bar" />
          </>
        )}
        {!loading && users.length === 0 && <EmptyState icon="👥" message="No HOP users yet." />}
        {!loading && users.length > 0 && (
          <table className="hop-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>HOP #</th>
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
                <Fragment key={user.id}>
                  <tr>
                    <td>
                      {user.first_name} {user.last_name}
                    </td>
                    <td>{user.hop_number}</td>
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
                      <button type="button" className="hop-btn-ghost" onClick={() => openAwardForm(user.id)}>
                        🎁 Award points
                      </button>
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
                  {awardTargetId === user.id && (
                    <tr>
                      <td colSpan={8}>
                        <form className="hop-award-form" onSubmit={(e) => handleAward(e, user.id, user.first_name)}>
                          {awardError && (
                            <div className="hop-auth-card__error" role="alert">
                              {awardError}
                            </div>
                          )}
                          <label className="hop-field">
                            <span>Points</span>
                            <input
                              type="number"
                              min={1}
                              max={1000}
                              required
                              value={awardDelta}
                              onChange={(e) => setAwardDelta(e.target.value)}
                            />
                          </label>
                          <label className="hop-field">
                            <span>Reason (optional)</span>
                            <input
                              type="text"
                              maxLength={200}
                              value={awardReason}
                              onChange={(e) => setAwardReason(e.target.value)}
                              placeholder="e.g. Outstanding feedback on a ride request"
                            />
                          </label>
                          <button type="submit" className="hop-btn-primary" disabled={awarding}>
                            {awarding ? 'Awarding…' : `Award to ${user.first_name}`}
                          </button>
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
