// A colored circle with initials — no avatar pattern existed anywhere in this codebase before
// the Feed. Color is deterministically hashed from the user's id via hsl(), never color-mix()
// (banned in this codebase — breaks the Capacitor iOS WKWebView target, see hopApp.css). The
// same person always gets the same color across sessions/pages.
function hashToHue(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 360
}

// Friendly label + badge color for a role — shared by the Feed's post cards and the unified
// accounts page (Phase 4), so the two surfaces read consistently.
const ROLE_LABELS: Record<string, string> = {
  user: 'Member',
  admin: 'Admin',
  concierge: 'Concierge',
  facility: 'Facility Admin',
}

export function hopRoleLabel(role: string): string {
  return ROLE_LABELS[role] || role
}

export function HopAvatar({
  firstName,
  lastName,
  userId,
  size = 'md',
}: {
  firstName: string
  lastName: string
  userId: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '?'
  const hue = hashToHue(userId)
  return (
    <span
      className={`hop-avatar hop-avatar--${size}`}
      style={{ background: `hsl(${hue}, 62%, 46%)` }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}
