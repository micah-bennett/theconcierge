import { createContext } from 'react'

export type ToastContextValue = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

// Split from ToastContext.tsx (the provider component) and useToast.ts (the hook) to satisfy
// react-refresh/only-export-components — same pattern as authContextCore.ts/AuthContext.tsx.
export const ToastContext = createContext<ToastContextValue | null>(null)
