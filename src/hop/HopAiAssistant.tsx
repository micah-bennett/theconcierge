import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hopCreateRequest, hopGetSuggestionFeed, type HopFeedSuggestion } from './api'
import { useToast } from './useToast'

// Floating bottom-right widget, member app only (mounted in HopAppLayout.tsx, never on the
// staff-portal admin/concierge layouts). Suggestions come from api/hop/profile.ts?action=feed —
// a DB-only rule table (upcoming family dates + certifications), not a real LLM call; the same
// input shape could later be handed to api/chat.ts's Anthropic client instead, but that swap
// isn't made this cycle. Answered entirely by tapping options, never free-typed, per the "less
// work to get the same job done" brief. Honest about its real limitation: suggestions only
// appear while the member has the app open — there is no push notification behind this (see
// docs/hop/architecture.md, "HOP AI assistant widget").

const CAKE_AGES = Array.from({ length: 18 }, (_, i) => String(i + 1))
const CAKE_COLORS = ['White', 'Pink', 'Blue', 'Purple', 'Rainbow', 'Gold']
const CAKE_TIERS = ['1 tier', '2 tiers', '3 tiers']

type CakeStep = 'confirm-name' | 'age' | 'color' | 'tiers' | 'done'

export function HopAiAssistant() {
  const toast = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<HopFeedSuggestion[] | null>(null)
  const [active, setActive] = useState<HopFeedSuggestion | null>(null)

  // Cake sub-flow state
  const [cakeStep, setCakeStep] = useState<CakeStep>('confirm-name')
  const [cakeAge, setCakeAge] = useState<string | null>(null)
  const [cakeColor, setCakeColor] = useState<string | null>(null)
  const [cakeTiers, setCakeTiers] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    hopGetSuggestionFeed()
      .then((result) => setSuggestions(result.suggestions))
      .catch(() => setSuggestions([]))
  }, [open])

  function startSuggestion(suggestion: HopFeedSuggestion) {
    setActive(suggestion)
    setCakeStep('confirm-name')
    setCakeAge(null)
    setCakeColor(null)
    setCakeTiers(null)
  }

  function dismiss() {
    setActive(null)
  }

  function extractName(prompt: string): string {
    // Prompts are authored as "<Name>'s birthday is coming up..." — pull the name back out for
    // the confirm-spelling step rather than duplicating it as a separate feed field.
    const match = prompt.match(/^([^']+)'s/)
    return match ? match[1] : 'this person'
  }

  async function submitCakeRequest() {
    if (!active) return
    setSubmitting(true)
    try {
      const name = extractName(active.prompt)
      const details = `[HOP AI Assistant] Birthday cake — ${name}, turning ${cakeAge}, ${cakeColor} icing, ${cakeTiers}.`
      await hopCreateRequest({ serviceType: 'family_home', details, requestedFor: active.dueDate })
      toast.success('Request sent — your concierge will take it from here.')
      setActive(null)
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit the request')
    } finally {
      setSubmitting(false)
    }
  }

  function renderCakeFlow(suggestion: HopFeedSuggestion) {
    const name = extractName(suggestion.prompt)
    if (cakeStep === 'confirm-name') {
      return (
        <>
          <p className="hop-ai-widget__question">Is this spelled right: {name}?</p>
          <div className="hop-ai-widget__options">
            <button type="button" className="hop-btn-secondary" onClick={() => setCakeStep('age')}>
              Yes
            </button>
            <button type="button" className="hop-btn-ghost" onClick={dismiss}>
              Let me fix it on Profile first
            </button>
          </div>
        </>
      )
    }
    if (cakeStep === 'age') {
      return (
        <>
          <p className="hop-ai-widget__question">How old are they turning?</p>
          <div className="hop-ai-widget__chip-grid">
            {CAKE_AGES.map((age) => (
              <button
                key={age}
                type="button"
                className="hop-ai-widget__chip"
                onClick={() => {
                  setCakeAge(age)
                  setCakeStep('color')
                }}
              >
                {age}
              </button>
            ))}
          </div>
        </>
      )
    }
    if (cakeStep === 'color') {
      return (
        <>
          <p className="hop-ai-widget__question">What color icing?</p>
          <div className="hop-ai-widget__chip-grid">
            {CAKE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="hop-ai-widget__chip"
                onClick={() => {
                  setCakeColor(color)
                  setCakeStep('tiers')
                }}
              >
                {color}
              </button>
            ))}
          </div>
        </>
      )
    }
    if (cakeStep === 'tiers') {
      return (
        <>
          <p className="hop-ai-widget__question">1 tier or 2?</p>
          <div className="hop-ai-widget__chip-grid">
            {CAKE_TIERS.map((tier) => (
              <button
                key={tier}
                type="button"
                className="hop-ai-widget__chip"
                onClick={() => {
                  setCakeTiers(tier)
                  setCakeStep('done')
                }}
              >
                {tier}
              </button>
            ))}
          </div>
        </>
      )
    }
    return (
      <>
        <p className="hop-ai-widget__question">
          Got it — {name}, turning {cakeAge}, {cakeColor} icing, {cakeTiers}. Send this to your
          concierge?
        </p>
        <div className="hop-ai-widget__options">
          <button type="button" className="hop-btn-primary" disabled={submitting} onClick={submitCakeRequest}>
            {submitting ? 'Sending…' : 'Yes, send it'}
          </button>
          <button type="button" className="hop-btn-ghost" onClick={dismiss}>
            Cancel
          </button>
        </div>
      </>
    )
  }

  function handleOption(suggestion: HopFeedSuggestion, value: string) {
    if (value === 'dismiss') {
      setSuggestions((prev) => (prev ? prev.filter((s) => s.id !== suggestion.id) : prev))
      return
    }
    if (suggestion.kind === 'birthday_cake') {
      startSuggestion(suggestion)
      return
    }
    // anniversary / other "start" flows: no multi-step collector built yet — hand off to the
    // existing Family Care request form instead of inventing a second bespoke flow.
    setOpen(false)
    navigate('/hop/app/family-care')
  }

  return (
    <div className="hop-ai-widget">
      {open && (
        <div className="hop-ai-widget__panel">
          <div className="hop-ai-widget__header">
            <span>✨ HOP Assistant</span>
            <button type="button" className="hop-ai-widget__close" onClick={() => setOpen(false)} aria-label="Close">
              ✕
            </button>
          </div>

          {active ? (
            active.kind === 'birthday_cake' ? (
              renderCakeFlow(active)
            ) : (
              <p className="hop-ai-widget__question">{active.prompt}</p>
            )
          ) : (
            <>
              <p className="hop-muted hop-ai-widget__disclaimer">
                I only show suggestions when you have the app open — not a push notification.
              </p>
              {suggestions === null && <div className="hop-skeleton-bar" />}
              {suggestions !== null && suggestions.length === 0 && (
                <p className="hop-muted">Nothing to suggest right now — check back later.</p>
              )}
              {suggestions !== null &&
                suggestions.map((suggestion) => (
                  <div key={suggestion.id} className="hop-ai-widget__suggestion">
                    <p className="hop-ai-widget__question">{suggestion.prompt}</p>
                    <div className="hop-ai-widget__options">
                      {suggestion.options.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={option.value === 'dismiss' ? 'hop-btn-ghost' : 'hop-btn-secondary'}
                          onClick={() => handleOption(suggestion, option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </>
          )}
        </div>
      )}
      <button
        type="button"
        className="hop-ai-widget__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close HOP Assistant' : 'Open HOP Assistant'}
      >
        {open ? '✕' : '✨'}
      </button>
    </div>
  )
}
