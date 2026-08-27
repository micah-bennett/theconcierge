import { useEffect, useMemo, useRef, useState } from 'react'
import {
  hopAcceptRequest,
  hopAddMemberNote,
  hopAdminUpdateRequest,
  hopConciergeMyRequests,
  hopListMemberNotes,
  hopStopRideLocationSharing,
  hopUpdateRideLocation,
  type HopAdminRequest,
  type HopMemberNote,
} from '../../../hop/api'
import { RequestMessageThread } from '../../../hop/requestMessages/RequestMessageThread'
import { ContactMenu } from '../../../hop/ContactMenu'

const DISPATCH_PHONE = import.meta.env.VITE_HOP_DISPATCH_PHONE as string | undefined

const LOCATION_PUSH_INTERVAL_MS = 20000

function RideLocationSharing({ requestId }: { requestId: string }) {
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function pushPosition() {
    if (!navigator.geolocation) {
      setError('Location is not available in this browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        hopUpdateRideLocation(requestId, position.coords.latitude, position.coords.longitude).catch(() => {
          setError('Could not update location')
        })
      },
      () => setError('Location permission was denied'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function start() {
    setError(null)
    pushPosition()
    intervalRef.current = setInterval(pushPosition, LOCATION_PUSH_INTERVAL_MS)
    setSharing(true)
  }

  async function stop() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    setSharing(false)
    try {
      await hopStopRideLocationSharing(requestId)
    } catch {
      // Best-effort — the location row is also cleared automatically once status changes.
    }
  }

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    },
    [],
  )

  return (
    <div className="hop-card" style={{ marginTop: '0.75rem' }}>
      <h2>📍 Location sharing</h2>
      {!sharing ? (
        <>
          <p className="hop-muted">
            Sharing your location helps the member see when you're close by. Sharing also stops
            automatically once this ride is marked arrived, completed, or cancelled.
          </p>
          <button type="button" className="hop-btn-primary" onClick={start}>
            Start location sharing
          </button>
        </>
      ) : (
        <>
          <p className="hop-muted">Sharing your live location with the member for this ride.</p>
          <button type="button" className="hop-btn-secondary" onClick={stop}>
            Stop sharing
          </button>
        </>
      )}
      {error && (
        <div className="hop-auth-card__error" role="alert">
          {error}
        </div>
      )}
    </div>
  )
}

