import type { InstantRequestPayload } from '../site/conciergeRequest'

export async function submitInstantRequest(payload: InstantRequestPayload): Promise<void> {
  const response = await fetch('/api/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(result?.error || 'We could not send your request. Please try again.')
  }
}
