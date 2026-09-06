import { Fragment, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  hopAddMemberNote,
  hopAdminAwardPoints,
  hopAdminCreateConcierge,
  hopAdminListConcierges,
  hopAdminListUsers,
  hopAdminUpdateConciergeStatus,
  hopAdminUpdateUserStatus,
  hopGetMemberNotesCountToday,
  hopListMemberNotes,
  type HopAdminUser,
  type HopConcierge,
  type HopMemberNote,
} from '../../../hop/api'
import { useToast } from '../../../hop/useToast'
import { EmptyState } from '../../../hop/EmptyState'
import { SkeletonCard } from '../../../hop/SkeletonCard'
import { HopAvatar, hopRoleLabel } from '../../../hop/HopAvatar'

// Replaces the former HopAdminConciergesPage ("Team") + HopAdminUsersPage ("Users") split —
// creating a Member used to bury the new account on a separate tab from where it was created.
// One create form, one list, filterable by role — no new backend endpoint: both existing GET
// endpoints already return enough to merge client-side (same "one fetch, multiple client-side
// tabs" pattern already used by HopAdminRequestsPage's status buckets). See "Feed" /
// "Deployments" in docs/hop/architecture.md for why the freed function-budget slot went to
// api/hop/social.ts instead of a new accounts endpoint.

type Role = 'user' | 'concierge' | 'facility'
type Tab = 'all' | Role

type AccountRow = {
  id: string
  first_name: string
  last_name: string
  hop_number: string
  email: string
  role: Role
  status: 'active' | 'disabled'
  created_at: string
  phone?: string
  connected_integrations?: number
  headline?: string | null
  open_assigned?: number
  default_shift_end_time?: string | null
}

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'concierge', label: 'Concierges' },
  { value: 'user', label: 'Members' },
  { value: 'facility', label: 'Facility Admins' },
]

