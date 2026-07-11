import { useCallback, useId, useRef, useState, type FormEvent } from 'react'
import { submitConciergeRequest } from '../../api/submitConciergeRequest'
import { OFFICE_PHONE_DISPLAY, OFFICE_PHONE_TEL } from '../../site'
import { ReliefCallSidebar } from './ReliefCallSidebar'

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

const HEAR_ABOUT = ['Word of mouth', 'Referral', 'Search / web', 'Social media', 'Event or partner', 'Other'] as const

const PAYMENT_METHODS = ['Credit card', 'Phone payment', 'Invoice / wire', 'Other'] as const

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
  if (!/^[a-z0-9](?:[a-z0-9.+_%+-]*[a-z0-9])?$/i.test(local)) return false
  return labels.every((label) => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const CURRENT_YEAR = new Date().getFullYear()

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

function parseLocalISODate(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function isTodayOrFutureISO(iso: string): boolean {
  const chosen = parseLocalISODate(iso)
  if (!chosen) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  chosen.setHours(0, 0, 0, 0)
  return chosen >= today
}

function time12hToMinutes(hour: string, minute: string, ampm: 'AM' | 'PM'): number | null {
  const h = parseInt(hour, 10)
  const m = parseInt(minute, 10)
  if (!Number.isFinite(h) || h < 1 || h > 12 || !Number.isFinite(m) || m < 0 || m > 59) return null
  let hours24 = h % 12
  if (ampm === 'PM') hours24 += 12
  return hours24 * 60 + m
}

function isScheduledDateTimeValid(iso: string, hour: string, minute: string, ampm: 'AM' | 'PM'): boolean {
  const date = parseLocalISODate(iso)
  const chosenMinutes = time12hToMinutes(hour, minute, ampm)
  if (!date || chosenMinutes === null) return false

  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  if (date > today) return true
  if (date < today) return false

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  return chosenMinutes > nowMinutes
}

type FormState = {
  path: 'individual' | 'facility'
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

function defaultDateParts(): Pick<FormState, 'dateMonth' | 'dateDay' | 'dateYear'> {
  const d = new Date()
  return {
    dateMonth: String(d.getMonth() + 1).padStart(2, '0'),
    dateDay: String(d.getDate()).padStart(2, '0'),
    dateYear: String(d.getFullYear()),
  }
}

function defaultTimeParts(): Pick<FormState, 'hour' | 'minute' | 'ampm'> {
  const now = new Date()
  const total = now.getHours() * 60 + now.getMinutes() + 1
  if (total >= 24 * 60) return { hour: '11', minute: '45', ampm: 'PM' }
  const hours24 = Math.floor(total / 60)
  const mins = total % 60
  const ampm: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM'
  let h12 = hours24 % 12
  if (h12 === 0) h12 = 12
  return { hour: String(h12), minute: String(mins).padStart(2, '0'), ampm }
}

const emptyForm = (): FormState => ({
  path: 'individual',
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
  ...defaultDateParts(),
  ...defaultTimeParts(),
  requestType: REQUEST_TYPES[0],
  details: '',
  hearAboutUs: HEAR_ABOUT[0],
  paymentMethod: '',
  cardholderName: '',
  cardNumber: '',
  expMonth: '',
  expYear: '',
})

export function RequestSection() {
  const baseId = useId()
  const dateFieldRef = useRef<HTMLFieldSetElement>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateError, setDateError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError(null)
    if (['dateMonth', 'dateDay', 'dateYear', 'hour', 'minute', 'ampm'].includes(key)) {
      setDateError(null)
    }
  }, [])

  const showFormError = useCallback((message: string, opts?: { scrollToDate?: boolean }) => {
    setError(message)
    if (opts?.scrollToDate) {
      setDateError(message)
      requestAnimationFrame(() => {
        dateFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setDateError(null)
    setSubmitting(true)

    try {
      const timeNeeded = `${form.hour}:${form.minute} ${form.ampm}`
      const phoneDigits = digitsOnly(form.phone)
      const cardDigits = digitsOnly(form.cardNumber)
      const emailTrim = normalizeEmailInput(form.email)
      const first = form.firstName.trim()
      const last = form.lastName.trim()

      if (!first || !last) {
        showFormError('Please enter your first and last name.')
        return
      }
      if (!isValidEmail(emailTrim)) {
        showFormError('Please enter a valid email (e.g. name@gmail.com).')
        return
      }
      if (phoneDigits.length !== 10) {
        showFormError('Phone number must be exactly 10 digits (US).')
        return
      }
      const zipDigits = digitsOnly(form.zip)
      if (zipDigits.length !== 5) {
        showFormError('ZIP code must be exactly 5 digits (e.g. 12601).')
        return
      }
      const yearNum = parseInt(form.dateYear, 10)
      if (form.dateYear.length !== 4 || !Number.isFinite(yearNum)) {
        showFormError('Year must be exactly 4 digits (e.g. 2026).', { scrollToDate: true })
        return
      }
      const dateNeeded = buildDateISO(form.dateMonth, form.dateDay, form.dateYear)
      if (!dateNeeded || !isValidCalendarDate(dateNeeded)) {
        showFormError('Enter a valid month (1–12), day, and year.', { scrollToDate: true })
        return
      }
      if (!isTodayOrFutureISO(dateNeeded)) {
        showFormError('Date must be today or in the future — past dates are not allowed.', { scrollToDate: true })
        return
      }
      if (!isScheduledDateTimeValid(dateNeeded, form.hour, form.minute, form.ampm)) {
        showFormError('For today, choose a time later than the current time. Pick a future date or a later time.', {
          scrollToDate: true,
        })
        return
      }
      if (cardDigits.length > 0 && cardDigits.length !== 16) {
        showFormError('Credit card number must be exactly 16 digits, or leave payment blank.')
        return
      }

      const expYearDigits = digitsOnly(form.expYear)
      const hasExpMonth = Boolean(form.expMonth)
      const hasExpYear = expYearDigits.length > 0
      const fullCard = form.paymentMethod === 'Credit card' && cardDigits.length === 16

      const validateExpYearRange = (y: number): boolean => {
        if (Number.isNaN(y) || y < CURRENT_YEAR || y > CURRENT_YEAR + 25) {
          showFormError(`Expiration year must be a 4-digit year between ${CURRENT_YEAR} and ${CURRENT_YEAR + 25}.`)
          return false
        }
        return true
      }

      if (fullCard) {
        if (!hasExpMonth || expYearDigits.length !== 4) {
          showFormError('Please enter expiration month and a 4-digit year (YYYY).')
          return
        }
        if (!validateExpYearRange(parseInt(expYearDigits, 10))) return
      } else if (hasExpMonth || hasExpYear) {
        if (!hasExpMonth || expYearDigits.length !== 4) {
          showFormError('Please enter both expiration month and a 4-digit year (YYYY), or leave both blank.')
          return
        }
        if (!validateExpYearRange(parseInt(expYearDigits, 10))) return
      }

      await submitConciergeRequest({
        path: form.path,
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
      })
      setSuccess(true)
      setForm(emptyForm())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again or call us.')
    } finally {
      setSubmitting(false)
    }
  }

  const id = (s: string) => `${baseId}-${s}`

  return (
    <section className="mkt-request" id="request" aria-labelledby="request-heading">
      <div className="mkt-request__inner">
        <div className="mkt-request__header">
          <p className="mkt-eyebrow">No App Required</p>
          <h2 id="request-heading" className="mkt-section-title">
            Place a Request Online
          </h2>
          <p className="mkt-section-sub" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
            Fill out the form below for a one-time service request. We&apos;ll confirm within 2 hours.
          </p>
        </div>

        <div className="mkt-request__layout">
          {success ? (
            <div className="mkt-request__success">
              <h3>Thank you</h3>
              <p>
                We received your request and our team will follow up shortly. You can also reach us at{' '}
                <a href={`tel:${OFFICE_PHONE_TEL}`}>{OFFICE_PHONE_DISPLAY}</a>.
              </p>
            </div>
          ) : (
            <form className="mkt-form" onSubmit={handleSubmit} noValidate>
              <div className="mkt-toggle-row">
                <span className="mkt-toggle-label">I am a:</span>
                <div className="mkt-toggle-btns">
                  <button
                    type="button"
                    className={`mkt-toggle-btn${form.path === 'individual' ? ' mkt-toggle-btn--active' : ''}`}
                    onClick={() => update('path', 'individual')}
                  >
                    Nurse / Doctor / Caregiver
                  </button>
                  <button
                    type="button"
                    className={`mkt-toggle-btn${form.path === 'facility' ? ' mkt-toggle-btn--active' : ''}`}
                    onClick={() => update('path', 'facility')}
                  >
                    Hospital / Facility
                  </button>
                </div>
              </div>

              <fieldset className="mkt-fieldset">
                <legend className="mkt-legend">Your Name</legend>
                <div className="mkt-row mkt-row--2">
                  <label className="mkt-field" htmlFor={id('first')}>
                    <span>
                      First name <span className="mkt-req">*</span>
                    </span>
                    <input
                      id={id('first')}
                      value={form.firstName}
                      onChange={(e) => update('firstName', e.target.value)}
                      autoComplete="given-name"
                      required
                    />
                  </label>
                  <label className="mkt-field" htmlFor={id('last')}>
                    <span>
                      Last name <span className="mkt-req">*</span>
                    </span>
                    <input
                      id={id('last')}
                      value={form.lastName}
                      onChange={(e) => update('lastName', e.target.value)}
                      autoComplete="family-name"
                      required
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="mkt-fieldset">
                <legend className="mkt-legend">
                  Address <span style={{ fontWeight: 400, textTransform: 'none' }}>(service/pickup location)</span>
                </legend>
                <label className="mkt-field" htmlFor={id('street')}>
                  <span>Street address</span>
                  <input
                    id={id('street')}
                    value={form.addressLine1}
                    onChange={(e) => update('addressLine1', e.target.value)}
                    autoComplete="street-address"
                  />
                </label>
                <div className="mkt-row mkt-row--3">
                  <label className="mkt-field" htmlFor={id('city')}>
                    <span>City</span>
                    <input id={id('city')} value={form.city} onChange={(e) => update('city', e.target.value)} autoComplete="address-level2" />
                  </label>
                  <label className="mkt-field" htmlFor={id('state')}>
                    <span>State</span>
                    <input id={id('state')} value={form.state} onChange={(e) => update('state', e.target.value)} autoComplete="address-level1" />
                  </label>
                  <label className="mkt-field" htmlFor={id('zip')}>
                    <span>
                      ZIP <span className="mkt-req">*</span>
                    </span>
                    <input
                      id={id('zip')}
                      inputMode="numeric"
                      maxLength={5}
                      placeholder="12601"
                      value={form.zip}
                      onChange={(e) => update('zip', digitsOnly(e.target.value).slice(0, 5))}
                      autoComplete="postal-code"
                      required
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="mkt-fieldset">
                <legend className="mkt-legend">Contact Information</legend>
                <div className="mkt-row mkt-row--2">
                  <label className="mkt-field" htmlFor={id('phone')}>
                    <span>
                      Phone <span className="mkt-req">*</span>
                    </span>
                    <input
                      id={id('phone')}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="10-digit US number"
                      value={form.phone}
                      onChange={(e) => update('phone', digitsOnly(e.target.value).slice(0, 10))}
                      maxLength={10}
                      required
                    />
                  </label>
                  <label className="mkt-field" htmlFor={id('email')}>
                    <span>
                      Email <span className="mkt-req">*</span>
                    </span>
                    <input
                      id={id('email')}
                      type="text"
                      inputMode="email"
                      value={form.email}
                      onChange={(e) => update('email', normalizeEmailInput(e.target.value))}
                      autoComplete="email"
                      placeholder="name@gmail.com"
                      spellCheck={false}
                      required
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset
                ref={dateFieldRef}
                className={`mkt-fieldset${dateError ? ' mkt-field--invalid' : ''}`}
              >
                <legend className="mkt-legend">
                  When do you need this completed? <span className="mkt-req">*</span>
                </legend>
                <div className="mkt-row mkt-row--3">
                  <label className="mkt-field" htmlFor={id('date-m')}>
                    <span>Month</span>
                    <input
                      id={id('date-m')}
                      inputMode="numeric"
                      maxLength={2}
                      placeholder="MM"
                      value={form.dateMonth}
                      onChange={(e) => update('dateMonth', digitsOnly(e.target.value).slice(0, 2))}
                      required
                    />
                  </label>
                  <label className="mkt-field" htmlFor={id('date-d')}>
                    <span>Day</span>
                    <input
                      id={id('date-d')}
                      inputMode="numeric"
                      maxLength={2}
                      placeholder="DD"
                      value={form.dateDay}
                      onChange={(e) => update('dateDay', digitsOnly(e.target.value).slice(0, 2))}
                      required
                    />
                  </label>
                  <label className="mkt-field" htmlFor={id('date-y')}>
                    <span>Year</span>
                    <input
                      id={id('date-y')}
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="YYYY"
                      value={form.dateYear}
                      onChange={(e) => update('dateYear', digitsOnly(e.target.value).slice(0, 4))}
                      required
                    />
                  </label>
                </div>
                <div className="mkt-row mkt-row--3">
                  <label className="mkt-field" htmlFor={id('hour')}>
                    <span>Hour</span>
                    <select id={id('hour')} value={form.hour} onChange={(e) => update('hour', e.target.value)}>
                      {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="mkt-field" htmlFor={id('min')}>
                    <span>Minutes</span>
                    <select id={id('min')} value={form.minute} onChange={(e) => update('minute', e.target.value)}>
                      {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="mkt-field" htmlFor={id('ampm')}>
                    <span>AM / PM</span>
                    <select id={id('ampm')} value={form.ampm} onChange={(e) => update('ampm', e.target.value as 'AM' | 'PM')}>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </label>
                </div>
                {dateError ? (
                  <p className="mkt-field-error" role="alert">
                    {dateError}
                  </p>
                ) : null}
              </fieldset>

              <fieldset className="mkt-fieldset">
                <legend className="mkt-legend">Request Details</legend>
                <label className="mkt-field" htmlFor={id('reqtype')}>
                  <span>Type of request</span>
                  <select id={id('reqtype')} value={form.requestType} onChange={(e) => update('requestType', e.target.value)}>
                    {REQUEST_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mkt-field" htmlFor={id('details')}>
                  <span>Details &amp; comments</span>
                  <textarea id={id('details')} rows={4} value={form.details} onChange={(e) => update('details', e.target.value)} />
                </label>
                <label className="mkt-field" htmlFor={id('hear')}>
                  <span>How did you hear about us?</span>
                  <select id={id('hear')} value={form.hearAboutUs} onChange={(e) => update('hearAboutUs', e.target.value)}>
                    {HEAR_ABOUT.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>

              <fieldset className="mkt-fieldset">
                <legend className="mkt-legend">Payment (optional)</legend>
                <label className="mkt-field" htmlFor={id('pay')}>
                  <span>Method</span>
                  <select
                    id={id('pay')}
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
                    <p className="mkt-pci">
                      Only the last four digits of your card are stored with your request — the full number is
                      never saved. You can also pay by phone at <a href={`tel:${OFFICE_PHONE_TEL}`}>{OFFICE_PHONE_DISPLAY}</a>.
                    </p>
                    <label className="mkt-field" htmlFor={id('ch')}>
                      <span>Cardholder name</span>
                      <input id={id('ch')} value={form.cardholderName} onChange={(e) => update('cardholderName', e.target.value)} autoComplete="off" />
                    </label>
                    <label className="mkt-field" htmlFor={id('cc')}>
                      <span>Credit card number (16 digits)</span>
                      <input
                        id={id('cc')}
                        inputMode="numeric"
                        maxLength={16}
                        autoComplete="off"
                        placeholder="16-digit number"
                        value={form.cardNumber}
                        onChange={(e) => update('cardNumber', digitsOnly(e.target.value).slice(0, 16))}
                      />
                    </label>
                    <div className="mkt-row mkt-row--2">
                      <label className="mkt-field" htmlFor={id('expm')}>
                        <span>Exp. month</span>
                        <select id={id('expm')} autoComplete="off" value={form.expMonth} onChange={(e) => update('expMonth', e.target.value)}>
                          <option value="">—</option>
                          {MONTHS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="mkt-field" htmlFor={id('expy')}>
                        <span>Exp. year (YYYY)</span>
                        <input
                          id={id('expy')}
                          inputMode="numeric"
                          maxLength={4}
                          autoComplete="off"
                          placeholder={String(CURRENT_YEAR)}
                          value={form.expYear}
                          onChange={(e) => update('expYear', digitsOnly(e.target.value).slice(0, 4))}
                        />
                      </label>
                    </div>
                  </>
                ) : form.paymentMethod ? (
                  <p className="mkt-pci">
                    We&apos;ll follow up to complete payment ({form.paymentMethod.toLowerCase()}). Or call{' '}
                    <a href={`tel:${OFFICE_PHONE_TEL}`}>{OFFICE_PHONE_DISPLAY}</a>.
                  </p>
                ) : null}
              </fieldset>

              {error ? <p className="mkt-form-error">{error}</p> : null}

              <button type="submit" className="mkt-btn mkt-btn-primary mkt-btn-full" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Request →'}
              </button>
            </form>
          )}

          <ReliefCallSidebar />
        </div>
      </div>
    </section>
  )
}
