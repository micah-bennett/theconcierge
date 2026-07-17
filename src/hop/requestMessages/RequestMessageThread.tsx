import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { hopListRequestMessages, hopSendRequestMessage, type HopRequestMessage } from '../api'
import { useHopAuth } from '../useHopAuth'

// Async, polling-based message thread on a request — visible to the requester, whoever it's
// assigned to, and any admin. Deliberately distinct from the internal "Dispatch note" field:
// this is a channel the requester always sees, not an internal operational log. Polls the same
// way RideTracker does (HopRequestsPage.tsx), no websockets.
export function RequestMessageThread({ requestId }: { requestId: string }) {
  const { user } = useHopAuth()
  const [messages, setMessages] = useState<HopRequestMessage[]>([])
  const [loaded, setLoaded] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    function tick() {
      hopListRequestMessages(requestId)
        .then((result) => {
          if (!cancelled) setMessages(result.messages)
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoaded(true)
        })
    }
    tick()
    const interval = setInterval(tick, 15000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [requestId])

  function poll() {
    return hopListRequestMessages(requestId)
      .then((result) => setMessages(result.messages))
      .catch(() => {})
  }

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  async function handleSend(event: FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return
    setError(null)
    setSending(true)
    try {
      await hopSendRequestMessage(requestId, body)
      setDraft('')
      await poll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the message')
    } finally {
      setSending(false)
    }
  }

  if (!loaded) return null

  return (
    <div className="hop-message-thread">
      <h3 className="hop-message-thread__title">Messages</h3>

      <div className="hop-message-thread__list" ref={listRef}>
        {messages.length === 0 && <p className="hop-muted">No messages yet — say hello.</p>}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`hop-message-thread__bubble${
              message.sender_id === user?.id ? ' hop-message-thread__bubble--own' : ''
            }`}
          >
            <div className="hop-message-thread__meta">
              <span>{message.sender_name}</span>
              <span>{new Date(message.created_at).toLocaleString()}</span>
            </div>
            <p>{message.body}</p>
          </div>
        ))}
      </div>

      {error && <div className="hop-auth-card__error">{error}</div>}

      <form className="hop-message-thread__composer" onSubmit={handleSend}>
        <textarea
          rows={2}
          placeholder="Message the requester…"
          value={draft}
          maxLength={1000}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="hop-btn-primary" disabled={sending || !draft.trim()}>
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  )
}
