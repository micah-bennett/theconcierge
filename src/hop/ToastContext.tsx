import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ToastContext, type ToastContextValue } from './toastContextCore'

type ToastKind = 'success' | 'error' | 'info'
type Toast = { id: number; kind: ToastKind; message: string }

const AUTO_DISMISS_MS = 4000

// Lightweight toast/snackbar confirmations — replaces static inline "Your changes have been
// saved" banners that sit in the layout until the next interaction clears them. CSS-only
// slide-in/fade, no animation library. Mounted once per app shell (HopAppLayout/HopAdminLayout/
// HopConciergeLayout).
export function HopToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, kind, message }])
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id))
    }, AUTO_DISMISS_MS)
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
      info: (message: string) => push('info', message),
    }),
    [push],
  )

  function dismiss(id: number) {
    setToasts((current) => current.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="hop-toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`hop-toast hop-toast--${toast.kind}`} onClick={() => dismiss(toast.id)}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
