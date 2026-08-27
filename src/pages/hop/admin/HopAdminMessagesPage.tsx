import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  hopAdminGetMessageThread,
  hopAdminListMessageThreads,
  hopAdminListStaff,
  hopAdminListUsers,
  hopAdminSendMessage,
  hopGetStaffThread,
  hopListStaffThreads,
  hopSendStaffMessage,
  type HopDirectMessage,
  type HopMessageThreadSummary,
  type HopStaffMember,
  type HopStaffMessage,
  type HopStaffThreadSummary,
} from '../../../hop/api'
import { useHopAuth } from '../../../hop/useHopAuth'

type Tab = 'members' | 'staff'

// Admin's inbox of direct-message threads with members, not tied to any request — see
// hop_direct_messages in db/schema.sql and docs/hop/architecture.md ("Phase 1 quick wins").
// The "Staff" tab (2026-08-27) is a second, separate inbox — peer-to-peer messaging with other
// admins/concierges (hop_staff_messages) — kept as its own panel/state rather than generically
// parametrizing the member panel above, to avoid risking the already-working member flow.
export function HopAdminMessagesPage() {
  const { user } = useHopAuth()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('members')

  const [threads, setThreads] = useState<HopMessageThreadSummary[] | null>(null)
  const [selected, setSelected] = useState<HopMessageThreadSummary | null>(null)
  const [messages, setMessages] = useState<HopDirectMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const [staffRoster, setStaffRoster] = useState<HopStaffMember[]>([])
  const [staffThreads, setStaffThreads] = useState<HopStaffThreadSummary[] | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<HopStaffThreadSummary | null>(null)
  const [staffMessages, setStaffMessages] = useState<HopStaffMessage[]>([])
  const [staffDraft, setStaffDraft] = useState('')
  const [sendingStaff, setSendingStaff] = useState(false)
  const [staffError, setStaffError] = useState<string | null>(null)
  const staffListRef = useRef<HTMLDivElement>(null)

  function loadThreads() {
    hopAdminListMessageThreads()
      .then((result) => setThreads(result.threads))
      .catch(() => setThreads([]))
  }

  useEffect(loadThreads, [])

  function loadStaffThreads() {
    hopListStaffThreads()
      .then((result) => setStaffThreads(result.threads))
      .catch(() => setStaffThreads([]))
  }

  useEffect(loadStaffThreads, [])

  useEffect(() => {
    hopAdminListStaff()
      .then((result) => setStaffRoster(result.staff.filter((s) => s.id !== user?.id)))
      .catch(() => setStaffRoster([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startStaffThread(peerId: string) {
    if (!peerId) return
    const existing = staffThreads?.find((t) => t.peer_id === peerId)
    if (existing) {
      setSelectedStaff(existing)
      return
    }
    const member = staffRoster.find((s) => s.id === peerId)
    if (!member) return
    setSelectedStaff({
      peer_id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      role: member.role,
      last_message: '',
      last_sender_id: '',
      last_message_at: '',
      unread_count: 0,
    })
    setStaffMessages([])
  }

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

  useEffect(() => {
    if (!selectedStaff) return
    let cancelled = false
    function tick() {
      hopGetStaffThread(selectedStaff!.peer_id)
        .then((result) => {
          if (!cancelled) setStaffMessages(result.messages)
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
  }, [selectedStaff?.peer_id])

  useEffect(() => {
    staffListRef.current?.scrollTo({ top: staffListRef.current.scrollHeight })
  }, [staffMessages])

  async function handleSendStaff() {
    const body = staffDraft.trim()
    if (!body || !selectedStaff) return
    setStaffError(null)
    setSendingStaff(true)
    try {
      await hopSendStaffMessage(selectedStaff.peer_id, body)
      setStaffDraft('')
      const result = await hopGetStaffThread(selectedStaff.peer_id)
      setStaffMessages(result.messages)
      loadStaffThreads()
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Could not send the message')
    } finally {
      setSendingStaff(false)
    }
  }

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Messages</h1>
      <p className="hop-page-sub">Message a HOP member, or message another admin or concierge directly.</p>

      <div className="hop-tabs">
        <button
          type="button"
          className={`hop-tab${tab === 'members' ? ' hop-tab--active' : ''}`}
          onClick={() => setTab('members')}
        >
          Members
        </button>
        <button
          type="button"
          className={`hop-tab${tab === 'staff' ? ' hop-tab--active' : ''}`}
          onClick={() => setTab('staff')}
        >
          Staff
        </button>
      </div>

      {tab === 'members' && (
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
      )}

      {tab === 'staff' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) 1fr', gap: '1rem' }}>
          <section className="hop-card">
            <h2>🧑‍💼 Staff conversations</h2>
            <label className="hop-field">
              <span>Message someone new</span>
              <select value="" onChange={(e) => startStaffThread(e.target.value)}>
                <option value="" disabled>
                  Choose a staff member
                </option>
                {staffRoster.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.first_name} {member.last_name}
                    {member.role === 'concierge' ? ' (Concierge)' : ' (Admin)'}
                  </option>
                ))}
              </select>
            </label>
            {staffThreads === null && <p className="hop-muted">Loading…</p>}
            {staffThreads && staffThreads.length === 0 && <p className="hop-muted">No conversations yet.</p>}
            {staffThreads?.map((thread) => (
              <div
                key={thread.peer_id}
                className="hop-inbox-row"
                onClick={() => setSelectedStaff(thread)}
                style={selectedStaff?.peer_id === thread.peer_id ? { background: 'var(--hop-overlay-strong)' } : undefined}
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
            {!selectedStaff ? (
              <p className="hop-muted">Select a conversation to view it here.</p>
            ) : (
              <div className="hop-message-thread" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                <h3 className="hop-message-thread__title">
                  {selectedStaff.first_name} {selectedStaff.last_name}
                  {selectedStaff.role === 'concierge' ? ' (Concierge)' : ' (Admin)'}
                </h3>
                <div className="hop-message-thread__list" ref={staffListRef}>
                  {staffMessages.map((message) => (
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
                {staffError && <div className="hop-auth-card__error">{staffError}</div>}
                <div className="hop-message-thread__composer">
                  <textarea
                    rows={2}
                    maxLength={1000}
                    value={staffDraft}
                    onChange={(e) => setStaffDraft(e.target.value)}
                    placeholder={`Message ${selectedStaff.first_name}…`}
                  />
                  <button
                    type="button"
                    className="hop-btn-primary"
                    disabled={sendingStaff || !staffDraft.trim()}
                    onClick={handleSendStaff}
                  >
                    {sendingStaff ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
