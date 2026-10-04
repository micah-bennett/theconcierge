import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { submitInquiry } from '../../api/submitInquiry'
import { INQUIRY_INTERESTS } from '../../site/inquiry'
import { PageHero } from './parts'

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }

export function ContactPage() {
  const [searchParams] = useSearchParams()
  const preselected =
    INQUIRY_INTERESTS.find((item) => item.key === searchParams.get('interest')) ??
    INQUIRY_INTERESTS[0]
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const field = (name: string) => String(new FormData(form).get(name) ?? '')

    setStatus({ kind: 'sending' })
    try {
      await submitInquiry({
        firstName: field('firstName'),
        lastName: field('lastName'),
        email: field('email'),
        organization: field('organization'),
        interest: field('interest'),
        message: field('message'),
      })
      form.reset()
      setStatus({ kind: 'sent' })
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'We could not send your inquiry.',
      })
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Start a Conversation"
        title="Tell us what would make life or work easier."
        lead="Share a little about what you need, and HOP will follow up to talk through support for organizations, professionals, and personal concierge needs."
      />
      <section className="hs-section hs-section--pale">
        <div className="hs-container">
          <form className="hs-contact-form" onSubmit={onSubmit}>
            <div className="hs-form-grid">
              <label>
                First name
                <input required name="firstName" placeholder="First name" autoComplete="given-name" />
              </label>
              <label>
                Last name
                <input required name="lastName" placeholder="Last name" autoComplete="family-name" />
              </label>
              <label>
                Email
                <input
                  required
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>
              <label>
                Organization (if applicable)
                <input name="organization" placeholder="Organization name" autoComplete="organization" />
              </label>
            </div>
            <label className="hs-form-spaced">
              I am interested in
              <select name="interest" defaultValue={preselected.label} key={preselected.key}>
                {INQUIRY_INTERESTS.map((item) => (
                  <option key={item.key}>{item.label}</option>
                ))}
              </select>
            </label>
            <label className="hs-form-spaced">
              How can HOP help?
              <textarea
                required
                name="message"
                placeholder="Tell us about the support you are looking for."
              />
            </label>
            <div className="hs-button-row">
              <button
                className="hs-btn hs-btn--primary"
                type="submit"
                disabled={status.kind === 'sending'}
              >
                {status.kind === 'sending' ? 'Sending…' : 'Send Inquiry'}
              </button>
            </div>
            {status.kind === 'sent' ? (
              <p className="hs-form-message" role="status">
                Thank you—your inquiry has been sent. HOP will be in touch shortly.
              </p>
            ) : null}
            {status.kind === 'error' ? (
              <p className="hs-form-message hs-form-message--error" role="alert">
                {status.message}
              </p>
            ) : null}
          </form>
        </div>
      </section>
    </>
  )
}
