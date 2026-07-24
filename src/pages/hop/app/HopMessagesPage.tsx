import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { hopListMyMessages, hopSendMessage, type HopDirectMessage } from '../../../hop/api'
import { useHopAuth } from '../../../hop/useHopAuth'

// A single thread between this member and "HOP Admin" (a role, not one specific person — any
// admin can read/reply). Not tied to a service request — see hop_direct_messages in
// db/schema.sql and docs/hop/architecture.md ("Phase 1 quick wins"). Same 15s-polling pattern
// as RequestMessageThread.
export function HopMessagesPage() {
  const { user } = useHopAuth()
  const [messages, setMessages] = useState<HopDirectMessage[]>([])
  const [loaded, setLoaded] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    function tick() {
      hopListMyMessages()
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
  }, [])

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
      await hopSendMessage(body)
      setDraft('')
      const result = await hopListMyMessages()
      setMessages(result.messages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Messages</h1>
      <p className="hop-page-sub">A direct line to HOP Admin — for anything that isn't tied to a specific request.</p>

      <section className="hop-card">
        {!loaded ? (
          <p className="hop-muted">Loading…</p>
        ) : (
          <div className="hop-message-thread" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
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
                    <span>{message.sender_id === user?.id ? 'You' : 'HOP Admin'}</span>
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
                placeholder="Message HOP Admin…"
                value={draft}
                maxLength={1000}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="submit" className="hop-btn-primary" disabled={sending || !draft.trim()}>
                {sending ? 'Sending…' : 'Send'}
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  )
}
