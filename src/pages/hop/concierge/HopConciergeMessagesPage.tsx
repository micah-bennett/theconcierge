import { useEffect, useRef, useState } from 'react'
import {
  hopAdminListStaff,
  hopGetStaffThread,
  hopListStaffThreads,
  hopSendStaffMessage,
  type HopStaffMember,
  type HopStaffMessage,
  type HopStaffThreadSummary,
} from '../../../hop/api'
import { useHopAuth } from '../../../hop/useHopAuth'

// A concierge's first messaging surface — peer-to-peer with any admin or fellow concierge, not
// tied to a request. See "Staff messaging" in docs/hop/architecture.md; same backend
// (hop_staff_messages, api/hop/messages.ts?scope=staff) as the admin Messages page's Staff tab.
export function HopConciergeMessagesPage() {
  const { user } = useHopAuth()
  const [roster, setRoster] = useState<HopStaffMember[]>([])
  const [threads, setThreads] = useState<HopStaffThreadSummary[] | null>(null)
  const [selected, setSelected] = useState<HopStaffThreadSummary | null>(null)
  const [messages, setMessages] = useState<HopStaffMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  function loadThreads() {
    hopListStaffThreads()
      .then((result) => setThreads(result.threads))
      .catch(() => setThreads([]))
  }

  useEffect(loadThreads, [])

  useEffect(() => {
    hopAdminListStaff()
      .then((result) => setRoster(result.staff.filter((s) => s.id !== user?.id)))
      .catch(() => setRoster([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startThread(peerId: string) {
    if (!peerId) return
    const existing = threads?.find((t) => t.peer_id === peerId)
    if (existing) {
      setSelected(existing)
      return
    }
    const member = roster.find((s) => s.id === peerId)
    if (!member) return
    setSelected({
      peer_id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      role: member.role,
      last_message: '',
      last_sender_id: '',
      last_message_at: '',
      unread_count: 0,
    })
    setMessages([])
  }

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    function tick() {
      hopGetStaffThread(selected!.peer_id)
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
  }, [selected?.peer_id])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  async function handleSend() {
    const body = draft.trim()
    if (!body || !selected) return
    setError(null)
    setSending(true)
    try {
      await hopSendStaffMessage(selected.peer_id, body)
      setDraft('')
      const result = await hopGetStaffThread(selected.peer_id)
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
      <p className="hop-page-sub">Message an admin or a fellow concierge directly.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) 1fr', gap: '1rem' }}>
        <section className="hop-card">
          <h2>💬 Conversations</h2>
          <label className="hop-field">
            <span>Message someone new</span>
            <select value="" onChange={(e) => startThread(e.target.value)}>
              <option value="" disabled>
                Choose a staff member
              </option>
              {roster.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.first_name} {member.last_name}
                  {member.role === 'concierge' ? ' (Concierge)' : ' (Admin)'}
                </option>
              ))}
            </select>
          </label>
          {threads === null && <p className="hop-muted">Loading…</p>}
          {threads && threads.length === 0 && <p className="hop-muted">No conversations yet.</p>}
          {threads?.map((thread) => (
            <div
              key={thread.peer_id}
              className="hop-inbox-row"
              onClick={() => setSelected(thread)}
              style={selected?.peer_id === thread.peer_id ? { background: 'var(--hop-overlay-strong)' } : undefined}
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
            <p className="hop-muted">Select a conversation, or start a new one above.</p>
          ) : (
            <div className="hop-message-thread" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
              <h3 className="hop-message-thread__title">
                {selected.first_name} {selected.last_name}
                {selected.role === 'concierge' ? ' (Concierge)' : ' (Admin)'}
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
