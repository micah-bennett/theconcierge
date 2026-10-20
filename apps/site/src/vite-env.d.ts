/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URLs of the four HOP Portal deployments, e.g. https://hop-client.vercel.app */
  readonly VITE_CLIENT_URL?: string
  /** Pre-rename name of VITE_CLIENT_URL, still read as a fallback. */
  readonly VITE_STAFF_URL?: string
  readonly VITE_CONSOLE_URL?: string
  readonly VITE_REP_URL?: string
  readonly VITE_FACILITY_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
