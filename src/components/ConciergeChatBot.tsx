import { useCallback, useEffect, useId, useRef, useState } from 'react'

type ChatLine = { role: 'user' | 'model'; text: string }

const WELCOME =
  "Welcome to The Concierge. I’m your virtual concierge assistant. Tell me what you need help with, and I’ll guide you to the right next step."

function formatChatError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : 'Something went wrong. Try again or call the number on the site.'

  if (/prepayment credits are depleted|429|quota|billing/i.test(raw)) {
    return 'The concierge assistant is temporarily unavailable. Please call us or submit a request — our team will help you directly.'
  }

  if (/fetch-error|failed to fetch|network/i.test(raw)) {
    return 'Connection issue — try again in a moment, or call the number on the site.'
  }

  return raw
}

type ConciergeChatBotProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConciergeChatBot({ open, onOpenChange }: ConciergeChatBotProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [lines, setLines] = useState<ChatLine[]>(() => [
    { role: 'model', text: WELCOME },
  ])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetConversation = useCallback(() => {
    setLines([{ role: 'model', text: WELCOME }])
    setError(null)
  }, [])

  useEffect(() => {
    if (!open) return
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [open, lines, pending])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || pending) return
    const conversation = [...lines.filter((line) => line.text && line.text !== WELCOME), { role: 'user' as const, text }]
    setInput('')
    setError(null)
    setLines((prev) => [...prev, { role: 'user', text }, { role: 'model', text: '' }])
    setPending(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversation }),
      })
      const result = (await response.json().catch(() => null)) as { text?: string; error?: string } | null
      if (!response.ok || !result?.text) throw new Error(result?.error || 'Could not reach the assistant.')
      setLines((prev) => {
        const next = [...prev]
        next[next.length - 1] = { role: 'model', text: result.text || '' }
        return next
      })
    } catch (e) {
      setError(formatChatError(e))
      setLines((prev) => {
        const next = [...prev]
        if (next.length > 0 && next[next.length - 1].role === 'model' && next[next.length - 1].text === '') {
          next.pop()
        }
        return next
      })
    } finally {
      setPending(false)
    }
  }, [input, lines, pending])

  return (
    <div className="concierge-chat">
      {open ? (
        <div
          ref={panelRef}
          className="concierge-chat__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="concierge-chat__head">
            <h2 className="concierge-chat__title" id={titleId}>
              Ask Concierge
            </h2>
            <div className="concierge-chat__head-actions">
              <button
                type="button"
                className="concierge-chat__textbtn"
                onClick={resetConversation}
                disabled={pending}
              >
                Clear
              </button>
              <button
                type="button"
                className="concierge-chat__close"
                onClick={() => onOpenChange(false)}
                aria-label="Close Ask Concierge"
              >
                ×
              </button>
            </div>
          </div>
          <div className="concierge-chat__messages" role="log" aria-relevant="additions" aria-live="polite">
            {lines.map((line, i) => (
              <p
                key={i}
                className={
                  line.role === 'user' ? 'concierge-chat__bubble concierge-chat__bubble--user' : 'concierge-chat__bubble concierge-chat__bubble--model'
                }
              >
                {line.text}
                {line.role === 'model' && pending && i === lines.length - 1 && !line.text ? (
                  <span className="concierge-chat__cursor" aria-hidden>
                    |
                  </span>
                ) : null}
              </p>
            ))}
            <div ref={endRef} />
          </div>
          {error ? (
            <p className="concierge-chat__error" role="alert">
              {error}
            </p>
          ) : null}
          <form
            className="concierge-chat__form"
            onSubmit={(e) => {
              e.preventDefault()
              void send()
            }}
          >
            <label className="visually-hidden" htmlFor="concierge-chat-input">
              Your message
            </label>
            <input
              id="concierge-chat-input"
              className="concierge-chat__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a question…"
              autoComplete="off"
              disabled={pending}
              maxLength={2000}
            />
            <button type="submit" className="concierge-chat__send" disabled={pending || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      ) : null}
      <button
        type="button"
        className="concierge-chat__fab"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls={open ? titleId : undefined}
        aria-label={open ? 'Close Ask Concierge' : 'Open Ask Concierge'}
        title={open ? 'Close Ask Concierge' : 'Open Ask Concierge'}
      >
        {open ? '×' : 'Ask Concierge'}
      </button>
    </div>
  )
}
