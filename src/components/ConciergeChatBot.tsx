import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ChatSession } from 'firebase/ai'

import { isFirebaseConfigured } from '../firebase/envCheck'
import { getConciergeGenerativeModel } from '../firebase/conciergeModel'

type ChatLine = { role: 'user' | 'model'; text: string }

const WELCOME =
  "Welcome to The Concierge. I’m your virtual concierge assistant. Tell me what you need help with, and I’ll guide you to the right next step."

type ConciergeChatBotProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConciergeChatBot({ open, onOpenChange }: ConciergeChatBotProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<ChatSession | null>(null)
  const [input, setInput] = useState('')
  const [lines, setLines] = useState<ChatLine[]>(() => [
    { role: 'model', text: WELCOME },
  ])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ready = isFirebaseConfigured()

  const resetConversation = useCallback(() => {
    sessionRef.current = null
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

  const ensureSession = useCallback((): ChatSession | null => {
    if (!ready) return null
    if (!sessionRef.current) {
      try {
        const model = getConciergeGenerativeModel()
        sessionRef.current = model.startChat()
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not start the assistant.'
        setError(msg)
        return null
      }
    }
    return sessionRef.current
  }, [ready])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || pending) return
    if (!ready) {
      setError('Add your Firebase web config in env/.env.development to use the assistant.')
      return
    }
    setInput('')
    setError(null)
    setLines((prev) => [...prev, { role: 'user', text }])
    setPending(true)

    const session = ensureSession()
    if (!session) {
      setPending(false)
      return
    }

    setLines((prev) => [...prev, { role: 'model', text: '' }])

    try {
      const result = await session.sendMessageStream(text)
      let assembled = ''
      for await (const chunk of result.stream) {
        const piece = chunk.text()
        assembled += piece
        setLines((prev) => {
          const next = [...prev]
          const last = next.length - 1
          if (last >= 0 && next[last].role === 'model') {
            next[last] = { role: 'model', text: assembled }
          }
          return next
        })
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'Something went wrong. Try again or call the number on the site.'
      setError(msg)
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
  }, [input, pending, ready, ensureSession])

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
          ) : !ready ? (
            <p className="concierge-chat__hint">
              Connect Firebase in <code>env/.env.development</code> and enable AI Logic in the Firebase
              console to use this assistant.
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
              disabled={!ready || pending}
              maxLength={2000}
            />
            <button type="submit" className="concierge-chat__send" disabled={!ready || pending || !input.trim()}>
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
