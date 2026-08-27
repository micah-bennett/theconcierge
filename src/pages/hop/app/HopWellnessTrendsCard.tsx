import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { hopListDailyMetrics, hopLogDailyMetrics, type HopDailyMetricsEntry } from '../../../hop/api'
import { EmptyState } from '../../../hop/EmptyState'

const MOOD_EMOJI = ['😞', '🙁', '😐', '🙂', '😄']

// Hand-rolled CSS bar chart — no new charting library, consistent with the prior UI-polish
// cycle's no-new-dependency precedent. Self-reported data only (steps/sleep/mood typed in by the
// member), not real wearable sync — see docs/hop/architecture.md.
function Bars({ entries, field, max, unit }: { entries: HopDailyMetricsEntry[]; field: 'steps' | 'sleep_hours'; max: number; unit: string }) {
  const last7 = [...entries].slice(0, 7).reverse()
  return (
    <div className="hop-trend-chart">
      {last7.map((entry) => {
        const value = entry[field]
        const pct = value === null ? 0 : Math.min(100, (Number(value) / max) * 100)
        return (
          <div key={entry.id} className="hop-trend-chart__col">
            <div className="hop-trend-chart__bar-track">
              <div className="hop-trend-chart__bar" style={{ height: `${pct}%` }} />
            </div>
            <span className="hop-trend-chart__value">{value === null ? '—' : `${value}${unit}`}</span>
            <span className="hop-trend-chart__label">
              {new Date(entry.log_date).toLocaleDateString(undefined, { weekday: 'short' })}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function HopWellnessTrendsCard() {
  const [metrics, setMetrics] = useState<HopDailyMetricsEntry[] | null>(null)
  const [steps, setSteps] = useState('')
  const [sleepHours, setSleepHours] = useState('')
  const [mood, setMood] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(load, [])

  function load() {
    hopListDailyMetrics()
      .then((result) => setMetrics(result.metrics))
      .catch(() => setMetrics([]))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await hopLogDailyMetrics({
        steps: steps ? Number(steps) : null,
        sleepHours: sleepHours ? Number(sleepHours) : null,
        mood,
      })
      setSteps('')
      setSleepHours('')
      setMood(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your numbers')
    } finally {
      setSaving(false)
    }
  }

  const loading = metrics === null

  return (
    <section className="hop-card">
      <h2>📈 Your trends</h2>
      <p className="hop-muted">
        Log your own numbers day to day — steps, sleep, and mood — self-reported, not synced from
        a wearable device yet.
      </p>

      <form className="hop-form-stack" onSubmit={handleSubmit}>
        {error && (
          <div className="hop-auth-card__error" role="alert">
            {error}
          </div>
        )}
        <div className="hop-field-row">
          <label className="hop-field">
            <span>Steps today</span>
            <input type="number" min={0} max={100000} value={steps} onChange={(e) => setSteps(e.target.value)} />
          </label>
          <label className="hop-field">
            <span>Sleep last night (hours)</span>
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
            />
          </label>
        </div>
        <label className="hop-field">
          <span>Mood right now</span>
          <div className="hop-mood-picker">
            {MOOD_EMOJI.map((emoji, index) => (
              <button
                key={emoji}
                type="button"
                className={`hop-mood-picker__btn${mood === index + 1 ? ' hop-mood-picker__btn--active' : ''}`}
                onClick={() => setMood(index + 1)}
                aria-label={`Mood ${index + 1} of 5`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </label>
        <button type="submit" className="hop-btn-secondary" disabled={saving}>
          {saving ? 'Saving…' : "Log today's numbers"}
        </button>
      </form>

      {loading && <div className="hop-skeleton-bar" />}
      {!loading && metrics.length === 0 && <EmptyState icon="📈" message="No trend data yet — log your first entry above." />}
      {!loading && metrics.length > 0 && (
        <>
          <h3 className="hop-trend-chart__title">Steps</h3>
          <Bars entries={metrics} field="steps" max={10000} unit="" />
          <h3 className="hop-trend-chart__title">Sleep (hours)</h3>
          <Bars entries={metrics} field="sleep_hours" max={10} unit="h" />
        </>
      )}
    </section>
  )
}
