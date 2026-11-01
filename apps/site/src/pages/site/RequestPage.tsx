import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { submitInstantRequest } from '../../api/submitRequest'
import {
  CONCIERGE_REQUEST_TYPES,
  FLIGHT_REQUEST_TYPES,
  HEAR_ABOUT_US,
  PAYMENT_METHODS,
} from '../../site/conciergeRequest'
import { appUrl, CONCIERGE_URL } from '../../site/portalUrls'
import { PageHero } from './parts'

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }

/** Today as YYYY-MM-DD in the visitor's own time zone (the server re-checks against New York). */
function todayLocal(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** "15:05" from <input type="time"> becomes "3:05 PM". */
function toTwelveHour(value: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value)
  if (!match) return ''
  const hour = Number(match[1])
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`
}

function Required() {
  return (
    <span className="hs-required" aria-hidden="true">
      {' '}*
    </span>
  )
}

export function RequestPage() {
  const [searchParams] = useSearchParams()
  const typeParam = searchParams.get('type') ?? ''
  const preselectedType = (CONCIERGE_REQUEST_TYPES as ReadonlyArray<string>).includes(typeParam)
    ? typeParam
    : ''

  const [requestType, setRequestType] = useState(preselectedType)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const showFlight = FLIGHT_REQUEST_TYPES.includes(requestType)
  const showCard = paymentMethod === 'card'

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const field = (name: string) => String(formData.get(name) ?? '').trim()

    setStatus({ kind: 'sending' })
    try {
      await submitInstantRequest({
        firstName: field('firstName'),
        lastName: field('lastName'),
        phone: field('phone'),
        email: field('email'),
        requestType: field('requestType'),
        dateNeeded: field('dateNeeded'),
        timeNeeded: toTwelveHour(field('timeNeeded')),
        details: field('details'),
        address: {
          line1: field('addressLine1'),
          line2: field('addressLine2'),
          city: field('city'),
          state: field('state'),
          zip: field('zip'),
        },
        flight: showFlight
          ? {
              airline: field('airline'),
              flightNumber: field('flightNumber'),
              airport: field('airport'),
              direction: field('direction'),
              time: toTwelveHour(field('flightTime')),
              passengers: field('passengers'),
              bags: field('bags'),
            }
          : null,
        payment: {
          method: field('paymentMethod'),
          cardholderName: showCard ? field('cardholderName') : '',
          cardLast4: showCard ? field('cardLast4') : '',
        },
        hearAboutUs: field('hearAboutUs'),
        company: field('company'),
      })
      form.reset()
      setRequestType('')
      setPaymentMethod('')
      setStatus({ kind: 'sent' })
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'We could not send your request.',
      })
    }
  }

  return (
    <>
      {/* [CONFIRM] new instant request copy, review with leadership */}
      <PageHero
        eyebrow="The Concierge by HOP"
        title="Request once, no account needed."
        lead="Tell us what you need and when. A member of the HOP team will follow up to confirm the details."
      >
        {CONCIERGE_URL ? (
          <p className="hs-request-portal-link">
            Want to track your requests?{' '}
            <a href={appUrl(CONCIERGE_URL, '/signup')}>Create a Concierge Portal account.</a>
          </p>
        ) : null}
      </PageHero>
      <section className="hs-section hs-section--pale">
        <div className="hs-container">
          {status.kind === 'sent' ? (
            <div className="hs-contact-form">
              <p className="hs-form-message" role="status">
                Thank you. We received your request and our team will follow up shortly.
              </p>
              <div className="hs-button-row">
                <button
                  type="button"
                  className="hs-btn hs-btn--secondary"
                  onClick={() => setStatus({ kind: 'idle' })}
                >
                  Send another request
                </button>
                <Link className="hs-btn hs-btn--primary" to="/concierge">
                  Back to The Concierge
                </Link>
              </div>
            </div>
          ) : (
            <form className="hs-contact-form" onSubmit={onSubmit}>
              <p className="hs-form-note">
                Fields marked <span className="hs-required">*</span> are required.
              </p>
              <div className="hs-form-grid">
                <label>
                  <span>
                    First name
                    <Required />
                  </span>
                  <input required name="firstName" autoComplete="given-name" maxLength={60} />
                </label>
                <label>
                  <span>
                    Last name
                    <Required />
                  </span>
                  <input required name="lastName" autoComplete="family-name" maxLength={60} />
                </label>
                <label>
                  <span>
                    Phone
                    <Required />
                  </span>
                  <input
                    required
                    type="tel"
                    name="phone"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(555) 555-5555"
                    pattern="[0-9\s\(\)\+\.\-]{10,30}"
                    title="Enter a 10-digit phone number"
                    maxLength={30}
                  />
                </label>
                <label>
                  <span>
                    Email
                    <Required />
                  </span>
                  <input
                    required
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    maxLength={200}
                  />
                </label>
              </div>

              <label className="hs-form-spaced">
                <span>
                  Request
                  <Required />
                </span>
                <select
                  required
                  name="requestType"
                  value={requestType}
                  onChange={(event) => setRequestType(event.target.value)}
                >
                  <option value="" disabled>
                    Choose what you need help with
                  </option>
                  {CONCIERGE_REQUEST_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <div className="hs-form-grid hs-form-spaced">
                <label>
                  <span>
                    Date request needs to be completed
                    <Required />
                  </span>
                  <input required type="date" name="dateNeeded" min={todayLocal()} />
                </label>
                <label>
                  Time
                  <input type="time" name="timeNeeded" />
                </label>
              </div>

              <label className="hs-form-spaced">
                <span>
                  Request details or comments
                  <Required />
                </span>
                <textarea
                  required
                  name="details"
                  maxLength={2000}
                  placeholder="Tell us what you need, and anything that will help us get it right."
                />
              </label>

              <fieldset className="hs-fieldset">
                <legend>Address</legend>
                <label>
                  Street address
                  <input name="addressLine1" autoComplete="address-line1" maxLength={160} />
                </label>
                <label className="hs-form-spaced">
                  Address line 2
                  <input name="addressLine2" autoComplete="address-line2" maxLength={160} />
                </label>
                <div className="hs-form-grid hs-form-grid--3 hs-form-spaced">
                  <label>
                    City
                    <input name="city" autoComplete="address-level2" maxLength={80} />
                  </label>
                  <label>
                    State
                    <input name="state" autoComplete="address-level1" maxLength={60} />
                  </label>
                  <label>
                    ZIP code
                    <input
                      name="zip"
                      autoComplete="postal-code"
                      inputMode="numeric"
                      pattern="\d{5}(-\d{4})?"
                      title="Enter a 5-digit ZIP code"
                      maxLength={10}
                    />
                  </label>
                </div>
              </fieldset>

              {showFlight ? (
                <fieldset className="hs-fieldset">
                  <legend>Flight</legend>
                  <div className="hs-form-grid">
                    <label>
                      Airline
                      <input name="airline" maxLength={60} />
                    </label>
                    <label>
                      Flight number
                      <input name="flightNumber" maxLength={20} />
                    </label>
                    <label>
                      Airport
                      <input name="airport" maxLength={80} />
                    </label>
                    <label>
                      Departing or arriving
                      <select name="direction" defaultValue="">
                        <option value="">Choose one</option>
                        <option value="departure">Departing</option>
                        <option value="arrival">Arriving</option>
                      </select>
                    </label>
                    <label>
                      Flight time
                      <input type="time" name="flightTime" />
                    </label>
                    <div className="hs-form-grid">
                      <label>
                        Passengers
                        <input type="number" name="passengers" min={1} max={99} inputMode="numeric" />
                      </label>
                      <label>
                        Bags
                        <input type="number" name="bags" min={0} max={99} inputMode="numeric" />
                      </label>
                    </div>
                  </div>
                </fieldset>
              ) : null}

              <fieldset className="hs-fieldset">
                <legend>Payment (optional)</legend>
                <p className="hs-form-note">
                  We never collect your full card number online. A member of our team will call to
                  complete payment securely.
                </p>
                <label className="hs-form-spaced">
                  Method
                  <select
                    name="paymentMethod"
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                  >
                    {PAYMENT_METHODS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {showCard ? (
                  <div className="hs-form-grid hs-form-spaced">
                    <label>
                      Cardholder name
                      <input name="cardholderName" autoComplete="off" maxLength={80} />
                    </label>
                    <label>
                      Last 4 digits of card
                      <input
                        name="cardLast4"
                        autoComplete="off"
                        inputMode="numeric"
                        pattern="\d{4}"
                        title="Enter only the last 4 digits"
                        maxLength={4}
                      />
                    </label>
                  </div>
                ) : null}
              </fieldset>

              <label className="hs-form-spaced">
                How did you hear about us?
                <select name="hearAboutUs" defaultValue="">
                  <option value="">Choose one</option>
                  {HEAR_ABOUT_US.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              {/* Honeypot: hidden from people and assistive tech. Bots that fill it get a quiet 200. */}
              <div className="hs-honeypot" aria-hidden="true">
                <label>
                  Company
                  <input name="company" tabIndex={-1} autoComplete="off" />
                </label>
              </div>

              <div className="hs-button-row">
                <button
                  className="hs-btn hs-btn--primary"
                  type="submit"
                  disabled={status.kind === 'sending'}
                >
                  {status.kind === 'sending' ? 'Sending…' : 'Send Request'}
                </button>
              </div>
              {status.kind === 'error' ? (
                <p className="hs-form-message hs-form-message--error" role="alert">
                  {status.message}
                </p>
              ) : null}
            </form>
          )}
        </div>
      </section>
    </>
  )
}
