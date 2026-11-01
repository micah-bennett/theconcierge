// Each HOP Portal app is its own Vercel deployment (see docs/portal/architecture.md), so links to
// them are absolute URLs set per environment. An unset URL means "Coming soon".

/** The Concierge Portal (individual concierge customers), e.g. https://hop-concierge.vercel.app */
export const CONCIERGE_URL: string | undefined = import.meta.env.VITE_CONCIERGE_URL || undefined

export function appUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}${path}`
}
