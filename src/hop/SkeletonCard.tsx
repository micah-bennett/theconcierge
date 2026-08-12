// A `.hop-card`-shaped placeholder with shimmering bars, shown while a page's data is still
// loading — replaces bare "Loading…" text. CSS-only shimmer (@keyframes background-position
// sweep in hopApp.css), no library. `lines` controls how many bars render.
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="hop-card hop-skeleton-card" aria-hidden="true">
      <div className="hop-skeleton-bar hop-skeleton-bar--title" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="hop-skeleton-bar" />
      ))}
    </div>
  )
}
