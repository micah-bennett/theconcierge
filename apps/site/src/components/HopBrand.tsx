/**
 * The official HOP logo (design/HOP-Logo-Pack, trimmed web copies in public/brand/).
 * Brand rules: full-colour on light grounds, the reverse-white file on navy/dark
 * grounds, never below 120px wide — use the icon instead.
 */
export function HopBrand({ variant = 'color' }: { variant?: 'color' | 'white' }) {
  return (
    <img
      className="hs-brand__logo"
      src={variant === 'white' ? '/brand/hop-logo-white.png' : '/brand/hop-logo.png'}
      alt="HOP — Hospitality On-Site Professionals"
      width={600}
      height={176}
      decoding="async"
    />
  )
}
