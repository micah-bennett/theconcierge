/**
 * The official HOP logo for the app shell and auth pages (design/HOP-Logo-Pack; trimmed web
 * copies in public/brand/). Both colourways render and CSS shows the right one for the active
 * theme — brand rule: full-colour on light grounds, reverse-white on navy/dark. Below ~120px
 * wide the brand sheet says to use the icon instead (`variant="icon"`).
 */
export function HopLogo({ variant = 'full' }: { variant?: 'full' | 'icon' }) {
  const base = variant === 'icon' ? '/brand/hop-icon' : '/brand/hop-logo'
  const size = variant === 'icon' ? { width: 160, height: 101 } : { width: 600, height: 176 }
  return (
    <span className={`hop-logo hop-logo--${variant}`}>
      <img
        className="hop-logo__img hop-logo__img--color"
        src={`${base}.png`}
        alt="HOP — Hospitality On-Site Professionals"
        {...size}
        decoding="async"
      />
      <img
        className="hop-logo__img hop-logo__img--white"
        src={`${base}-white.png`}
        alt=""
        aria-hidden="true"
        {...size}
        decoding="async"
      />
    </span>
  )
}

