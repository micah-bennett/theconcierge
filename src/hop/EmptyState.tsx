import type { ReactNode } from 'react'

// Consistent, card-shaped "nothing here yet" treatment — icon + one-line copy + an optional
// primary action — replacing bare "No X yet." text scattered across list pages.
export function EmptyState({
  icon = '🗂️',
  message,
  action,
}: {
  icon?: string
  message: string
  action?: ReactNode
}) {
  return (
    <div className="hop-empty-state">
      <span className="hop-empty-state__icon" aria-hidden="true">
        {icon}
      </span>
      <p className="hop-muted">{message}</p>
      {action}
    </div>
  )
}
