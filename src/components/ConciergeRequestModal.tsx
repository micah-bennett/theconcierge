import { useCallback, useEffect, useId, useState, type FormEvent } from 'react'
import { isFirebaseConfigured } from '../firebase/envCheck'
import { submitConciergeRequest } from '../firebase/submitConciergeRequest'
import { OFFICE_PHONE_DISPLAY, OFFICE_PHONE_TEL } from '../site'

const REQUEST_TYPES = [
  'Personal errands & task management',
  'Scheduling & appointments',
  'Lifestyle & home assistance',
  'Member-rate concierge services',
  'Priority scheduling & travel coordination',
  'Ongoing professional support',
  'VIP / full-service concierge',
  'Other (describe below)',
] as const

const HEAR_ABOUT = [
  'Word of mouth',
  'Referral',
  'Search / web',
  'Social media',
  'Event or partner',
  'Other',
] as const

const PAYMENT_METHODS = ['Credit card', 'Phone payment', 'Invoice / wire', 'Other'] as const

/** Strip spaces; keep a single @ and standard email characters while typing. */
function normalizeEmailInput(value: string): string {
  return value.replace(/\s/g, '').toLowerCase()
}

function isValidEmail(value: string): boolean {
  const v = value.trim().toLowerCase()
  if (v.length < 5 || v.length > 254) return false
  if (v.includes('..') || v.startsWith('@') || v.endsWith('@')) return false
  const at = v.indexOf('@')
  if (at <= 0 || at !== v.lastIndexOf('@')) return false
  const local = v.slice(0, at)
  const domain = v.slice(at + 1)
  if (!local || !domain || !domain.includes('.')) return false
  const labels = domain.split('.')
  if (labels.some((label) => !label.length || label.length > 63)) return false
  const tld = labels[labels.length - 1]
  if (!/^[a-z]{2,}$/i.test(tld)) return false
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(local)) return false
  return labels.every((label) => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

/** YYYY-MM-DD in the user's local calendar (for `<input type="date" min>` and comparisons). */
function localDateISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const CURRENT_YEAR = new Date().getFullYear()
const MAX_REQUEST_YEAR = CURRENT_YEAR + 3

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function buildDateISO(month: string, day: string, year: string): string {
  if (!month || !day || !year || year.length !== 4) return ''
  const mo = parseInt(month, 10)
  const dy = parseInt(day, 10)
  if (!Number.isFinite(mo) || !Number.isFinite(dy) || mo < 1 || mo > 12 || dy < 1) return ''
  return `${year}-${String(mo).padStart(2, '0')}-${String(dy).padStart(2, '0')}`
}

function isValidCalendarDate(iso: string): boolean {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return false
  const y = parseInt(m[1], 10)
  const mo = parseInt(m[2], 10)
  const day = parseInt(m[3], 10)
  if (y < 1000 || y > 9999 || mo < 1 || mo > 12) return false
  return day >= 1 && day <= daysInMonth(y, mo)
}

function isTodayOrFutureISO(iso: string): boolean {
  return iso >= localDateISO(new Date())
}

type FormState = {
  firstName: string
  lastName: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  zip: string
  country: string
  phone: string
  email: string
  dateMonth: string
  dateDay: string
  dateYear: string
  hour: string
  minute: string
  ampm: 'AM' | 'PM'
  requestType: string
  details: string
  hearAboutUs: string
  paymentMethod: string
  cardholderName: string
  cardNumber: string
  expMonth: string
  expYear: string
}

const emptyForm = (): FormState => ({
  firstName: '',
  lastName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zip: '',
  country: 'United States',
  phone: '',
  email: '',
  dateMonth: '',
  dateDay: '',
  dateYear: '',
  hour: '9',
  minute: '00',
  ampm: 'AM',
  requestType: REQUEST_TYPES[0],
  details: '',
  hearAboutUs: HEAR_ABOUT[0],
  paymentMethod: '',
  cardholderName: '',
  cardNumber: '',
  expMonth: '',
  expYear: '',
})

type Props = {
  open: boolean
  onClose: () => void
}

export function ConciergeRequestModal({ open, onClose }: Props) {
  const baseId = useId()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successKind, setSuccessKind] = useState<'remote' | 'local' | null>(null)

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    setError(null)
    setSuccess(false)
    setSuccessKind(null)
  }, [open])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const timeNeeded = `${form.hour}:${form.minute} ${form.ampm}`

    const phoneDigits = digitsOnly(form.phone)
    const cardDigits = digitsOnly(form.cardNumber)
    const emailTrim = normalizeEmailInput(form.email)
    const first = form.firstName.trim()
    const last = form.lastName.trim()

    if (!first || !last) {
      setError('Please enter your first and last name.')
      setSubmitting(false)
      return
    }
    if (!isValidEmail(emailTrim)) {
      setError('Please enter a valid email (e.g. name@gmail.com).')
      setSubmitting(false)
      return
    }
    if (phoneDigits.length !== 10) {
      setError('Phone number must be exactly 10 digits (US).')
      setSubmitting(false)
      return
    }
    const zipDigits = digitsOnly(form.zip)
    if (zipDigits.length !== 5) {
      setError('ZIP code must be exactly 5 digits (NY format, e.g. 12601).')
      setSubmitting(false)
      return
    }
    const yearNum = parseInt(form.dateYear, 10)
    if (form.dateYear.length !== 4 || !Number.isFinite(yearNum)) {
      setError('Year must be exactly 4 digits (e.g. 2026).')
      setSubmitting(false)
      return
    }
    if (yearNum < CURRENT_YEAR || yearNum > MAX_REQUEST_YEAR) {
      setError(`Year must be between ${CURRENT_YEAR} and ${MAX_REQUEST_YEAR}.`)
      setSubmitting(false)
      return
    }
    const dateNeeded = buildDateISO(form.dateMonth, form.dateDay, form.dateYear)
    if (!dateNeeded || !isValidCalendarDate(dateNeeded)) {
      setError('Enter a valid month (1–12), day, and year.')
      setSubmitting(false)
      return
    }
    if (!isTodayOrFutureISO(dateNeeded)) {
      setError('Date must be today or in the future — past dates are not allowed.')
      setSubmitting(false)
      return
    }
    if (cardDigits.length > 0 && cardDigits.length !== 16) {
      setError('Credit card number must be exactly 16 digits, or leave payment blank.')
      setSubmitting(false)
      return
    }

    const expYearDigits = digitsOnly(form.expYear)
    const hasExpMonth = Boolean(form.expMonth)
    const hasExpYear = expYearDigits.length > 0
    const fullCard =
      form.paymentMethod === 'Credit card' && cardDigits.length === 16

    const validateExpYearRange = (y: number): boolean => {
      if (Number.isNaN(y) || y < CURRENT_YEAR || y > CURRENT_YEAR + 25) {
        setError(`Expiration year must be a 4-digit year between ${CURRENT_YEAR} and ${CURRENT_YEAR + 25}.`)
        setSubmitting(false)
        return false
      }
      return true
    }

    if (fullCard) {
      if (!hasExpMonth || expYearDigits.length !== 4) {
        setError('Please enter expiration month and a 4-digit year (YYYY).')
        setSubmitting(false)
        return
      }
      if (!validateExpYearRange(parseInt(expYearDigits, 10))) return
    } else if (hasExpMonth || hasExpYear) {
      if (!hasExpMonth || expYearDigits.length !== 4) {
        setError('Please enter both expiration month and a 4-digit year (YYYY), or leave both blank.')
        setSubmitting(false)
        return
      }
      if (!validateExpYearRange(parseInt(expYearDigits, 10))) return
    }

    const payload = {
      firstName: first,
      lastName: last,
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      zip: zipDigits,
      country: form.country.trim(),
      phone: phoneDigits,
      email: emailTrim,
      dateNeeded,
      timeNeeded,
      requestType: form.requestType,
      details: form.details.trim(),
      hearAboutUs: form.hearAboutUs,
      paymentMethod: form.paymentMethod.trim(),
      cardholderName: form.cardholderName.trim(),
      cardLastFour: cardDigits.length === 16 ? cardDigits.slice(-4) : '',
      expMonth: form.expMonth,
      expYear: expYearDigits.length === 4 ? expYearDigits : '',
    }

    try {
      if (isFirebaseConfigured()) {
        await submitConciergeRequest(payload)
        setSuccessKind('remote')
      } else {
        setSuccessKind('local')
      }
      setSuccess(true)
      setForm(emptyForm())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again or call us.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const id = (s: string) => `${baseId}-${s}`

  return (
    <div className="request-modal__backdrop">
      <div className="request-modal" role="dialog" aria-modal="true" aria-labelledby={id('title')}>
        <button type="button" className="request-modal__close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="request-modal__inner">
        {success ? (
          <div className="request-modal__success">
            <h2 id={id('title')} className="request-modal__title">
              Thank you
            </h2>
            {successKind === 'local' ? (
              <p className="request-modal__lead">
                This site isn&apos;t connected to our database yet. To place your request, please call{' '}
                <a href={`tel:${OFFICE_PHONE_TEL}`}>{OFFICE_PHONE_DISPLAY}</a> and we&apos;ll take care of
                you.
              </p>
            ) : (
              <p className="request-modal__lead">
                We received your request. A concierge will follow up shortly. You can also reach us at{' '}
                <a href={`tel:${OFFICE_PHONE_TEL}`}>{OFFICE_PHONE_DISPLAY}</a>.
              </p>
            )}
            <button type="button" className="request-modal__done" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <form className="request-modal__form" onSubmit={handleSubmit} noValidate>
            <div className="request-modal__header">
              <p className="request-modal__intro">We offer services customized to meet your needs.</p>
              <h2 id={id('title')} className="request-modal__title">
                Concierge Request Form
              </h2>
            </div>

            <fieldset className="request-modal__fieldset">
              <legend className="request-modal__legend">Name</legend>
              <div className="request-modal__row request-modal__row--2">
                <label className="request-modal__label" htmlFor={id('first')}>
                  <span className="request-modal__label-title">
                    First name <span className="request-modal__req">*</span>
                  </span>
                  <input
                    id={id('first')}
                    className="request-modal__input"
                    value={form.firstName}
                    onChange={(e) => update('firstName', e.target.value)}
                    autoComplete="given-name"
                    required
                  />
                </label>
                <label className="request-modal__label" htmlFor={id('last')}>
                  <span className="request-modal__label-title">
                    Last name <span className="request-modal__req">*</span>
                  </span>
                  <input
                    id={id('last')}
                    className="request-modal__input"
                    value={form.lastName}
                    onChange={(e) => update('lastName', e.target.value)}
                    autoComplete="family-name"
                    required
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="request-modal__fieldset">
              <legend className="request-modal__legend">Address</legend>
              <label className="request-modal__label" htmlFor={id('street')}>
                Street address
                <input
                  id={id('street')}
                  className="request-modal__input"
                  value={form.addressLine1}
                  onChange={(e) => update('addressLine1', e.target.value)}
                  autoComplete="street-address"
                />
              </label>
              <label className="request-modal__label" htmlFor={id('line2')}>
                Address line 2
                <input
                  id={id('line2')}
                  className="request-modal__input"
                  value={form.addressLine2}
                  onChange={(e) => update('addressLine2', e.target.value)}
                  autoComplete="address-line2"
                />
              </label>
              <div className="request-modal__row request-modal__row--2">
                <label className="request-modal__label" htmlFor={id('city')}>
                  City
                  <input
                    id={id('city')}
                    className="request-modal__input"
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    autoComplete="address-level2"
                  />
                </label>
                <label className="request-modal__label" htmlFor={id('state')}>
                  State / province / region
                  <input
                    id={id('state')}
                    className="request-modal__input"
                    value={form.state}
                    onChange={(e) => update('state', e.target.value)}
                    autoComplete="address-level1"
                  />
                </label>
              </div>
              <div className="request-modal__row request-modal__row--2">
                <label className="request-modal__label" htmlFor={id('zip')}>
                  <span className="request-modal__label-title">
                    ZIP code <span className="request-modal__req">*</span>
                  </span>
                  <input
                    id={id('zip')}
                    className="request-modal__input"
                    inputMode="numeric"
                    maxLength={5}
                    pattern="[0-9]{5}"
                    title="5-digit NY ZIP code"
                    placeholder="12601"
                    value={form.zip}
                    onChange={(e) => update('zip', digitsOnly(e.target.value).slice(0, 5))}
                    autoComplete="postal-code"
                    required
                  />
                </label>
                <label className="request-modal__label" htmlFor={id('country')}>
                  Country
                  <input
                    id={id('country')}
                    className="request-modal__input"
                    value={form.country}
                    onChange={(e) => update('country', e.target.value)}
                    autoComplete="country-name"
                  />
                </label>
              </div>
            </fieldset>

            <div className="request-modal__row request-modal__row--2">
              <label className="request-modal__label" htmlFor={id('phone')}>
                <span className="request-modal__label-title">
                  Phone <span className="request-modal__req">*</span>
                </span>
                <input
                  id={id('phone')}
                  type="tel"
                  className="request-modal__input"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="10-digit US number"
                  value={form.phone}
                  onChange={(e) => update('phone', digitsOnly(e.target.value).slice(0, 10))}
                  maxLength={10}
                  required
                  aria-describedby={id('phone-hint')}
                />
                <span id={id('phone-hint')} className="request-modal__micro">
                  Exactly 10 digits (area code + number).
                </span>
              </label>
              <label className="request-modal__label" htmlFor={id('email')}>
                <span className="request-modal__label-title">
                  Email <span className="request-modal__req">*</span>
                </span>
                <input
                  id={id('email')}
                  type="text"
                  inputMode="email"
                  className="request-modal__input"
                  value={form.email}
                  onChange={(e) => update('email', normalizeEmailInput(e.target.value))}
                  autoComplete="email"
                  placeholder="name@gmail.com"
                  spellCheck={false}
                  required
                />
              </label>
            </div>

            <fieldset className="request-modal__fieldset request-modal__fieldset--date">
              <legend className="request-modal__legend">
                Date request needs to be completed <span className="request-modal__req">*</span>
              </legend>
              <div className="request-modal__row request-modal__row--3">
                <label className="request-modal__label request-modal__label--inline" htmlFor={id('date-m')}>
                  Month
                  <input
                    id={id('date-m')}
                    className="request-modal__input"
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="MM"
                    autoComplete="off"
                    value={form.dateMonth}
                    onChange={(e) => update('dateMonth', digitsOnly(e.target.value).slice(0, 2))}
                    required
                  />
                </label>
                <label className="request-modal__label request-modal__label--inline" htmlFor={id('date-d')}>
                  Day
                  <input
                    id={id('date-d')}
                    className="request-modal__input"
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="DD"
                    autoComplete="off"
                    value={form.dateDay}
                    onChange={(e) => update('dateDay', digitsOnly(e.target.value).slice(0, 2))}
                    required
                  />
                </label>
                <label className="request-modal__label request-modal__label--inline" htmlFor={id('date-y')}>
                  Year
                  <input
                    id={id('date-y')}
                    className="request-modal__input"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="YYYY"
                    autoComplete="off"
                    value={form.dateYear}
                    onChange={(e) => update('dateYear', digitsOnly(e.target.value).slice(0, 4))}
                    required
                  />
                </label>
              </div>
              <p className="request-modal__micro request-modal__micro--date">
                Enter month, day, and year. Must be today or a future date ({CURRENT_YEAR}–{MAX_REQUEST_YEAR}).
              </p>
            </fieldset>

            <fieldset className="request-modal__fieldset request-modal__fieldset--time">
              <legend className="request-modal__legend">Time request needs to be completed</legend>
              <div className="request-modal__time">
                <label className="request-modal__label request-modal__label--inline" htmlFor={id('hour')}>
                  Hour
                  <select
                    id={id('hour')}
                    className="request-modal__select"
                    value={form.hour}
                    onChange={(e) => update('hour', e.target.value)}
                  >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="request-modal__time-sep" aria-hidden>
                  :
                </span>
                <label className="request-modal__label request-modal__label--inline" htmlFor={id('min')}>
                  Minutes
                  <select
                    id={id('min')}
                    className="request-modal__select"
                    value={form.minute}
                    onChange={(e) => update('minute', e.target.value)}
                  >
                    {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="request-modal__label request-modal__label--inline" htmlFor={id('ampm')}>
                  AM / PM
                  <select
                    id={id('ampm')}
                    className="request-modal__select"
                    value={form.ampm}
                    onChange={(e) => update('ampm', e.target.value as 'AM' | 'PM')}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </label>
              </div>
            </fieldset>

            <label className="request-modal__label" htmlFor={id('reqtype')}>
              Request
              <select
                id={id('reqtype')}
                className="request-modal__select"
                value={form.requestType}
                onChange={(e) => update('requestType', e.target.value)}
              >
                {REQUEST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="request-modal__label" htmlFor={id('details')}>
              Request details or comments
              <textarea
                id={id('details')}
                className="request-modal__textarea"
                rows={4}
                value={form.details}
                onChange={(e) => update('details', e.target.value)}
              />
            </label>

            <label className="request-modal__label" htmlFor={id('hear')}>
              How did you hear about us?
              <select
                id={id('hear')}
                className="request-modal__select"
                value={form.hearAboutUs}
                onChange={(e) => update('hearAboutUs', e.target.value)}
              >
                {HEAR_ABOUT.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="request-modal__fieldset request-modal__fieldset--payment">
              <legend className="request-modal__legend">Payment (optional)</legend>
              <label className="request-modal__label" htmlFor={id('pay')}>
                Method
                <select
                  id={id('pay')}
                  className="request-modal__select"
                  autoComplete="off"
                  value={form.paymentMethod}
                  onChange={(e) => {
                    const v = e.target.value
                    update('paymentMethod', v)
                    if (v !== 'Credit card') {
                      update('cardholderName', '')
                      update('cardNumber', '')
                      update('expMonth', '')
                      update('expYear', '')
                    }
                  }}
                >
                  <option value="">Skip — payment optional</option>
                  {PAYMENT_METHODS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              {form.paymentMethod === 'Credit card' ? (
                <>
                  <p className="request-modal__pci">
                    Only the last four digits of your card are stored with your request for reference — the
                    full number is not saved to our database. You can also pay by phone at{' '}
                    <a href={`tel:${OFFICE_PHONE_TEL}`}>{OFFICE_PHONE_DISPLAY}</a>.
                  </p>
                  <label className="request-modal__label" htmlFor={id('ch')}>
                    Cardholder name (as shown on card)
                    <input
                      id={id('ch')}
                      className="request-modal__input"
                      name="concierge_cardholder"
                      value={form.cardholderName}
                      onChange={(e) => update('cardholderName', e.target.value)}
                      autoComplete="off"
                    />
                  </label>
                  <label className="request-modal__label" htmlFor={id('cc')}>
                    Credit card number (16 digits)
                    <input
                      id={id('cc')}
                      className="request-modal__input"
                      name="concierge_card_digits"
                      inputMode="numeric"
                      maxLength={16}
                      autoComplete="off"
                      placeholder="16-digit number"
                      value={form.cardNumber}
                      onChange={(e) => update('cardNumber', digitsOnly(e.target.value).slice(0, 16))}
                    />
                  </label>
                  <div className="request-modal__row request-modal__row--2">
                    <label className="request-modal__label" htmlFor={id('expm')}>
                      Exp. month
                      <select
                        id={id('expm')}
                        className="request-modal__select"
                        autoComplete="off"
                        value={form.expMonth}
                        onChange={(e) => update('expMonth', e.target.value)}
                      >
                        <option value="">—</option>
                        {MONTHS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="request-modal__label" htmlFor={id('expy')}>
                      Exp. year (YYYY)
                      <input
                        id={id('expy')}
                        className="request-modal__input"
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        pattern="[0-9]{4}"
                        title="Enter exactly 4 digits (YYYY)"
                        autoComplete="off"
                        placeholder={String(CURRENT_YEAR)}
                        value={form.expYear}
                        onChange={(e) => update('expYear', digitsOnly(e.target.value).slice(0, 4))}
                      />
                    </label>
                  </div>
                </>
              ) : form.paymentMethod ? (
                <p className="request-modal__pci request-modal__pci--soft">
                  We&apos;ll follow up to complete payment ({form.paymentMethod.toLowerCase()}). Or call{' '}
                  <a href={`tel:${OFFICE_PHONE_TEL}`}>{OFFICE_PHONE_DISPLAY}</a>.
                </p>
              ) : null}
            </fieldset>

            {!isFirebaseConfigured() ? (
              <p className="request-modal__warn">
                Firebase is not configured — requests are not saved online yet. Add keys in{' '}
                <code>env/.env.development</code> to save submissions to Firestore.
              </p>
            ) : null}

            {error ? <p className="request-modal__error">{error}</p> : null}

            <div className="request-modal__actions">
              <button type="button" className="request-modal__btn request-modal__btn--ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="request-modal__btn request-modal__btn--primary" disabled={submitting}>
                {submitting ? 'Sending…' : 'Submit request'}
              </button>
            </div>
          </form>
        )}
        </div>
      </div>
    </div>
  )
}