export function HopAdminAccountsPage() {
  const toast = useToast()
  const [rows, setRows] = useState<AccountRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState<Tab>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [notesToday, setNotesToday] = useState(0)

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<Role>('concierge')
  const [defaultShiftEndTime, setDefaultShiftEndTime] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

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
    setLoaded(false)
    // Partial failure shouldn't blank the whole page — merge whatever succeeded.
    Promise.allSettled([hopAdminListConcierges(), hopAdminListUsers()]).then(([conciergeResult, userResult]) => {
      const merged: AccountRow[] = []
      if (conciergeResult.status === 'fulfilled') {
        merged.push(
          ...conciergeResult.value.concierges.map(
            (c: HopConcierge): AccountRow => ({
              id: c.id,
              first_name: c.first_name,
              last_name: c.last_name,
              hop_number: c.hop_number,
              email: c.email,
              role: c.role,
              status: c.status,
              created_at: c.created_at,
              headline: c.headline,
              open_assigned: c.open_assigned,
              default_shift_end_time: c.default_shift_end_time,
            }),
          ),
        )
      } else {
        toast.error('Could not load concierge/facility accounts')
      }
      if (userResult.status === 'fulfilled') {
        merged.push(
          ...userResult.value.users.map(
            (u: HopAdminUser): AccountRow => ({
              id: u.id,
              first_name: u.first_name,
              last_name: u.last_name,
              hop_number: u.hop_number,
              email: u.email,
              role: 'user',
              status: u.status as 'active' | 'disabled',
              created_at: u.created_at,
              phone: u.phone,
              connected_integrations: u.connected_integrations,
            }),
          ),
        )
      } else {
        toast.error('Could not load member accounts')
      }
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setRows(merged)
      setLoaded(true)
    })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [])

  useEffect(() => {
    hopGetMemberNotesCountToday()
      .then((result) => setNotesToday(result.count))
      .catch(() => setNotesToday(0))
  }, [])

  const filtered = useMemo(() => (tab === 'all' ? rows : rows.filter((r) => r.role === tab)), [rows, tab])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setCreateError(null)
    setCreating(true)
    try {
      const result = await hopAdminCreateConcierge({
        email,
        firstName,
        lastName,
        role,
        defaultShiftEndTime: role === 'user' ? null : defaultShiftEndTime || null,
      })
      toast.success(
        result.emailSent
          ? `${hopRoleLabel(role)} account created for ${email} (HOP number ${result.concierge.hop_number}) — an invite email was sent.`
          : `${hopRoleLabel(role)} account created for ${email} (HOP number ${result.concierge.hop_number}). Email isn't configured — temporary password: ${result.temporaryPassword}`,
      )
      setEmail('')
      setFirstName('')
      setLastName('')
      setDefaultShiftEndTime('')
      load()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not create the account')
    } finally {
      setCreating(false)
    }
  }

  async function toggleStatus(row: AccountRow) {
    setUpdatingId(row.id)
    try {
      const nextStatus = row.status === 'active' ? 'disabled' : 'active'
      if (row.role === 'user') {
        await hopAdminUpdateUserStatus(row.id, nextStatus)
      } else {
        await hopAdminUpdateConciergeStatus(row.id, { status: nextStatus })
      }
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update status')
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
      <h1 className="hop-page-title">Accounts</h1>
      <p className="hop-page-sub">
        Create concierge, member, or Facility Admin accounts, and manage everyone in one place.
      </p>
      {notesToday > 0 && (
        <p className="hop-muted">📝 {notesToday} note{notesToday === 1 ? '' : 's'} added today by concierges.</p>
      )}

      <section className="hop-card">
        <h2>➕ Add an account</h2>
        <form className="hop-form-stack" onSubmit={handleCreate}>
          {createError && (
            <div className="hop-auth-card__error" role="alert">
              {createError}
            </div>
          )}

          <label className="hop-field">
            <span>Account type</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="concierge">Concierge</option>
              <option value="user">Member</option>
              <option value="facility">Facility Admin</option>
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

          {role !== 'user' && (
            <label className="hop-field">
              <span>Default shift end time (optional)</span>
              <input type="time" value={defaultShiftEndTime} onChange={(e) => setDefaultShiftEndTime(e.target.value)} />
            </label>
          )}

          <button type="submit" className="hop-btn-primary" disabled={creating || !firstName.trim() || !lastName.trim() || !email.trim()}>
            {creating ? 'Creating…' : `Create ${hopRoleLabel(role).toLowerCase()} account`}
          </button>
        </form>
      </section>

      <section className="hop-card">
        <div className="hop-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              className={`hop-tab${tab === t.value ? ' hop-tab--active' : ''}`}
              onClick={() => setTab(t.value)}
            >
              {t.label}
              {t.value !== 'all' && <span className="hop-tab__count">{rows.filter((r) => r.role === t.value).length}</span>}
            </button>
          ))}
        </div>

        {!loaded && (
          <>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </>
        )}
        {loaded && filtered.length === 0 && <EmptyState icon="🧑‍💼" message="No accounts in this view yet." />}
        {loaded && filtered.length > 0 && (
          <table className="hop-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>HOP #</th>
                <th>Email</th>
                <th>Status</th>
                <th>Details</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <Fragment key={row.id}>
                  <tr>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <HopAvatar firstName={row.first_name} lastName={row.last_name} userId={row.id} size="sm" />
                        {row.first_name} {row.last_name}
                      </div>
                    </td>
                    <td>
                      <span className={`hop-role-badge hop-role-badge--${row.role}`}>{hopRoleLabel(row.role)}</span>
                    </td>
                    <td>{row.hop_number}</td>
                    <td>{row.email}</td>
                    <td>
                      <span className={`hop-status hop-status--${row.status}`}>{row.status}</span>
                    </td>
                    <td>
                      {row.role === 'user'
                        ? `${row.connected_integrations ?? 0} integration${row.connected_integrations === 1 ? '' : 's'}`
                        : `${row.headline || '—'} · ${row.open_assigned ?? 0} open`}
                    </td>
                    <td>{new Date(row.created_at).toLocaleDateString()}</td>
                    <td style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {row.role === 'user' && (
                        <>
                          <Link className="hop-btn-ghost" to={`/hop/admin/messages?userId=${row.id}`}>
                            Message
                          </Link>
                          <button type="button" className="hop-btn-ghost" onClick={() => openAwardForm(row.id)}>
                            🎁 Award points
                          </button>
                          <button type="button" className="hop-btn-ghost" onClick={() => openNotesPanel(row.id)}>
                            📝 Notes
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="hop-btn-ghost"
                        disabled={updatingId === row.id}
                        onClick={() => toggleStatus(row)}
                      >
                        {row.status === 'active' ? 'Disable' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                  {awardTargetId === row.id && (
                    <tr>
                      <td colSpan={8}>
                        <form className="hop-award-form" onSubmit={(e) => handleAward(e, row.id, row.first_name)}>
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
                            {awarding ? 'Awarding…' : `Award to ${row.first_name}`}
                          </button>
                        </form>
                      </td>
                    </tr>
                  )}
                  {notesTargetId === row.id && (
                    <tr>
                      <td colSpan={8}>
                        <div className="hop-award-form" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                          <p className="hop-muted" style={{ margin: 0 }}>
                            Staff-only — {row.first_name} never sees these notes.
                          </p>
                          {notesLoading && <div className="hop-skeleton-bar" />}
                          {!notesLoading && notes.length === 0 && <p className="hop-muted">No notes yet.</p>}
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
                          <form style={{ display: 'flex', gap: '0.5rem' }} onSubmit={(e) => handleAddNote(e, row.id)}>
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
