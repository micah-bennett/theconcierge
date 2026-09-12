import { useEffect, useState } from 'react'
import { hopConciergeGetDutyStatus, hopConciergeSetDutyStatus, hopListStaffThreads } from './api'
import type { TourStep } from './OnboardingTour'
import { HopShellLayout, type HopNavGroup } from './HopShellLayout'

// Self-toggle on/off duty — feeds the admin's "working today" roster. See hop_duty_log in
// db/schema.sql and docs/hop/architecture.md ("Phase 1 quick wins").
function DutyToggle() {
  const [onDuty, setOnDuty] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    hopConciergeGetDutyStatus()
      .then((result) => setOnDuty(result.onDuty))
      .catch(() => setOnDuty(null))
  }, [])

  async function toggle() {
    if (onDuty === null) return
    setBusy(true)
    try {
      const result = await hopConciergeSetDutyStatus(!onDuty)
      setOnDuty(result.onDuty)
    } finally {
      setBusy(false)
    }
  }

  if (onDuty === null) return null

  return (
    <button
      type="button"
      className={`hop-duty-badge ${onDuty ? 'hop-duty-badge--on' : 'hop-duty-badge--off'}`}
      onClick={toggle}
      disabled={busy}
    >
      {onDuty ? 'On duty' : 'Off duty'}
    </button>
  )
}

const CONCIERGE_TOUR_STEPS: TourStep[] = [
  {
    icon: '👋',
    title: 'Welcome to ConciergeHub',
    body: 'Every request assigned to you lives here, from a first "Accept" to closing it out — nothing to chase, it all shows up in one place.',
  },
  {
    icon: '✅',
    title: 'Accept, then work the request',
    body: 'When something new lands, accept it first — that\'s your acknowledgment that you\'ve got it. Then move it through status and add dispatch notes as you go.',
  },
  {
    icon: '📣',
    title: 'The Feed',
    body: 'A shared feed with members, admins, and other concierges — post a shout-out, react, and set a quick status so everyone knows who\'s around.',
  },
  {
    icon: '📞',
    title: 'Reach clients fast',
    body: 'Click a client\'s name on any request card for one-tap call, text, or email. Use "Call the office" up top to ring dispatch directly.',
  },
  {
    icon: '📅',
    title: 'Calendar & your profile',
    body: 'Calendar shows your upcoming and past requests. Your Profile is your showcase — headline, bio, specialties, and your rating from clients.',
  },
  {
    icon: '🟢',
    title: 'On/off duty',
    body: 'Toggle your duty status in the sidebar so admin knows you\'re working right now — it feeds the "working today" list they see.',
  },
]

export function HopConciergeLayout() {
  const [unreadStaffCount, setUnreadStaffCount] = useState(0)

  useEffect(() => {
    hopListStaffThreads()
      .then((result) => setUnreadStaffCount(result.threads.reduce((sum, t) => sum + t.unread_count, 0)))
      .catch(() => setUnreadStaffCount(0))
  }, [])

  const navGroups: readonly HopNavGroup[] = [
    { items: [{ to: '/hop/concierge', label: 'Overview', end: true, icon: 'overview' }] },
    {
      label: 'Community',
      items: [
        { to: '/hop/concierge/feed', label: 'Feed', icon: 'feed' },
        { to: '/hop/concierge/messages', label: 'Messages', icon: 'messages', badge: unreadStaffCount },
      ],
    },
    {
      label: 'My work',
      items: [
        { to: '/hop/concierge/requests', label: 'My requests', icon: 'requests' },
        { to: '/hop/concierge/calendar', label: 'Calendar', icon: 'calendar' },
      ],
    },
    { label: 'Account', items: [{ to: '/hop/concierge/profile', label: 'Profile', icon: 'profile' }] },
  ]

  return (
    <HopShellLayout
      brandLabel="HOP ConciergeHub"
      navGroups={navGroups}
      tourSteps={CONCIERGE_TOUR_STEPS}
      tourKey="hop-tour-concierge"
      loginRedirect="/hop/admin/login"
      roleClass="hop-shell--concierge"
      extraSidebarSlot={<DutyToggle />}
    />
  )
}
