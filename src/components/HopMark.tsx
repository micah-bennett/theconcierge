/**
 * The HOP mark — three figures rising, teal → blue → navy. Same paths as
 * public/hop-mark.svg (the favicon). The third dot is navy on light grounds
 * and white on the navy footer.
 */
export function HopMark({ dotColor = '#053069' }: { dotColor?: string }) {
  return (
    <svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M12 52C12 36 20 24 31 19C33 18 35 19 36 21L42 33C43 35 42 37 40 38C33 41 29 47 29 55H12V52Z"
        fill="#0EABA6"
      />
      <path
        d="M31 55C31 39 39 27 50 22C52 21 54 22 55 24L61 36C62 38 61 40 59 41C52 44 48 50 48 55H31Z"
        fill="#5BA9E6"
      />
      <circle cx="25" cy="16" r="7" fill="#0EABA6" />
      <circle cx="44" cy="12" r="7" fill="#5BA9E6" />
      <circle cx="57" cy="27" r="7" fill={dotColor} />
    </svg>
  )
}

/** Mark + "HOP / HOSPITALITY ON-SITE PROFESSIONALS" wordmark, used by header and footer. */
export function HopBrand({ dotColor }: { dotColor?: string }) {
  return (
    <>
      <span className="hs-brand__mark">
        <HopMark dotColor={dotColor} />
      </span>
      <span className="hs-brand__copy">
        <span className="hs-brand__word">HOP</span>
        <span className="hs-brand__sub">HOSPITALITY ON-SITE PROFESSIONALS</span>
      </span>
    </>
  )
}
