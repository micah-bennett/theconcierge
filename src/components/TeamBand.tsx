import type { CSSProperties } from 'react'

const BAND_IMAGE = '/team-band-1600.webp'
const BAND_SRCSET = '/team-band-900.webp 900w, /team-band-1600.webp 1600w'

const PROOF = [
  {
    title: 'Never one calendar',
    body: 'Requests are covered by a team, so availability does not hinge on any single person.',
  },
  {
    title: 'Trained and certified',
    body: 'CPR, AED, First Aid and Narcan certified, with HIPAA-aware handling for healthcare work.',
  },
  {
    title: 'One point of contact',
    body: 'You make one request. We coordinate the vendors, timing and hand-offs behind it.',
  },
] as const

/**
 * The shared "there is a team behind this" moment.
 *
 * This is the brand's answer to leadership's brief — the site used to lead with
 * a single solo portrait, which read as one person rather than a company. Used
 * on the homepage and every inner marketing page.
 */
export function TeamBand({
  heading = 'A team behind every request',
  lead = 'The Concierge is a bench of trained professionals across transportation, healthcare logistics, errands and executive support — so the answer is yes whenever you call.',
}: {
  heading?: string
  lead?: string
}) {
  return (
    <section className="team-band" aria-labelledby="team-band-heading">
      <div className="team-band__inner">
        <div className="team-band__media motion-reveal">
          <img
            className="team-band__img"
            src={BAND_IMAGE}
            srcSet={BAND_SRCSET}
            sizes="(max-width: 960px) 100vw, 50vw"
            alt="Members of The Concierge team"
            width={1855}
            height={848}
            loading="lazy"
            decoding="async"
          />
        </div>

        <div className="team-band__body">
          <p className="tc-eyebrow motion-reveal">Our team</p>
          <h2 className="team-band__title motion-reveal" id="team-band-heading">
            {heading}
          </h2>
          <p className="team-band__lead motion-reveal">{lead}</p>

          <ul className="team-band__proof">
            {PROOF.map((item, i) => (
              <li
                key={item.title}
                className="team-band__proof-item motion-reveal"
                style={{ '--motion-delay': `${80 + i * 90}ms` } as CSSProperties}
              >
                <h3 className="team-band__proof-title">{item.title}</h3>
                <p className="team-band__proof-body">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
