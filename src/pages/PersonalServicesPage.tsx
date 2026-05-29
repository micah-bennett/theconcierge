import {
  PersonalServiceGraphic,
  type PersonalServiceIllustration,
} from '../components/PersonalServiceGraphic'

const SECTIONS: readonly {
  title: string
  body: string
  items: readonly string[]
  illustration: PersonalServiceIllustration
}[] = [
  {
    title: 'Calendar & Life Scheduling',
    illustration: 'clock',
    body:
      "We manage your appointments, coordinate with service providers, set reminders, and handle all the scheduling communication you don't have time for. Doctor visits, contractor calls, school pickups — we own the calendar.",
    items: [
      'Medical & specialist appointments',
      'Home service scheduling (plumbers, HVAC, repairs)',
      'School, tutor & activity coordination',
      'Travel itinerary management',
    ],
  },
  {
    title: 'Lifestyle & Wellness Coordination',
    illustration: 'wellness',
    body:
      "Your wellness routine shouldn't be one more thing to manage. We handle booking, coordination, and follow-up across your health and lifestyle needs — gym memberships, massage therapy, nutrition consultations, and more.",
    items: [
      'Wellness appointment booking',
      'Pharmacy & prescription pickups',
      'Fitness class & trainer coordination',
      'Meal prep service scheduling',
    ],
  },
  {
    title: 'Event & Experience Planning',
    illustration: 'event',
    body:
      "Whether it's a private dinner, a birthday weekend, a corporate outing, or tickets to a sold-out show — we handle the research, reservations, and logistics from start to finish.",
    items: [
      'Restaurant reservations & private dining',
      'Event tickets & venue access',
      'Birthday, anniversary & milestone planning',
      'Corporate team events & off-sites',
    ],
  },
  {
    title: 'Executive Personal Assistant',
    illustration: 'assistant',
    body:
      'For professionals who need real support beyond a calendar app. We act as your remote personal assistant — fielding calls, drafting communications, researching vendors, and keeping every loose end tied.',
    items: [
      'Vendor & contractor research',
      'Inbox & communication management',
      'Shopping, gifting & returns',
      'Research & information gathering',
    ],
  },
  {
    title: 'Home & Property Oversight',
    illustration: 'home',
    body:
      'Your home deserves the same attention as everything else. We coordinate with service providers, supervise work, handle vendor communication, and ensure everything runs without you having to be there.',
    items: [
      'Contractor & repair coordination',
      'House-sitting & property check-ins',
      'Move coordination & setup support',
      'Seasonal home task management',
    ],
  },
  {
    title: 'Travel & Getaway Support',
    illustration: 'travel',
    body:
      'From a weekend escape in the Hudson Valley to a full family vacation, we handle the logistics so you experience the journey — not the chaos behind it.',
    items: [
      'Hotel & accommodation research',
      'Activity & excursion booking',
      'Pre-trip logistics & packing coordination',
      'On-trip support & local recommendations',
    ],
  },
]

export function PersonalServicesPage() {
  return (
    <section className="slide slide--services" aria-labelledby="services-page-heading">
      <div className="services-page">
        <header className="services-page__hero">
          <h1 className="plans-page__title" id="services-page-heading">
            Personal Services
          </h1>
          <p className="plans-page__lead">
            Your personal concierge handles the tasks, errands, and coordination that consume your most
            valuable resource — time.
          </p>
        </header>

        <p className="services-page__what-label">What We Handle</p>

        <div className="services-page__spotlight">
          <h2 className="services-page__spotlight-heading">
            <span className="plans__title-line">Modern Life, Fully Managed</span>
          </h2>
          <p className="plans__desc services-page__spotlight-desc">
            Forget the generic errand-list model. We plug into your life as a genuine personal support
            system — proactive, discreet, and built for the pace of modern life and whatever comes next.
          </p>
        </div>

        <div className="services-page__grid">
          {SECTIONS.map((section) => (
            <article key={section.title} className="services-card">
              <div className="services-card__icon-wrap">
                <PersonalServiceGraphic
                  illustration={section.illustration}
                  className="services-card__icon services-card__icon--service-graphic"
                />
              </div>
              <h3 className="plans__title">
                <span className="plans__title-line">{section.title}</span>
              </h3>
              <p className="plans__desc">{section.body}</p>
              <p className="plans__includes-label">What&apos;s included:</p>
              <ul className="plans__list">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
