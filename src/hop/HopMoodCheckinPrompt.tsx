import { useState } from 'react'
import { hopCreateMoodCheckIn } from './api'

const LEVELS: { value: 'green' | 'yellow' | 'orange' | 'red'; emoji: string; label: string }[] = [
  { value: 'green', emoji: '🟢', label: 'Doing well' },
  { value: 'yellow', emoji: '🟡', label: 'Managing' },
  { value: 'orange', emoji: '🟠', label: 'Stretched' },
  { value: 'red', emoji: '🔴', label: 'Struggling' },
]

function todayKey(): string {
  return `hop-mood-checkin:${new Date().toISOString().slice(0, 10)}`
}

// A one-tap, anonymized mood check-in — feeds the Facility portal's aggregate morale/heatmap
// views only (api/hop/facility.ts, staff-portal), never shown per-individual to anyone. Asked
// daily, per the "in-app nag" decision (no real push notifications this cycle) — see
// docs/hop/architecture.md, "Facility portal". "Already answered today" is tracked via a
// date-scoped localStorage key (resets automatically each day), separate from the permanent
// per-role dismiss used by the onboarding tour and distinct from DailyNagBanner's session-only
// dismiss (this one-tap action, once done, is genuinely done for the day, not just deferred).
export function HopMoodCheckinPrompt() {
  const [answeredToday, setAnsweredToday] = useState(() => localStorage.getItem(todayKey()) === '1')
  const [submitting, setSubmitting] = useState(false)

  if (answeredToday) return null

  async function handleTap(level: 'green' | 'yellow' | 'orange' | 'red') {
    setSubmitting(true)
    try {
      await hopCreateMoodCheckIn({ level, note: '' })
      localStorage.setItem(todayKey(), '1')
      setAnsweredToday(true)
    } catch {
      // Best-effort — if it fails, the prompt just stays up to try again.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="hop-nag-banner">
      <span className="hop-nag-banner__icon" aria-hidden="true">
        💭
      </span>
      <span className="hop-nag-banner__message">How are you feeling right now? (anonymous, one tap)</span>
      <div className="hop-nag-banner__actions">
        {LEVELS.map((l) => (
          <button
            key={l.value}
            type="button"
            className="hop-btn-ghost"
            disabled={submitting}
            onClick={() => handleTap(l.value)}
            aria-label={l.label}
            title={l.label}
          >
            {l.emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
