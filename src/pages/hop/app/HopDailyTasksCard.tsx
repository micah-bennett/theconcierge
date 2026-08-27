import { useEffect, useState } from 'react'
import { hopCompleteDailyTask, hopGetDailyTasks, type HopDailyTask } from '../../../hop/api'
import { useToast } from '../../../hop/useToast'

// A fixed daily checklist — walk, stand, read an article, and a rotating daily question — each
// worth points once per day, self-tapped ("I did this"), not wearable-verified. See
// docs/hop/architecture.md, "Member rewards: daily health-task check-off".
export function HopDailyTasksCard() {
  const toast = useToast()
  const [tasks, setTasks] = useState<HopDailyTask[] | null>(null)
  const [answering, setAnswering] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [busyKey, setBusyKey] = useState<string | null>(null)

  useEffect(load, [])

  function load() {
    hopGetDailyTasks()
      .then((result) => setTasks(result.tasks))
      .catch(() => setTasks([]))
  }

  async function complete(task: HopDailyTask, response = '') {
    setBusyKey(task.key)
    try {
      const result = await hopCompleteDailyTask(task.key, response)
      toast.success(`+${task.points} points — balance ${result.balance}.`)
      setAnswering(null)
      setResponseText('')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not log that task')
    } finally {
      setBusyKey(null)
    }
  }

  function handleTap(task: HopDailyTask) {
    if (task.doneToday) return
    if (task.needsResponse) {
      setAnswering(task.key)
      return
    }
    complete(task)
  }

  const loading = tasks === null

  return (
    <section className="hop-card">
      <h2>✅ Daily health tasks</h2>
      <p className="hop-muted">A few small things, worth points each day you do them.</p>

      {loading && <div className="hop-skeleton-bar" />}
      {!loading && (
        <ul className="hop-history-list">
          {tasks.map((task) => (
            <li key={task.key} className="hop-history-list__item">
              <span className="hop-history-list__type">
                {task.icon} {task.label}
              </span>
              <span className="hop-muted">+{task.points} pts</span>
              {task.doneToday ? (
                <span className="hop-status hop-status--completed">Done today</span>
              ) : (
                <button
                  type="button"
                  className="hop-btn-secondary"
                  disabled={busyKey === task.key}
                  onClick={() => handleTap(task)}
                >
                  {busyKey === task.key ? 'Logging…' : 'I did this'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {answering && (
        <form
          className="hop-form-stack"
          onSubmit={(e) => {
            e.preventDefault()
            const task = tasks?.find((t) => t.key === answering)
            if (task) complete(task, responseText)
          }}
        >
          <label className="hop-field">
            <span>Your answer</span>
            <textarea
              rows={2}
              maxLength={500}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              required
            />
          </label>
          <div className="hop-field-row">
            <button type="submit" className="hop-btn-primary" disabled={busyKey !== null}>
              Submit
            </button>
            <button type="button" className="hop-btn-ghost" onClick={() => setAnswering(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
