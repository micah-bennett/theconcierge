import { useId } from 'react'

/** Line-art icons above each tier (gold strokes). */
export function PlanTierGraphic({ tier }: { tier: 'essential' | 'pro' | 'vip' }) {
  const proGoldId = `pro-icon-gold-${useId().replace(/:/g, '')}`
  const proGoldDeepId = `${proGoldId}-deep`
  const vipGoldId = `vip-icon-gold-${useId().replace(/:/g, '')}`
  return (
    <div className={`plans__graphic plans__graphic--${tier}`} aria-hidden>
      {tier === 'essential' ? (
        <svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="36" cy="38" r="22" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M36 22v16M36 38h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="36" cy="38" r="2.5" fill="currentColor" />
        </svg>
      ) : tier === 'pro' ? (
        <svg
          className="plans__graphic-svg plans__graphic-svg--pro"
          viewBox="0 0 72 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={proGoldId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f5e6c8" />
              <stop offset="45%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#a88620" />
            </linearGradient>
            <linearGradient id={proGoldDeepId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c9a227" />
              <stop offset="100%" stopColor="#8b6914" />
            </linearGradient>
          </defs>
          <path
            d="M18 56V50h4L24 30 28 50 36 18 44 50 48 30 52 50h2v6H18z"
            stroke={`url(#${proGoldId})`}
            strokeWidth="1.65"
            strokeLinejoin="round"
          />
          <circle
            cx="24"
            cy="30"
            r="3"
            fill={`url(#${proGoldDeepId})`}
            stroke={`url(#${proGoldDeepId})`}
            strokeWidth="1.2"
          />
          <circle
            cx="36"
            cy="18"
            r="3.2"
            fill={`url(#${proGoldDeepId})`}
            stroke={`url(#${proGoldDeepId})`}
            strokeWidth="1.2"
          />
          <circle
            cx="48"
            cy="30"
            r="3"
            fill={`url(#${proGoldDeepId})`}
            stroke={`url(#${proGoldDeepId})`}
            strokeWidth="1.2"
          />
        </svg>
      ) : (
        <svg
          className="plans__graphic-svg plans__graphic-svg--vip"
          viewBox="0 0 72 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={vipGoldId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f5e6c8" />
              <stop offset="45%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#a88620" />
            </linearGradient>
          </defs>
          <path
            d="M24 20h24l6 14-18 26-18-26 6-14z"
            stroke={`url(#${vipGoldId})`}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M36 20v40M24 20l12 40M48 20l-12 40M18 34h36"
            stroke={`url(#${vipGoldId})`}
            strokeWidth="1.45"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  )
}
