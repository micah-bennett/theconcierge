import { useEffect } from 'react'

const BASE = 'The Concierge'

/**
 * Per-route document.title for the public marketing pages.
 *
 * Titles only — the Open Graph tags stay static in index.html because this is a
 * client-rendered SPA with no prerendering, so crawlers never run this.
 */
const TITLES: Record<string, string> = {
  '/': `${BASE} — Hudson Valley concierge team`,
  '/personal-services': `Personal services — ${BASE}`,
  '/hop': `HOP, healthcare concierge — ${BASE}`,
  '/plans': `Plans & membership — ${BASE}`,
  '/contact': `Contact — ${BASE}`,
  '/request': `Request service — ${BASE}`,
}

export function usePageTitle(pathname: string) {
  useEffect(() => {
    // HOP app/admin routes manage their own chrome; leave those alone.
    const title = TITLES[pathname]
    if (title) document.title = title
  }, [pathname])
}
