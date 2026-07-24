import { useState } from 'react'

// One flag per role per browser (not per account) — simple and avoids any async timing issue
// with the logged-in user id not being available yet on first render. Anyone can always see it
// again via the "Quick tour" sidebar button, so a shared device forgetting per-account state is
// an acceptable simplification, not a real gap. Split into its own file (not OnboardingTour.tsx)
// so that file only exports the component — required for Fast Refresh, see eslint
// react-refresh/only-export-components.
export function useTourVisibility(storageKey: string) {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(storageKey) !== 'seen'
    } catch {
      return false
    }
  })

  function close() {
    try {
      window.localStorage.setItem(storageKey, 'seen')
    } catch {
      // Storage can be unavailable (private browsing, quota) — the tour just won't stay
      // dismissed across reloads, not worth failing the interaction over.
    }
    setOpen(false)
  }

  function reopen() {
    setOpen(true)
  }

  return { open, close, reopen }
}
