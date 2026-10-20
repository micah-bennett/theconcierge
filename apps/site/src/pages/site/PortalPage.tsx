import { Link } from 'react-router-dom'
import { PageHero } from './parts'

// Each HOP Portal app is its own Vercel deployment (see docs/portal/architecture.md), so the
// sign-in links are absolute URLs set per environment. An unset URL renders "Coming soon".
type PortalApp = {
  icon: string
  title: string
  who: string
  desc: string
  url: string | undefined
  signup?: boolean
}

const PORTAL_APPS: readonly PortalApp[] = [
  {
    icon: '♥',
    title: 'HOP Client',
    who: 'Nurses, doctors, and every healthcare professional',
    desc: 'Ask HOP for anything, check in on how your day is going, earn rewards, and message the HOP team—in and out of the hospital.',
    url: import.meta.env.VITE_CLIENT_URL || import.meta.env.VITE_STAFF_URL,
    signup: true,
  },
  {
    icon: '◎',
    title: 'Concierge Console',
    who: 'The HOP dispatch team',
    desc: 'See every request, send trips and tasks to a specific rep, and follow each job live.',
    url: import.meta.env.VITE_CONSOLE_URL,
  },
  {
    icon: '➜',
    title: 'Concierge Rep App',
    who: 'HOP field reps',
    desc: 'See only the jobs sent to you. Accept, track, call the client or vendor, and finish with photo proof and a signature.',
    url: import.meta.env.VITE_REP_URL,
  },
  {
    icon: '▦',
    title: 'Facility View',
    who: 'Hospital leaders',
    desc: 'A unit heat map and Burnout Radar so leaders can act early. Unit totals only, never names.',
    url: import.meta.env.VITE_FACILITY_URL,
  },
]

function appUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}${path}`
}

export function PortalPage() {
  return (
    <>
      <PageHero
        eyebrow="HOP Portal"
        title="Choose your portal."
        lead="HOP runs on four secure, web-based apps—one for each part of the team. Pick yours and sign in from any browser. No app store, no download."
      />
      <section className="hs-section">
        <div className="hs-container">
          <div className="hs-cards-2">
            {PORTAL_APPS.map((app) => (
              <article key={app.title} className="hs-card hs-portal-card">
                <div className="hs-icon-box" aria-hidden="true">
                  {app.icon}
                </div>
                <h3>{app.title}</h3>
                <span className="hs-portal-card__who">{app.who}</span>
                <p>{app.desc}</p>
                {app.url ? (
                  <div className="hs-button-row hs-portal-card__actions">
                    <a className="hs-btn hs-btn--primary" href={appUrl(app.url, '/login')}>
                      Sign in
                    </a>
                    {app.signup && (
                      <a className="hs-btn hs-btn--secondary" href={appUrl(app.url, '/signup')}>
                        Create an account
                      </a>
                    )}
                  </div>
                ) : (
                  <span className="hs-portal-card__soon">Coming soon</span>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="hs-cta">
        <div className="hs-container">
          <p className="hs-eyebrow">Get started</p>
          <h2>Bringing HOP to your team?</h2>
          <p>
            Reps, dispatch, and facility accounts are set up by HOP. Start a conversation and we
            will help your professionals or organization get going.
          </p>
          <div className="hs-button-row">
            <Link className="hs-btn hs-btn--primary" to="/contact?interest=portal">
              Start a Conversation
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
