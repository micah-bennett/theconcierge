import { Link } from 'react-router-dom'
import { InfoPanel, PageHero } from './parts'

const PORTAL_CAN_DO = [
  'Submit a support request in a few clicks',
  'Track status, updates, and follow-up in one place',
  'Browse workplace, local, and community resources',
  'Message a HOP support professional when appropriate',
  'Access The Concierge by HOP for personal requests',
  'Organization dashboards with broad, non-identifying support trends',
] as const

export function PortalPage() {
  return (
    <>
      <PageHero
        eyebrow="HOP Portal"
        title="Your access point to HOP."
        lead="The HOP Portal is our secure, web-based access point—members simply log in from any browser to request support, find resources, and stay connected. No app store, no download."
      >
        <div className="hs-button-row">
          <Link className="hs-btn hs-btn--primary" to="/hop/login">
            Log in to the HOP Portal
          </Link>
          <Link className="hs-btn hs-btn--secondary" to="/hop/signup">
            Create an account
          </Link>
        </div>
      </PageHero>
      <section className="hs-section">
        <div className="hs-container hs-split">
          <InfoPanel
            heading="h2"
            title="What you can do once you log in"
            intro="The Portal turns “I need help with this” into a clear, tracked next step—handled by real HOP professionals."
            items={PORTAL_CAN_DO}
          />
          <aside>
            <p className="hs-eyebrow">Sign in</p>
            <h2>Works wherever your people are.</h2>
            <p className="hs-lead">
              Because the Portal is web-based, it works on a laptop, tablet, or phone
              browser—wherever your people already are.
            </p>
            <div className="hs-login-card">
              <span className="hs-login-card__title">Sign in to the HOP Portal</span>
              <span className="hs-login-card__sub">Welcome back. Let’s make today easier.</span>
              <Link className="hs-btn hs-btn--primary hs-login-card__btn" to="/hop/login">
                Log In
              </Link>
              <span className="hs-login-card__note">
                New to HOP? <Link to="/hop/signup">Create an account</Link>
              </span>
            </div>
          </aside>
        </div>
      </section>
      <section className="hs-cta">
        <div className="hs-container">
          <p className="hs-eyebrow">Get started</p>
          <h2>Ready to get started?</h2>
          <p>
            Log in to the HOP Portal today, or start a conversation and we will help your
            professionals or organization get set up.
          </p>
          <div className="hs-button-row">
            <Link className="hs-btn hs-btn--primary" to="/hop/login">
              Log in to the HOP Portal
            </Link>
            <Link className="hs-btn hs-btn--secondary" to="/contact?interest=portal">
              Start a Conversation
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
