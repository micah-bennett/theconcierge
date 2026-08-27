import { Fragment, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  hopAddMemberNote,
  hopAdminAwardPoints,
  hopAdminListUsers,
  hopAdminUpdateUserStatus,
  hopGetMemberNotesCountToday,
  hopListMemberNotes,
  type HopAdminUser,
  type HopMemberNote,
} from '../../../hop/api'
import { useToast } from '../../../hop/useToast'
import { EmptyState } from '../../../hop/EmptyState'

export function HopAdminUsersPage() {
  const toast = useToast()
  const [users, setUsers] = useState<HopAdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [notesToday, setNotesToday] = useState(0)

  const [awardTargetId, setAwardTargetId] = useState<string | null>(null)
  const [awardDelta, setAwardDelta] = useState('')
  const [awardReason, setAwardReason] = useState('')
  const [awarding, setAwarding] = useState(false)
  const [awardError, setAwardError] = useState<string | null>(null)

  const [notesTargetId, setNotesTargetId] = useState<string | null>(null)
  const [notes, setNotes] = useState<HopMemberNote[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  function load() {
    setLoading(true)
    hopAdminListUsers()
      .then((result) => setUsers(result.users))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  useEffect(() => {
    hopGetMemberNotesCountToday()
      .then((result) => setNotesToday(result.count))
      .catch(() => setNotesToday(0))
  }, [])

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
    setNotesTargetId(null)
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

  function openNotesPanel(userId: string) {
    const opening = notesTargetId !== userId
    setNotesTargetId(opening ? userId : null)
    setAwardTargetId(null)
    setNoteDraft('')
    if (opening) {
      setNotesLoading(true)
      hopListMemberNotes(userId)
        .then((result) => setNotes(result.notes))
        .catch(() => setNotes([]))
        .finally(() => setNotesLoading(false))
    }
  }

  async function handleAddNote(event: FormEvent, userId: string) {
    event.preventDefault()
    const body = noteDraft.trim()
    if (!body) return
    setAddingNote(true)
    try {
      await hopAddMemberNote(userId, body)
      setNoteDraft('')
      const result = await hopListMemberNotes(userId)
      setNotes(result.notes)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add note')
    } finally {
      setAddingNote(false)
    }
  }

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Users</h1>
      {notesToday > 0 && (
        <p className="hop-muted">📝 {notesToday} note{notesToday === 1 ? '' : 's'} added today by concierges.</p>
      )}

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
                    <td style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Link className="hop-btn-ghost" to={`/hop/admin/messages?userId=${user.id}`}>
                        Message
                      </Link>
                      <button type="button" className="hop-btn-ghost" onClick={() => openAwardForm(user.id)}>
                        🎁 Award points
                      </button>
                      <button type="button" className="hop-btn-ghost" onClick={() => openNotesPanel(user.id)}>
                        📝 Notes
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
                  {notesTargetId === user.id && (
                    <tr>
                      <td colSpan={8}>
                        <div className="hop-award-form" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                          <p className="hop-muted" style={{ margin: 0 }}>
                            Staff-only — {user.first_name} never sees these notes.
                          </p>
                          {notesLoading && <div className="hop-skeleton-bar" />}
                          {!notesLoading && notes.length === 0 && (
                            <p className="hop-muted">No notes yet.</p>
                          )}
                          {!notesLoading && notes.length > 0 && (
                            <ul className="hop-history-list">
                              {notes.map((note) => (
                                <li key={note.id} className="hop-history-list__item">
                                  <span className="hop-history-list__type">{note.body}</span>
                                  <span className="hop-muted">
                                    {note.author_first_name} {note.author_last_name} —{' '}
                                    {new Date(note.created_at).toLocaleString()}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                          <form
                            style={{ display: 'flex', gap: '0.5rem' }}
                            onSubmit={(e) => handleAddNote(e, user.id)}
                          >
                            <input
                              type="text"
                              maxLength={1000}
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                              placeholder="Add a note about this member…"
                              style={{ flex: 1 }}
                            />
                            <button type="submit" className="hop-btn-secondary" disabled={addingNote || !noteDraft.trim()}>
                              {addingNote ? 'Adding…' : 'Add note'}
                            </button>
                          </form>
                        </div>
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
