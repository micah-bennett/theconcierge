import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { hopFacilityAddRetention, hopFacilityListRetention, type HopRetentionEvent } from '../../../hop/api'
import { useToast } from '../../../hop/useToast'
import { EmptyState } from '../../../hop/EmptyState'

function formatCurrency(cents: number): string {
  return `$${cents.toLocaleString()}`
}

// Manually-logged, not computed — see hop_retention_events and docs/hop/architecture.md,
// "Facility portal". A staff judgment call recorded as a bookkeeping entry, aggregate only.
export function HopFacilityRetentionPage() {
  const toast = useToast()
  const [events, setEvents] = useState<HopRetentionEvent[] | null>(null)
  const [total, setTotal] = useState(0)
  const [roleTitle, setRoleTitle] = useState('')
  const [estimatedCost, setEstimatedCost] = useState('')
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(load, [])

  function load() {
    hopFacilityListRetention()
      .then((result) => {
        setEvents(result.events)
        setTotal(result.total)
      })
      .catch(() => setEvents([]))
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const cost = Number(estimatedCost)
    if (!roleTitle.trim()) {
      setError('Enter a role')
      return
    }
    if (!Number.isFinite(cost) || cost < 0) {
      setError('Enter a realistic estimated cost')
      return
    }
    setAdding(true)
    try {
      await hopFacilityAddRetention({ roleTitle: roleTitle.trim(), estimatedCost: cost, note: note.trim() })
      setRoleTitle('')
      setEstimatedCost('')
      setNote('')
      load()
      toast.success('Retention entry logged.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log this entry')
    } finally {
      setAdding(false)
    }
  }

  const loading = events === null

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Retention</h1>
      <p className="hop-page-sub">
        Log a save when you believe concierge services helped keep a staff member — this is a
        judgment call your team records, not something HOP computes automatically.
      </p>

      <div className="hop-stat-grid">
        <div className="hop-card hop-stat-card">
          <span className="hop-stat-card__value">{formatCurrency(total)}</span>
          <span className="hop-stat-card__label">Estimated total cost savings</span>
        </div>
        <div className="hop-card hop-stat-card">
          <span className="hop-stat-card__value">{events?.length ?? 0}</span>
          <span className="hop-stat-card__label">Retention saves logged</span>
        </div>
      </div>

      <section className="hop-card">
        <h2>➕ Log a retention save</h2>
        <form className="hop-form-stack" onSubmit={handleAdd}>
          {error && (
            <div className="hop-auth-card__error" role="alert">
              {error}
            </div>
          )}
          <div className="hop-field-row">
            <label className="hop-field">
              <span>Role (e.g. Nurse, Physician)</span>
              <input type="text" required maxLength={120} value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
            </label>
            <label className="hop-field">
              <span>Estimated replacement cost ($)</span>
              <input
                type="number"
                required
                min={0}
                step={1000}
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
              />
            </label>
          </div>
          <label className="hop-field">
            <span>Note (optional)</span>
            <input
              type="text"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Staff member cited HOP support in their stay decision"
            />
          </label>
          <button type="submit" className="hop-btn-primary" disabled={adding}>
            {adding ? 'Logging…' : 'Log this save'}
          </button>
        </form>
      </section>

      <section className="hop-card">
        <h2>📋 Logged entries</h2>
        {loading && <div className="hop-skeleton-bar" />}
        {!loading && events.length === 0 && <EmptyState icon="💰" message="No entries logged yet." />}
        {!loading && events.length > 0 && (
          <ul className="hop-history-list">
            {events.map((e) => (
              <li key={e.id} className="hop-history-list__item">
                <span className="hop-history-list__type">
                  {e.role_title} — {formatCurrency(e.estimated_cost)}
                </span>
                {e.note && <span className="hop-muted">{e.note}</span>}
                <span className="hop-history-list__date">{new Date(e.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
