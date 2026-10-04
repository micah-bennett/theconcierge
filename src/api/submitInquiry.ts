export type InquiryPayload = {
  firstName: string
  lastName: string
  email: string
  organization: string
  interest: string
  message: string
}

export async function submitInquiry(payload: InquiryPayload): Promise<void> {
  const response = await fetch('/api/requests?type=inquiry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(result?.error || 'We could not send your inquiry. Please try again.')
  }
}
