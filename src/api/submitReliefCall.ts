export type ReliefCallPayload = {
  name: string
  titleFacility: string
  email: string
  phone: string
  notes: string
}

export async function submitReliefCall(payload: ReliefCallPayload): Promise<void> {
  const response = await fetch('/api/relief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(result?.error || 'We could not submit your request. Please try again or call us.')
  }
}
