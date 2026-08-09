import { useEffect, useState } from 'react'
import { hopGetRewards, type HopPointsLedgerEntry } from '../../../hop/api'
import { EmptyState } from '../../../hop/EmptyState'

const SOURCE_LABEL: Record<string, string> = {
  admin_award: 'Awarded by admin',
  concierge_award: 'Awarded by concierge',
  checkin_streak: 'Check-in streak bonus',
  profile_complete: 'Profile complete bonus',
  redemption: 'Redeemed',
  wearable_challenge: 'Wearable challenge',
}

// View-only this cycle — balance + ledger history, no redemption flow yet (see
// docs/hop/roadmap.md). Fits as one card, not a standalone page, at this scope.
export function HopRewardsCard() {
  const [ledger, setLedger] = useState<HopPointsLedgerEntry[] | null>(null)
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    hopGetRewards()
      .then((result) => {
        setLedger(result.ledger)
        setBalance(result.balance)
      })
      .catch(() => setLedger([]))
  }, [])

  const loading = ledger === null

  return (
    <section className="hop-card">
      <h2>🎁 Rewards</h2>
      <p className="hop-muted">
        Points your concierge team has awarded you — for ratings, milestones, and going above and
        beyond. Redeeming points toward a request isn't available yet.
      </p>

      <div className="hop-rewards-balance">
        <span className="hop-rewards-balance__value">{loading ? '—' : balance}</span>
        <span className="hop-rewards-balance__label">points</span>
      </div>

      {loading && <div className="hop-skeleton-bar" />}
      {!loading && ledger.length === 0 && <EmptyState icon="🎁" message="No points yet." />}
      {!loading && ledger.length > 0 && (
        <ul className="hop-history-list">
          {ledger.map((entry) => (
            <li key={entry.id} className="hop-history-list__item">
              <span className="hop-history-list__type">{SOURCE_LABEL[entry.source] ?? entry.source}</span>
              <span className={entry.delta >= 0 ? 'hop-rewards-delta hop-rewards-delta--up' : 'hop-rewards-delta'}>
                {entry.delta >= 0 ? '+' : ''}
                {entry.delta}
              </span>
              <span className="hop-history-list__date">{new Date(entry.created_at).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
