export type AudienceIconType = 'healthcare' | 'families' | 'business' | 'seniors'

const ICON_SIZE = 44

const AUDIENCE_ICONS: Record<AudienceIconType, string> = {
  healthcare: '/icons/audience-healthcare.png?v=2',
  families: '/icons/audience-family.png?v=1',
  business: '/icons/audience-business.png?v=5',
  seniors: '/icons/audience-seniors.png?v=1',
}

export function AudienceIcon({
  type,
  className,
}: {
  type: AudienceIconType
  className?: string
}) {
  return (
    <img
      className={className}
      src={AUDIENCE_ICONS[type]}
      alt=""
      width={ICON_SIZE}
      height={ICON_SIZE}
      decoding="async"
      aria-hidden
    />
  )
}
