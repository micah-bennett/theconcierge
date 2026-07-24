import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  hopAdminGetMessageThread,
  hopAdminListMessageThreads,
  hopAdminListUsers,
  hopAdminSendMessage,
  type HopDirectMessage,
  type HopMessageThreadSummary,
} from '../../../hop/api'
import { useHopAuth } from '../../../hop/useHopAuth'

// Admin's inbox of direct-message threads with members, not tied to any request — see
// hop_direct_messages in db/schema.sql and docs/hop/architecture.md ("Phase 1 quick wins").
export function HopAdminMessagesPage() {
  const { user } = useHopAuth()
  const [searchParams] = useSearchParams()
  const [threads, setThreads] = useState<HopMessageThreadSummary[] | null>(null)
  const [selected, setSelected] = useState<HopMessageThreadSummary | null>(null)
  const [messages, setMessages] = useState<HopDirectMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  function loadThreads() {
    hopAdminListMessageThreads()
      .then((result) => setThreads(result.threads))
      .catch(() => setThreads([]))
  }

  useEffect(loadThreads, [])

  // Deep link from the Users page ("Message" button) — start a conversation with a member who
  // may have zero messages yet, so they won't appear in the inbox list until the first send.
  useEffect(() => {
    const targetId = searchParams.get('userId')
    if (!targetId || selected?.user_id === targetId) return
    if (threads) {
      const existing = threads.find((t) => t.user_id === targetId)
      if (existing) {
        setSelected(existing)
        return
      }
    }
    hopAdminListUsers()
      .then((result) => {
        const target = result.users.find((u) => u.id === targetId)
        if (target) {
          setSelected({
            user_id: target.id,
            first_name: target.first_name,
            last_name: target.last_name,
            email: target.email,
            last_message: '',
            last_sender_id: '',
            last_message_at: '',
            unread_count: 0,
          })
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, threads])

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    function tick() {
      hopAdminGetMessageThread(selected!.user_id)
        .then((result) => {
          if (!cancelled) setMessages(result.messages)
        })
        .catch(() => {})
    }
    tick()
    const interval = setInterval(tick, 15000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.user_id])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  async function handleSend() {
    const body = draft.trim()
    if (!body || !selected) return
    setError(null)
    setSending(true)
    try {
      await hopAdminSendMessage(selected.user_id, body)
      setDraft('')
      const result = await hopAdminGetMessageThread(selected.user_id)
      setMessages(result.messages)
      loadThreads()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Messages</h1>
      <p className="hop-page-sub">Message any HOP member directly — not tied to a specific request.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) 1fr', gap: '1rem' }}>
        <section className="hop-card">
          <h2>💬 Conversations</h2>
          {threads === null && <p className="hop-muted">Loading…</p>}
          {threads && threads.length === 0 && <p className="hop-muted">No conversations yet.</p>}
          {threads?.map((thread) => (
            <div
              key={thread.user_id}
              className="hop-inbox-row"
              onClick={() => setSelected(thread)}
              style={selected?.user_id === thread.user_id ? { background: 'var(--hop-overlay-strong)' } : undefined}
            >
              <div>
                <strong>
                  {thread.first_name} {thread.last_name}
                </strong>
                <div className="hop-muted">{thread.last_message.slice(0, 60)}</div>
              </div>
              {thread.unread_count > 0 && <span className="hop-unread-badge">{thread.unread_count}</span>}
            </div>
          ))}
        </section>

        <section className="hop-card">
          {!selected ? (
            <p className="hop-muted">Select a conversation, or message a member from the Users page.</p>
          ) : (
            <div className="hop-message-thread" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
              <h3 className="hop-message-thread__title">
                {selected.first_name} {selected.last_name} — {selected.email}
              </h3>
              <div className="hop-message-thread__list" ref={listRef}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`hop-message-thread__bubble${
                      message.sender_id === user?.id ? ' hop-message-thread__bubble--own' : ''
                    }`}
                  >
                    <div className="hop-message-thread__meta">
                      <span>{message.sender_id === user?.id ? 'You' : message.sender_name}</span>
                      <span>{new Date(message.created_at).toLocaleString()}</span>
                    </div>
                    <p>{message.body}</p>
                  </div>
                ))}
              </div>
              {error && <div className="hop-auth-card__error">{error}</div>}
              <div className="hop-message-thread__composer">
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Message ${selected.first_name}…`}
                />
                <button type="button" className="hop-btn-primary" disabled={sending || !draft.trim()} onClick={handleSend}>
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
