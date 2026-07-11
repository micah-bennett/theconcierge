export type ConciergeRequestPayload = {
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
  dateNeeded: string
  timeNeeded: string
  requestType: string
  details: string
  hearAboutUs: string
  paymentMethod: string
  cardholderName: string
  cardLastFour: string
  expMonth: string
  expYear: string
}

export async function submitConciergeRequest(payload: ConciergeRequestPayload): Promise<void> {
  const response = await fetch('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(result?.error || 'We could not submit your request. Please try again or call us.')
  }
}
