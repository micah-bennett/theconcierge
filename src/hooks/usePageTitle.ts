import { useEffect } from 'react'

/**
 * Per-route document.title for the public HOP site.
 *
 * Titles only — the Open Graph tags stay static in index.html because this is a
 * client-rendered SPA with no prerendering, so crawlers never run this.
 */
const TITLES: Record<string, string> = {
  '/': 'HOP | Hospitality On-Site Professionals',
  '/how-it-works': 'How HOP Works | HOP',
  '/professionals': 'For Professionals | HOP',
  '/organizations': 'For Organizations | HOP',
  '/concierge': 'The Concierge by HOP | HOP',
  '/portal': 'HOP Portal | HOP',
  '/contact': 'Start a Conversation | HOP',
}

export function usePageTitle(pathname: string) {
  useEffect(() => {
    // HOP app/admin routes manage their own chrome; leave those alone.
    const title = TITLES[pathname]
    if (title) document.title = title
  }, [pathname])
}
