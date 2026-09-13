import type { TourStep } from './OnboardingTour'
import { HopShellLayout, type HopNavGroup } from './HopShellLayout'

const NAV_GROUPS: readonly HopNavGroup[] = [
  {
    items: [
      { to: '/hop/admin', label: 'Overview', end: true, icon: 'overview' },
      { to: '/hop/admin/users', label: 'Users', icon: 'users' },
    ],
  },
  {
    label: 'Dispatch',
    items: [
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
    title: 'Welcome, Admin',
    body: 'This is HOP\'s admin view — manage member accounts, dispatch service requests, and keep an eye on integrations, all from one place.',
  },
  {
    icon: '👥',
    title: 'Users',
    body: 'See every HOP member, and enable or disable an account if needed.',
  },
  {
    icon: '📋',
    title: 'Requests',
    body: 'Assign a staff member to a new request, move it through the workflow (received → assigned → in progress → completed), and log dispatch notes.',
  },
  {
    icon: '❤️',
    title: 'Wellness',
    body: 'A read-only view of voluntary staff check-ins — for triage and support, not individual performance tracking.',
  },
  {
    icon: '🔗',
    title: 'Integrations',
    body: 'See who\'s connected their Google Calendar across your HOP members.',
  },
]

export function HopAdminLayout() {
  return (
    <HopShellLayout
      brandLabel="HOP admin"
      navGroups={NAV_GROUPS}
      tourSteps={ADMIN_TOUR_STEPS}
      tourKey="hop-tour-admin"
      loginRedirect="/hop/admin/login"
      roleClass="hop-shell--admin"
    />
  )
}
