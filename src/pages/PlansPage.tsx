import { PlanTierGraphic } from '../components/PlanTierGraphic'
import { OFFICE_PHONE_DISPLAY, OFFICE_PHONE_TEL } from '../site'

export function PlansPage() {
  return (
    <section className="slide slide--plans" aria-labelledby="plans-page-heading">
      <div className="plans-page">
        <header className="slide-split__membership plans-page__intro">
          <h1 className="plans-page__title" id="plans-page-heading">
            Concierge Packages for Life, Business, and Everything in Motion
          </h1>
          <p className="plans-page__lead">
            Whether you are managing a household, leading a business, supporting a team, or building
            something of your own, time is one of your most valuable assets.
            <br />
            <br />
            The Concierge provides dependable personal, professional, and business support designed to keep
            your day moving with ease. From everyday errands and scheduling to corporate coordination,
            executive assistance, and high-level lifestyle management, our packages are built around the way
            you live, work, and lead.
          </p>
        </header>

        <div className="plans">
          <article className="plans__tier plans__tier--essential" id="essential">
            <PlanTierGraphic tier="essential" />
            <h3 className="plans__title">
              <span className="plans__title-line">Essential Concierge</span>
              <span className="plans__title-sub">8 Hours / Month</span>
            </h3>
            <p className="plans__desc">
              <strong>Everyday support for life, work, and everything in between.</strong> Best for busy
              families, working professionals, entrepreneurs, small business owners, and everyday
              operational support.
            </p>
            <p className="plans__desc">
              Essential Concierge is designed for clients who need reliable help managing the daily details
              that keep life and business moving. Whether you are balancing family responsibilities, work
              obligations, appointments, errands, or the needs of a growing business, this package gives
              you dependable support when time is limited. For families, we help create more balance at
              home. For professionals and entrepreneurs, we help remove the small but important tasks that
              interrupt your focus. From personal errands to scheduling, coordination, and lifestyle
              assistance, Essential Concierge keeps everyday responsibilities from becoming everyday stress.
            </p>
            <p className="plans__desc">
              Perfect for individuals, families, and business owners who need trusted support to keep daily
              life and operations running smoothly.
            </p>
            <p className="plans__includes-label">Support may include</p>
            <ul className="plans__list">
              <li>Personal errands and local pickups</li>
              <li>Appointment scheduling and coordination</li>
              <li>Family and household task support</li>
              <li>Small business errands</li>
              <li>Document drop-offs or pickups</li>
              <li>Vendor coordination</li>
              <li>Gift purchasing and delivery</li>
              <li>Calendar and reminder support</li>
              <li>Lifestyle and home assistance</li>
              <li>Access to concierge services at member rates</li>
            </ul>
            <p className="plans__renewal">Membership may be renewed at any time</p>
            <a className="plans__cta" href={`tel:${OFFICE_PHONE_TEL}`}>
              Request Concierge
            </a>
          </article>

          <article className="plans__tier plans__tier--pro" id="professional">
            <PlanTierGraphic tier="pro" />
            <h3 className="plans__title">
              <span className="plans__title-line">Professional Concierge</span>
              <span className="plans__title-sub">16 Hours / Month</span>
            </h3>
            <p className="plans__desc">
              <strong>Strategic support for professionals, entrepreneurs, and growing businesses.</strong>{' '}
              Best for professionals, executives, entrepreneurs, small business owners, consultants, corporate
              clients, and B2B service needs.
            </p>
            <p className="plans__desc">
              Professional Concierge is designed for clients whose schedules are full, responsibilities are
              increasing, and time must be protected. Whether you are an executive, entrepreneur, business
              owner, or corporate professional, this package provides the support needed to stay focused,
              prepared, and moving forward. When life and business start moving quickly, we move right
              alongside you. From coordinating meetings and managing personal requests to handling business
              errands, travel logistics, client needs, and vendor communication, our role is to support your
              momentum with professionalism, discretion, and care.
            </p>
            <p className="plans__desc">
              Ideal for professionals and businesses that need dependable support behind the scenes so they
              can stay focused on growth, leadership, and results.
            </p>
            <p className="plans__includes-label">Support may include</p>
            <ul className="plans__list">
              <li>Executive-style personal assistance</li>
              <li>Business errands and professional task support</li>
              <li>Calendar and appointment coordination</li>
              <li>Meeting and event preparation</li>
              <li>Client gift coordination</li>
              <li>Travel and transportation planning</li>
              <li>Vendor and service provider coordination</li>
              <li>Corporate lunch, meeting, or event support</li>
              <li>Office supply pickups and deliveries</li>
              <li>Personal lifestyle management</li>
              <li>Priority scheduling and concierge support</li>
            </ul>
            <p className="plans__renewal">Membership may be renewed at any time</p>
            <a className="plans__cta" href={`tel:${OFFICE_PHONE_TEL}`}>
              Request Concierge
            </a>
          </article>

          <article className="plans__tier plans__tier--vip" id="vip">
            <PlanTierGraphic tier="vip" />
            <h3 className="plans__title plans__title--vip">
              <span className="plans__title-line plans__title-line--vipstack">
                <span className="plans__title-line-vip">VIP</span>
                <span className="plans__title-line-after">Concierge</span>
              </span>
              <span className="plans__title-sub">Custom Hours / Full-Service</span>
            </h3>
            <p className="plans__desc">
              <strong>White-glove execution for clients and businesses that expect excellence.</strong> Best
              for executives, high-level entrepreneurs, corporate leaders, VIP clients, luxury lifestyle
              clients, and businesses that require priority execution.
            </p>
            <p className="plans__desc">
              VIP Concierge is designed for clients whose lifestyle, leadership role, or business demands
              require precision, discretion, and constant readiness. For these clients, success is not
              optional. Details matter. Timing matters. Execution matters. Whether serving an executive,
              entrepreneur, corporate client, or private household, we move in alignment with your
              priorities. We anticipate needs, manage requests, coordinate logistics, and execute with
              confidence so you can focus on what matters most.
            </p>
            <p className="plans__desc">
              This package is for clients who require more than assistance. They require a trusted concierge
              partner who understands urgency, confidentiality, and the importance of getting things done the
              right way.
            </p>
            <p className="plans__desc">
              Created for executives, entrepreneurs, corporations, and VIP clients who value precision,
              discretion, and the confidence of knowing every detail is being handled.
            </p>
            <p className="plans__includes-label">Support may include</p>
            <ul className="plans__list">
              <li>Priority concierge support</li>
              <li>Executive and VIP lifestyle management</li>
              <li>Corporate and B2B coordination</li>
              <li>High-level scheduling and logistics</li>
              <li>Private errands and special requests</li>
              <li>Travel, transportation, and itinerary support</li>
              <li>Event, dining, and experience coordination</li>
              <li>Luxury gifting and client appreciation support</li>
              <li>Vendor, household, and office coordination</li>
              <li>Discreet handling of sensitive requests</li>
              <li>After-hours or extended availability by arrangement</li>
            </ul>
            <p className="plans__renewal">Custom arrangements available upon request</p>
            <a className="plans__cta plans__cta--vip" href={`tel:${OFFICE_PHONE_TEL}`}>
              Request Concierge
            </a>
          </article>
        </div>

        <div
          className="service-details__block plans-policies"
          aria-labelledby="plans-policies-heading"
        >
          <h4 className="service-details__heading" id="plans-policies-heading">
            Additional Policies
          </h4>
          <ul className="service-details__list">
            <li>
              <strong>Gratuity:</strong> 18%
            </li>
            <li>
              <strong>Mileage:</strong> Additional charges per mile outside a 20-mile radius
            </li>
            <li>Returned checks are subject to applicable bank fees</li>
          </ul>
        </div>

        <section className="a-la-carte" aria-labelledby="alacarte-heading">
          <h3 className="a-la-carte__title" id="alacarte-heading">
            A La Carte Services
          </h3>
          <p className="a-la-carte__subtitle">Flexible, Hourly Support</p>
          <p className="a-la-carte__desc">
            For clients who prefer flexibility without a monthly membership, concierge services are
            available on an hourly basis.
          </p>
          <p className="a-la-carte__note">Available upon request</p>
          <a
            className="plans__cta plans__cta--vip a-la-carte__cta"
            href={`tel:${OFFICE_PHONE_TEL}`}
          >
            Call to Inquire
          </a>
        </section>

        <section className="contact-block plans-page__contact" aria-labelledby="contact-cta-heading">
          <h3 className="contact-block__title" id="contact-cta-heading">
            Call to learn more or request your concierge
          </h3>
          <a className="contact-block__phone" href={`tel:${OFFICE_PHONE_TEL}`}>
            {OFFICE_PHONE_DISPLAY}
          </a>
        </section>

        <section
          className="service-details plans-page__service-details"
          aria-labelledby="service-details-heading"
        >
          <h3 className="service-details__main-title" id="service-details-heading">
            Service details
          </h3>

          <div className="service-details__block">
            <h4 className="service-details__heading">Payment &amp; Service Information</h4>
            <ul className="service-details__list">
              <li>All major credit cards accepted (Visa, Mastercard, Discover, American Express)</li>
              <li>Hourly service rates do not include purchases made on your behalf</li>
              <li>A valid payment method is required at the time of request</li>
              <li>Membership and services are fully customizable</li>
            </ul>
          </div>

          <div className="service-details__block">
            <h4 className="service-details__heading">Privacy Commitment</h4>
            <p className="service-details__prose">
              The Concierge values your privacy. All client information is handled with complete discretion
              and will never be shared or sold.
            </p>
          </div>
        </section>
      </div>
    </section>
  )
}
