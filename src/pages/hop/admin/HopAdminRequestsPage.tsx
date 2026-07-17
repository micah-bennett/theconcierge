import { useEffect, useMemo, useRef, useState } from 'react'
import {
  hopAdminListRequests,
  hopAdminListStaff,
  hopAdminUpdateRequest,
  hopStopRideLocationSharing,
  hopUpdateRideLocation,
  type HopAdminRequest,
  type HopStaffMember,
} from '../../../hop/api'
import { useHopAuth } from '../../../hop/useHopAuth'
import { RequestMessageThread } from '../../../hop/requestMessages/RequestMessageThread'

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
      <h2>Location sharing</h2>
      {!sharing ? (
        <>
          <p className="hop-muted">
            Sharing your location helps the member see when you're close by. Your browser will ask
            for permission first, and you can stop anytime — sharing also stops automatically once
            this ride is marked arrived, completed, or cancelled.
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

const ACTIVE_STATUSES = ['in_progress', 'en_route', 'arrived']

type Bucket = 'new' | 'assigned' | 'active' | 'completed' | 'cancelled'

const BUCKET_TABS: { value: Bucket; label: string }[] = [
  { value: 'new', label: 'New / unassigned' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function bucketFor(req: HopAdminRequest): Bucket {
  if (req.status === 'completed') return 'completed'
  if (req.status === 'cancelled') return 'cancelled'
  if (ACTIVE_STATUSES.includes(req.status)) return 'active'
  if (req.handled_by) return 'assigned'
  return 'new'
}

export function HopAdminRequestsPage() {
  const { user } = useHopAuth()
  const [requests, setRequests] = useState<HopAdminRequest[]>([])
  const [staff, setStaff] = useState<HopStaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [bucket, setBucket] = useState<Bucket>('new')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    Promise.all([hopAdminListRequests(), hopAdminListStaff()])
      .then(([requestsResult, staffResult]) => {
        setRequests(requestsResult.requests)
        setStaff(staffResult.staff)
      })
      .catch(() => {
        setRequests([])
        setStaff([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const counts = useMemo(() => {
    const result: Record<Bucket, number> = { new: 0, assigned: 0, active: 0, completed: 0, cancelled: 0 }
    for (const req of requests) result[bucketFor(req)]++
    return result
  }, [requests])

  const visibleRequests = requests.filter((req) => bucketFor(req) === bucket)

  async function handleAssign(id: string, staffId: string) {
    setBusyId(id)
    try {
      await hopAdminUpdateRequest({ id, assignedTo: staffId || null })
      load()
    } finally {
      setBusyId(null)
    }
  }

  async function handleStatusChange(id: string, status: string) {
    setBusyId(id)
    try {
      await hopAdminUpdateRequest({ id, status })
      load()
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
      <h1 className="hop-page-title">Requests</h1>
      <p className="hop-page-sub">Assign a concierge, move requests through the workflow, and log dispatch notes.</p>

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
                  {req.first_name} {req.last_name} — {req.email}
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

            <div className="hop-dispatch-card__controls">
              <label className="hop-field">
                <span>Assigned to</span>
                <select
                  value={req.handled_by || ''}
                  disabled={busyId === req.id}
                  onChange={(e) => handleAssign(req.id, e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                      {member.role === 'concierge' ? ' (Concierge)' : ' (Admin)'}
                    </option>
                  ))}
                </select>
              </label>

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
            </div>

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

            {req.service_type === 'ride' && req.status === 'en_route' && req.handled_by === user?.id && (
              <RideLocationSharing requestId={req.id} />
            )}

            {openHistoryId === req.id && req.handled_by && <RequestMessageThread requestId={req.id} />}
          </section>
        ))}
    </div>
  )
}
