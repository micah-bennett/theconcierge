import { Link } from 'react-router-dom'
import { InfoPanel, PageHero, Steps, type Step } from './parts'

const HOW_STEPS: ReadonlyArray<Step> = [
  {
    num: '01',
    title: 'Discover',
    desc: 'We listen to understand the people you support, the moments that create pressure, and the opportunities to make things easier.',
  },
  {
    num: '02',
    title: 'Build the experience',
    desc: 'HOP shapes an approach that may include on-site hospitality, request coordination, curated resources, and a clear communication path.',
  },
  {
    num: '03',
    title: 'Stay responsive',
    desc: 'Needs evolve. HOP is designed to gather insight, respond thoughtfully, and improve the support experience over time.',
  },
]

const PORTAL_SUPPORTS = [
  'Submit and track personalized support requests',
  'Access workplace and community resources',
  'Receive updates, reminders, and service information',
  'Connect with a HOP support professional when appropriate',
  'Help organizations understand broad, non-identifying support trends',
] as const

export function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How HOP Works"
        title="Support designed to respond to real life."
        lead="HOP combines a hospitality mindset, practical coordination, on-site service options, and a future-ready digital experience to make support more accessible."
      />
      <section className="hs-section">
        <div className="hs-container">
          <Steps steps={HOW_STEPS} />
        </div>
      </section>
      <section className="hs-section hs-section--pale">
        <div className="hs-container hs-split">
          <div>
            <h2>The HOP Portal</h2>
            <p className="hs-lead">
              The HOP Portal is the access point for HOP support—a secure, web-based app members
              log into from any browser. It is not a replacement for human service; it simply
              makes requesting and receiving help easier.
            </p>
            <div className="hs-button-row">
              <Link className="hs-btn hs-btn--primary" to="/hop/login">
                Log in to the HOP Portal
              </Link>
            </div>
          </div>
          <InfoPanel title="What the Portal supports" items={PORTAL_SUPPORTS} />
        </div>
      </section>
    </>
  )
}
