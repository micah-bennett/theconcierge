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
  '/healthcare': 'HOP for Healthcare | HOP',
  '/organizations': 'HOP for Organizations | HOP',
  '/concierge': 'The Concierge by HOP | HOP',
  '/portal': 'HOP Portal | HOP',
  '/request': 'Make a Request | The Concierge by HOP',
  '/contact': 'Start a Conversation | HOP',
}

export function usePageTitle(pathname: string) {
  useEffect(() => {
    const title = TITLES[pathname]
    if (title) document.title = title
  }, [pathname])
}
