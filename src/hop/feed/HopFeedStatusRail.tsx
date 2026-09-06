import { useState } from 'react'
import type { FormEvent } from 'react'
import { HopAvatar } from '../HopAvatar'
import type { HopUserStatusEntry } from '../api'

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'available', label: '🟢 Available' },
  { value: 'on_vacation', label: '🌴 On vacation' },
  { value: 'sick_leave', label: '🤒 Sick leave' },
  { value: 'moved_department', label: '🔄 Moved department' },
  { value: 'other', label: '💬 Other' },
]

function statusLabel(value: string): string {
  return STATUS_OPTIONS.find((o) => o.value === value)?.label.replace(/^\S+\s/, '') || value
}

export function HopFeedStatusRail({
  statuses,
  myUserId,
  onSetStatus,
}: {
  statuses: HopUserStatusEntry[]
  myUserId: string | undefined
  onSetStatus: (statusType: string, statusNote: string) => Promise<void>
}) {
  const mine = statuses.find((s) => s.user_id === myUserId)
  const [statusType, setStatusType] = useState(mine?.status_type || 'available')
  const [statusNote, setStatusNote] = useState(mine?.status_note || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await onSetStatus(statusType, statusNote.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your status')
    } finally {
      setSaving(false)
    }
  }

  const others = statuses.filter((s) => s.user_id !== myUserId)

  return (
    <aside className="hop-card hop-feed-status-rail">
      <h2 className="hop-feed-status-rail__title">Who's around</h2>

      <form className="hop-feed-status-form" onSubmit={handleSubmit}>
        <div className="hop-field">
          <select value={statusType} onChange={(e) => setStatusType(e.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="hop-field">
          <input
            type="text"
            placeholder="Optional note…"
            value={statusNote}
            maxLength={200}
            onChange={(e) => setStatusNote(e.target.value)}
          />
        </div>
        {error && <div className="hop-auth-card__error">{error}</div>}
        <button type="submit" className="hop-btn-secondary" disabled={saving}>
          {saving ? 'Saving…' : 'Set your status'}
        </button>
      </form>

      <ul className="hop-feed-status-list">
        {others.length === 0 && <li className="hop-muted hop-feed-status-list__empty">No one else has set a status yet.</li>}
        {others.map((entry) => (
          <li key={entry.user_id} className="hop-feed-status-list__row">
            <HopAvatar firstName={entry.first_name} lastName={entry.last_name} userId={entry.user_id} size="sm" />
            <div className="hop-feed-status-list__info">
              <span className="hop-feed-status-list__name">
                {entry.first_name} {entry.last_name}
              </span>
              {entry.status_note && <span className="hop-muted hop-feed-status-list__note">{entry.status_note}</span>}
            </div>
            <span className={`hop-status hop-status--${entry.status_type}`}>{statusLabel(entry.status_type)}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
