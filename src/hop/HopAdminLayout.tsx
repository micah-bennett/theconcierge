import type { TourStep } from './OnboardingTour'
import { HopShellLayout, type HopNavGroup } from './HopShellLayout'

const NAV_GROUPS: readonly HopNavGroup[] = [
  { items: [{ to: '/hop/admin', label: 'Overview', end: true, icon: 'overview' }] },
  {
    label: 'Community',
    items: [
      { to: '/hop/admin/feed', label: 'Feed', icon: 'feed' },
      { to: '/hop/admin/messages', label: 'Messages', icon: 'messages' },
    ],
  },
  {
    label: 'Dispatch',
    items: [
      { to: '/hop/admin/accounts', label: 'Accounts', icon: 'accounts' },
      { to: '/hop/admin/requests', label: 'Requests', icon: 'requests' },
      { to: '/hop/admin/wellness', label: 'Wellness', icon: 'wellness' },
    ],
  },
  {
    label: 'Account',
    items: [{ to: '/hop/admin/integrations', label: 'Integrations', icon: 'integrations' }],
  },
] as const

const ADMIN_TOUR_STEPS: TourStep[] = [
  {
    icon: '👋',
    title: 'Welcome to ConciergeHub Admin',
    body: 'Run dispatch from here: see who\'s working today, create concierge or member accounts, assign requests, and message members directly.',
  },
  {
    icon: '📣',
    title: 'The Feed',
    body: 'A shared feed with every role — members, concierges, and other admins all post and react here. A good place to check what\'s going on across the team.',
  },
  {
    icon: '🧑‍💼',
    title: 'Accounts',
    body: 'Create concierge, member, or Facility Admin accounts in one place — each gets an emailed invite with a permanent HOP number and a set-password link. Filter by role and enable or disable anyone from the same list.',
  },
  {
    icon: '📋',
    title: 'Requests',
    body: 'Assign a request to any admin or concierge, move it through the workflow, and log dispatch notes. Requester contact info and the assignee\'s rating both show right on the card.',
  },
  {
    icon: '💬',
    title: 'Messages',
    body: 'Message any HOP member directly — not tied to a specific request. Start a new conversation from a member\'s row on the Accounts page.',
  },
  {
    icon: '📊',
    title: 'Overview',
    body: 'Your dashboard shows HOP users, open requests, connected integrations, and — the "Working today" list — exactly who\'s on duty right now.',
  },
]

export function HopAdminLayout() {
  return (
    <HopShellLayout
      brandLabel="HOP admin"
      navGroups={NAV_GROUPS}
      tourSteps={ADMIN_TOUR_STEPS}
      tourKey="hop-tour-conciergehub-admin"
      loginRedirect="/hop/admin/login"
      roleClass="hop-shell--admin"
    />
  )
}
