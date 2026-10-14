/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URLs of the four HOP Portal deployments, e.g. https://hop-staff.vercel.app */
  readonly VITE_STAFF_URL?: string
  readonly VITE_CONSOLE_URL?: string
  readonly VITE_REP_URL?: string
  readonly VITE_FACILITY_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