// Staff-only, cross-request notes about this member — separate from the per-request dispatch
// note above. See hop_member_notes in db/schema.sql and docs/hop/architecture.md.
function MemberNotesPanel({ memberId, memberFirstName }: { memberId: string; memberFirstName: string }) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState<HopMemberNote[]>([])
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)

  function toggle() {
    const opening = !open
    setOpen(opening)
    if (opening) {
      setLoading(true)
      hopListMemberNotes(memberId)
        .then((result) => setNotes(result.notes))
        .catch(() => setNotes([]))
        .finally(() => setLoading(false))
    }
  }

  async function handleAdd() {
    const body = draft.trim()
    if (!body) return
    setAdding(true)
    try {
      await hopAddMemberNote(memberId, body)
      setDraft('')
      const result = await hopListMemberNotes(memberId)
      setNotes(result.notes)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <button type="button" className="hop-btn-secondary" onClick={toggle}>
        {open ? 'Hide member notes' : '📝 Member notes'}
      </button>
      {open && (
        <div className="hop-card" style={{ marginTop: '0.5rem' }}>
          <p className="hop-muted" style={{ margin: 0 }}>
            Staff-only — {memberFirstName} never sees these notes.
          </p>
          {loading && <div className="hop-skeleton-bar" />}
          {!loading && notes.length === 0 && <p className="hop-muted">No notes yet.</p>}
          {!loading && notes.length > 0 && (
            <ul className="hop-history-list">
              {notes.map((note) => (
                <li key={note.id} className="hop-history-list__item">
                  <span className="hop-history-list__type">{note.body}</span>
                  <span className="hop-muted">
                    {note.author_first_name} {note.author_last_name} — {new Date(note.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              maxLength={1000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a note about this member…"
              style={{ flex: 1 }}
            />
            <button type="button" className="hop-btn-secondary" disabled={adding || !draft.trim()} onClick={handleAdd}>
              {adding ? 'Adding…' : 'Add note'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const SERVICE_TYPE_LABEL: Record<string, string> = {
  ride: 'Ride',
  meal: 'Meal',
  errand: 'Errand',
  wellness: 'Wellness',
  family_home: 'Family & home',
  other: 'Something else',
}

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  received: 'Received',
  assigned: 'Assigned',
  in_progress: 'In progress',
  en_route: 'En route',
  arrived: 'Arrived',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

type Bucket = 'active' | 'completed' | 'cancelled'

const BUCKET_TABS: { value: Bucket; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function bucketFor(req: HopAdminRequest): Bucket {
  if (req.status === 'completed') return 'completed'
  if (req.status === 'cancelled') return 'cancelled'
  return 'active'
}

export function HopConciergeRequestsPage() {
  const [requests, setRequests] = useState<HopAdminRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [bucket, setBucket] = useState<Bucket>('active')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    hopConciergeMyRequests()
      .then((result) => setRequests(result.requests))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleAccept(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await hopAcceptRequest(id)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept the request')
    } finally {
      setBusyId(null)
    }
  }

  const counts = useMemo(() => {
    const result: Record<Bucket, number> = { active: 0, completed: 0, cancelled: 0 }
    for (const req of requests) result[bucketFor(req)]++
    return result
  }, [requests])

  const visibleRequests = requests.filter((req) => bucketFor(req) === bucket)

  async function handleStatusChange(id: string, status: string) {
    setBusyId(id)
    setError(null)
    try {
      await hopAdminUpdateRequest({ id, status })
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the status')
    } finally {
      setBusyId(null)
    }
  }

  async function handleAddNote(id: string) {
    const note = (noteDrafts[id] || '').trim()
    if (!note) return
    setBusyId(id)
    try {
      await hopAdminUpdateRequest({ id, note })
      setNoteDrafts((prev) => ({ ...prev, [id]: '' }))
      load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">My requests</h1>
      <p className="hop-page-sub">Everything assigned to you — update status, log notes, and message the member.</p>
      {DISPATCH_PHONE && (
        <a className="hop-btn-secondary" href={`tel:${DISPATCH_PHONE}`} style={{ marginBottom: '1rem', display: 'inline-block' }}>
          Call the office
        </a>
      )}
      {error && (
        <div className="hop-auth-card__error" role="alert">
          {error}
        </div>
      )}

      <div className="hop-tabs">
        {BUCKET_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`hop-tab${bucket === tab.value ? ' hop-tab--active' : ''}`}
            onClick={() => setBucket(tab.value)}
          >
            {tab.label} ({counts[tab.value]})
          </button>
        ))}
      </div>

      {loading && <p className="hop-muted">Loading…</p>}
      {!loading && visibleRequests.length === 0 && <p className="hop-muted">Nothing here.</p>}

      {!loading &&
        visibleRequests.map((req) => (
          <section key={req.id} className="hop-card hop-dispatch-card">
            <div className="hop-dispatch-card__header">
              <div>
                <strong>{SERVICE_TYPE_LABEL[req.service_type] || req.service_type}</strong>
                <div className="hop-muted">
                  <ContactMenu
                    name={`${req.first_name} ${req.last_name}`}
                    phone={req.user_phone}
                    email={req.email}
                  />
                </div>
              </div>
              <span className={`hop-status hop-status--${req.status}`}>{STATUS_LABEL[req.status] || req.status}</span>
            </div>

            <dl className="hop-dispatch-card__meta">
              <div>
                <dt>Needed by</dt>
                <dd>{req.requested_for ? new Date(req.requested_for).toLocaleString() : 'Not specified'}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{new Date(req.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Details</dt>
                <dd>{req.details || '—'}</dd>
              </div>
            </dl>

            {req.status === 'assigned' && !req.accepted_at ? (
              <div className="hop-card" style={{ background: 'var(--hop-panel-2)' }}>
                <p className="hop-muted">Accept this request to start working on it.</p>
                <button
                  type="button"
                  className="hop-btn-primary"
                  disabled={busyId === req.id}
                  onClick={() => handleAccept(req.id)}
                >
                  {busyId === req.id ? 'Accepting…' : 'Accept request'}
                </button>
              </div>
            ) : (
              <label className="hop-field">
                <span>Status</span>
                <select
                  value={req.status}
                  disabled={busyId === req.id || req.valid_next_statuses.length === 0}
                  onChange={(e) => handleStatusChange(req.id, e.target.value)}
                >
                  <option value={req.status}>{STATUS_LABEL[req.status] || req.status}</option>
                  {req.valid_next_statuses.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABEL[status] || status}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="hop-field">
              <span>Add a dispatch note</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  maxLength={1000}
                  value={noteDrafts[req.id] || ''}
                  onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [req.id]: e.target.value }))}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="hop-btn-secondary"
                  disabled={busyId === req.id || !(noteDrafts[req.id] || '').trim()}
                  onClick={() => handleAddNote(req.id)}
                >
                  Add note
                </button>
              </div>
            </label>

            <button
              type="button"
              className="hop-btn-secondary"
              onClick={() => setOpenHistoryId(openHistoryId === req.id ? null : req.id)}
            >
              {openHistoryId === req.id ? 'Hide history' : `History (${req.history.length})`}
            </button>

            {openHistoryId === req.id && (
              <ul className="hop-timeline">
                {[...req.history].reverse().map((entry, index) => (
                  <li key={index}>
                    <div className="hop-timeline__top">
                      <span className={`hop-status hop-status--${entry.status}`}>
                        {STATUS_LABEL[entry.status] || entry.status}
                      </span>
                      <span className="hop-timeline__time">{new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                    {entry.staff_name && <span className="hop-muted">by {entry.staff_name}</span>}
                    {entry.note && <span className="hop-timeline__note">{entry.note}</span>}
                  </li>
                ))}
              </ul>
            )}

            {req.service_type === 'ride' && req.status === 'en_route' && <RideLocationSharing requestId={req.id} />}

            <MemberNotesPanel memberId={req.user_id} memberFirstName={req.first_name} />

            {openHistoryId === req.id && <RequestMessageThread requestId={req.id} />}
          </section>
        ))}
    </div>
  )
}
