import { useState } from 'react'

export type TourStep = { icon: string; title: string; body: string }

type Props = {
  open: boolean
  onClose: () => void
  steps: readonly TourStep[]
}

// A short, dismissible "here's what you can do" walkthrough — shown automatically the first
// time a role logs in in this browser, and reopenable anytime via the sidebar's "Quick tour"
// button (see useTourVisibility.ts for the open/seen state and each *Layout.tsx for wiring).
// Deliberately a simple modal carousel, not a DOM-anchored spotlight tour — robust across every
// page layout without needing to measure/track real elements, and works identically whichever
// page happens to be open when it's triggered.
export function OnboardingTour({ open, onClose, steps }: Props) {
  const [index, setIndex] = useState(0)
  if (!open || steps.length === 0) return null

  const step = steps[index]
  const isLast = index === steps.length - 1

  function handleClose() {
    setIndex(0)
    onClose()
  }

  return (
    <div className="hop-tour-overlay" role="dialog" aria-modal="true" aria-label="Quick tour" onClick={handleClose}>
      <div className="hop-tour-card" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="hop-tour-card__skip" onClick={handleClose}>
          Skip
        </button>
        <span className="hop-tour-card__icon">{step.icon}</span>
        <h2 className="hop-tour-card__title">{step.title}</h2>
        <p className="hop-tour-card__body">{step.body}</p>
        <div className="hop-tour-card__footer">
          <div className="hop-tour-card__dots">
            {steps.map((s, i) => (
              <span
                key={s.title}
                className={`hop-tour-card__dot${i === index ? ' hop-tour-card__dot--active' : ''}`}
              />
            ))}
          </div>
          <div className="hop-tour-card__nav">
            {index > 0 && (
              <button type="button" className="hop-btn-secondary" onClick={() => setIndex((i) => i - 1)}>
                Back
              </button>
            )}
            {!isLast ? (
              <button type="button" className="hop-btn-primary" onClick={() => setIndex((i) => i + 1)}>
                Next
              </button>
            ) : (
              <button type="button" className="hop-btn-primary" onClick={handleClose}>
                Get started
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
