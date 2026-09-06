import { useState } from 'react'
import type { FormEvent } from 'react'

export function HopFeedComposer({ onPost }: { onPost: (body: string) => Promise<void> }) {
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return
    setError(null)
    setPosting(true)
    try {
      await onPost(body)
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post that')
    } finally {
      setPosting(false)
    }
  }

  return (
    <form className="hop-feed-composer hop-form-stack" onSubmit={handleSubmit}>
      <div className="hop-field">
        <textarea
          rows={3}
          placeholder="Share something with the team — a shout-out, a welcome, a good day…"
          value={draft}
          maxLength={2000}
          onChange={(e) => setDraft(e.target.value)}
        />
      </div>
      {error && <div className="hop-auth-card__error">{error}</div>}
      <div className="hop-feed-composer__actions">
        <span className="hop-muted hop-feed-composer__hint">Visible to everyone on HOP</span>
        <button type="submit" className="hop-btn-primary" disabled={posting || !draft.trim()}>
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </form>
  )
}
