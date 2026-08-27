import { useState } from 'react'
import type { ReactNode } from 'react'

// A dismissible-but-recurring nag banner — dismiss state lives in plain component `useState`,
// deliberately NOT localStorage. That means a dismiss only lasts for this page view; navigating
// away and back (or reloading) re-renders the component fresh and it reappears if the underlying
// condition is still true (e.g. "no check-in logged today" is still true). This is the "in-app
// nag pattern" decision documented in docs/hop/architecture.md — distinct from the onboarding
// tour's permanent-dismiss localStorage pattern (useTourVisibility.ts), which is deliberately a
// different, one-time-only kind of dismissal.
export function DailyNagBanner({
  icon,
  message,
  actionLabel,
  onAction,
}: {
  icon: string
  message: ReactNode
  actionLabel?: string
  onAction?: () => void
}) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className="hop-nag-banner" role="status">
      <span className="hop-nag-banner__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="hop-nag-banner__message">{message}</span>
      <div className="hop-nag-banner__actions">
        {actionLabel && onAction && (
          <button type="button" className="hop-btn-secondary" onClick={onAction}>
            {actionLabel}
          </button>
        )}
        <button
          type="button"
          className="hop-btn-ghost"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss for now"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
