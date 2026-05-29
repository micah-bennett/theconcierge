import { useId, type ReactNode } from 'react'

export type PersonalServiceIllustration =
  | 'clock'
  | 'wellness'
  | 'event'
  | 'assistant'
  | 'home'
  | 'travel'

/**
 * Max width/height of each icon’s natural bounds → scaled so the larger dimension ≈ 40
 * (same as the clock dial). Event uses a slight boost so it matches perceived size (narrow width).
 */
const ICON_SCALE: Record<PersonalServiceIllustration, number> = {
  clock: 1,
  wellness: 40 / 28,
  /** Star + rays — enlarged; pivot keeps it centered in the card */
  event: (40 / 35.5) * 1.38,
  assistant: 40 / 44,
  home: 40 / 36,
  /** Suitcase + handle — enlarged to match event / clock visual weight */
  travel: (40 / 41.5) * 1.2,
}

/**
 * Scale origin: event is top-heavy vs (36,40); use bbox center so it sits like clock / heart / etc.
 */
const ICON_PIVOT: Record<PersonalServiceIllustration, readonly [number, number]> = {
  clock: [36, 40],
  wellness: [36, 40],
  /** Pivot above bbox center — shifts star + rays lower in the card */
  event: [36, 16.5],
  assistant: [36, 40],
  home: [36, 40],
  travel: [36, 40],
}

function UniformScale({ illustration, children }: { illustration: PersonalServiceIllustration; children: ReactNode }) {
  const s = ICON_SCALE[illustration]
  const [px, py] = ICON_PIVOT[illustration]
  return <g transform={`translate(${px} ${py}) scale(${s}) translate(${-px} ${-py})`}>{children}</g>
}

/** Gold line-art icons for Personal Services cards (matches plan tier style). */
export function PersonalServiceGraphic({
  illustration,
  className,
}: {
  illustration: PersonalServiceIllustration
  className?: string
}) {
  const base = useId().replace(/:/g, '')
  const goldId = `psvc-gold-${base}`
  const goldDeepId = `psvc-gold-deep-${base}`
  const g = goldId
  const d = goldDeepId

  return (
    <svg
      className={className}
      viewBox="0 0 72 72"
      width={80}
      height={80}
      fill="none"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={goldId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5e6c8" />
          <stop offset="45%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#a88620" />
        </linearGradient>
        <linearGradient id={goldDeepId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c9a227" />
          <stop offset="100%" stopColor="#8b6914" />
        </linearGradient>
      </defs>

      <UniformScale illustration={illustration}>
        {illustration === 'clock' && <ClockGraphic g={g} d={d} />}
        {illustration === 'wellness' && <WellnessGraphic g={g} />}
        {illustration === 'event' && <EventGraphic g={g} />}
        {illustration === 'assistant' && <AssistantGraphic g={g} d={d} />}
        {illustration === 'home' && <HomeGraphic g={g} d={d} />}
        {illustration === 'travel' && <TravelGraphic g={g} d={d} />}
      </UniformScale>
    </svg>
  )
}

/** Hand strokes are solid: gradient strokes on thin <line>s often fail to paint in browsers. */
const CLOCK_HAND_HOUR = '#f5ecd4'
const CLOCK_HAND_MINUTE = '#d4af37'

function ClockGraphic({ g, d }: { g: string; d: string }) {
  const cx = 36
  const cy = 40
  const r = 20
  return (
    <>
      <circle
        vectorEffect="non-scaling-stroke"
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={`url(#${g})`}
        strokeWidth="1.75"
      />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
        <line
          key={deg}
          vectorEffect="non-scaling-stroke"
          x1={cx}
          y1={cy - r}
          x2={cx}
          y2={cy - r + (deg % 90 === 0 ? 3.2 : 2)}
          stroke={deg % 90 === 0 ? `url(#${d})` : `url(#${g})`}
          strokeWidth={deg % 90 === 0 ? 1.35 : 0.85}
          strokeLinecap="round"
          transform={`rotate(${deg} ${cx} ${cy})`}
        />
      ))}
      <g transform={`translate(${cx},${cy})`}>
        <line
          vectorEffect="non-scaling-stroke"
          x1="0"
          y1="0"
          x2="0"
          y2="-10.5"
          stroke={CLOCK_HAND_HOUR}
          strokeWidth="2.85"
          strokeLinecap="round"
          transform="rotate(-55)"
        />
        <line
          vectorEffect="non-scaling-stroke"
          x1="0"
          y1="0"
          x2="0"
          y2="-15.5"
          stroke={CLOCK_HAND_MINUTE}
          strokeWidth="2.15"
          strokeLinecap="round"
          transform="rotate(58)"
        />
        <circle
          vectorEffect="non-scaling-stroke"
          r="2.6"
          fill={`url(#${g})`}
          stroke={`url(#${d})`}
          strokeWidth="0.65"
        />
      </g>
    </>
  )
}

