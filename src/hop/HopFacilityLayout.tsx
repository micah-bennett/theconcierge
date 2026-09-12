import type { TourStep } from './OnboardingTour'
import { HopShellLayout, type HopNavGroup } from './HopShellLayout'

const NAV_GROUPS: readonly HopNavGroup[] = [
  { items: [{ to: '/hop/facility', label: 'Overview', end: true, icon: 'overview' }] },
  { label: 'Community', items: [{ to: '/hop/facility/feed', label: 'Feed', icon: 'feed' }] },
  {
    label: 'Insights',
    items: [
      { to: '/hop/facility/heatmap', label: 'Heat map', icon: 'heatmap' },
      { to: '/hop/facility/requests-stats', label: 'Request stats', icon: 'requestStats' },
      { to: '/hop/facility/retention', label: 'Retention', icon: 'retention' },
    ],
  },
  {
    label: 'Account',
    items: [{ to: '/hop/facility/my-requests', label: 'My requests', icon: 'requests' }],
  },
] as const

const FACILITY_TOUR_STEPS: TourStep[] = [
  {
    icon: '👋',
    title: 'Welcome to your Facility dashboard',
    body: 'See the results of having a concierge in the building — request volume, morale trends, and cost savings, all in one place.',
  },
  {
    icon: '📣',
    title: 'The Feed',
    body: 'A shared feed across the whole HOP team — a good way to see the human side behind the numbers on this dashboard.',
  },
  {
    icon: '🌡️',
    title: 'Heat map',
    body: 'See when stress levels rise across a shift, broken down by department where that data is available, so you can be proactive instead of reactive.',
  },
  {
    icon: '📈',
    title: 'Request stats',
    body: 'Daily, weekly, monthly, and yearly request volume — a direct signal of how much your staff are actually using HOP.',
  },
  {
    icon: '💰',
    title: 'Retention',
    body: 'Log a retention save when you believe concierge services helped keep a staff member — the running total shows the cost-savings impact.',
  },
  {
    icon: '📋',
    title: 'My requests',
    body: 'You also have your own HOP member account under this login — submit and track your own requests here without leaving the portal.',
  },
]

export function HopFacilityLayout() {
  return (
    <HopShellLayout
      brandLabel="HOP Facility"
      navGroups={NAV_GROUPS}
      tourSteps={FACILITY_TOUR_STEPS}
      tourKey="hop-tour-facility"
      loginRedirect="/hop/admin/login"
      roleClass="hop-shell--facility"
    />
  )
}
