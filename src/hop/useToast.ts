import { useContext } from 'react'
import { ToastContext } from './toastContextCore'

// Split into its own file (not exported from ToastContext.tsx) to satisfy
// react-refresh/only-export-components — same pattern as useHopAuth.ts/authContextCore.ts.
export function useToast() {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used within HopToastProvider')
  return value
}