function WellnessGraphic({ g }: { g: string }) {
  return (
    <path
      vectorEffect="non-scaling-stroke"
      d="M36 52 C36 52 22 42 22 34 C22 28 26 24 31 24 C34 24 36 26 36 28 C36 26 38 24 41 24 C46 24 50 28 50 34 C50 42 36 52 36 52 Z"
      stroke={`url(#${g})`}
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
  )
}

/** Five-point star + three rays (luxury sparkle / special-occasion mark). */
function EventGraphic({ g }: { g: string }) {
  const sw = 1.75
  return (
    <>
      <path
        vectorEffect="non-scaling-stroke"
        fill="none"
        stroke={`url(#${g})`}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
        d="M 36 11 L 38.47 18.6 46.46 18.6 40 23.29 42.47 30.9 36 26.2 29.53 30.9 32 23.29 25.54 18.6 33.53 18.6 Z"
      />
      <line
        vectorEffect="non-scaling-stroke"
        x1="32"
        y1="35.5"
        x2="28.2"
        y2="44.2"
        stroke={`url(#${g})`}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <line
        vectorEffect="non-scaling-stroke"
        x1="36"
        y1="35.5"
        x2="36"
        y2="46.5"
        stroke={`url(#${g})`}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <line
        vectorEffect="non-scaling-stroke"
        x1="40"
        y1="35.5"
        x2="43.8"
        y2="44.2"
        stroke={`url(#${g})`}
        strokeWidth={sw}
        strokeLinecap="round"
      />
    </>
  )
}

function AssistantGraphic({ g, d }: { g: string; d: string }) {
  return (
    <>
      <path
        vectorEffect="non-scaling-stroke"
        d="M 28 20 h 16 a 2 2 0 0 1 2 2 v 4 h -20 v -4 a 2 2 0 0 1 2 -2 z"
        stroke={`url(#${g})`}
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path
        vectorEffect="non-scaling-stroke"
        d="M 30 22 h 12"
        stroke={`url(#${d})`}
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <rect
        vectorEffect="non-scaling-stroke"
        x="22"
        y="26"
        width="28"
        height="38"
        rx="3.5"
        stroke={`url(#${g})`}
        strokeWidth="1.75"
      />
      {[34, 42, 50].map((y) => (
        <path
          key={y}
          vectorEffect="non-scaling-stroke"
          d={`M 27 ${y} h 18`}
          stroke={`url(#${y === 34 ? d : g})`}
          strokeWidth={y === 34 ? 1.5 : 1.15}
          strokeLinecap="round"
          opacity={y === 34 ? 1 : 0.9}
        />
      ))}
    </>
  )
}

function HomeGraphic({ g, d }: { g: string; d: string }) {
  return (
    <>
      <path
        vectorEffect="non-scaling-stroke"
        d="M 36 18 L 54 32 v 22 H 18 V 32 L 36 18 Z"
        stroke={`url(#${g})`}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        vectorEffect="non-scaling-stroke"
        d="M 24 32 h 24"
        stroke={`url(#${d})`}
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <rect
        vectorEffect="non-scaling-stroke"
        x="31"
        y="40"
        width="10"
        height="14"
        rx="1.2"
        stroke={`url(#${d})`}
        strokeWidth="1.5"
      />
      <circle vectorEffect="non-scaling-stroke" cx="39" cy="47" r="1.1" fill={`url(#${d})`} />
    </>
  )
}

function TravelGraphic({ g, d }: { g: string; d: string }) {
  return (
    <>
      <path
        vectorEffect="non-scaling-stroke"
        d="M 27 28 Q 36 17 45 28"
        stroke={`url(#${g})`}
        strokeWidth="1.65"
        strokeLinecap="round"
      />
      <rect
        vectorEffect="non-scaling-stroke"
        x="20"
        y="28"
        width="32"
        height="26"
        rx="3.5"
        stroke={`url(#${g})`}
        strokeWidth="1.75"
      />
      <path
        vectorEffect="non-scaling-stroke"
        d="M 24 38 h 24"
        stroke={`url(#${d})`}
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <circle
        vectorEffect="non-scaling-stroke"
        cx="28"
        cy="56"
        r="2.5"
        stroke={`url(#${g})`}
        strokeWidth="1.35"
      />
      <circle
        vectorEffect="non-scaling-stroke"
        cx="44"
        cy="56"
        r="2.5"
        stroke={`url(#${g})`}
        strokeWidth="1.35"
      />
    </>
  )
}
