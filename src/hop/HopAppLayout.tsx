import type { TourStep } from './OnboardingTour'
import { HopShellLayout, type HopNavGroup } from './HopShellLayout'
import { HopAiAssistant } from './HopAiAssistant'

// Grouped nav — was one flat 8-item list; grouping related features together is part of the
// redesign (see docs/hop/architecture.md's redesign entry) and generalizes the same way to the
// other three roles' shells.
const NAV_GROUPS: readonly HopNavGroup[] = [
  { items: [{ to: '/hop/app', label: 'Dashboard', end: true, icon: 'dashboard' }] },
  {
    label: 'Community',
    items: [
      { to: '/hop/app/feed', label: 'Feed', icon: 'feed' },
      { to: '/hop/app/messages', label: 'Messages', icon: 'messages' },
    ],
  },
  {
    label: 'Care',
    items: [
      { to: '/hop/app/requests', label: 'Requests', icon: 'requests' },
      { to: '/hop/app/family-care', label: 'Family Care', icon: 'familyCare' },
      { to: '/hop/app/wellness', label: 'Wellness', icon: 'wellness' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/hop/app/integrations', label: 'Integrations', icon: 'integrations' },
      { to: '/hop/app/profile', label: 'Profile', icon: 'profile' },
    ],
  },
] as const

const MEMBER_TOUR_STEPS: TourStep[] = [
  {
    icon: '👋',
    title: 'Welcome to HOP',
    body: 'One place for anything you need during your shift — rides, meals, errands, wellness support, and family logistics. Ask once, a concierge takes it from there.',
  },
  {
    icon: '📣',
    title: 'The Feed',
    body: 'One shared feed for everyone on HOP — post a shout-out, react to what others share, and set a quick status so the team knows who\'s around.',
  },
  {
    icon: '📋',
    title: 'Submit & track requests',
    body: 'Start a request from Dashboard or Requests. Watch it move through submitted → assigned → done in real time, and message your concierge right from the request.',
  },
  {
    icon: '❤️',
    title: 'Wellness & Family Care',
    body: 'Check in on how you’re doing on the Wellness page, or get help with childcare, eldercare, pet care, and more under Family Care.',
  },
  {
    icon: '⭐',
    title: 'Rate your concierge',
    body: 'Once a request is completed, rate the concierge who helped you. It shows on their profile and helps us pair you with great people.',
  },
  {
    icon: '🪪',
    title: 'Messages & Profile',
    body: 'Message HOP Admin directly anytime from Messages. Your Profile page has your account settings, phone number, HOP number, your full service history, and any rewards points you\'ve earned.',
  },
]

export function HopAppLayout() {
  return (
    <HopShellLayout
      brandLabel="HOP"
      navGroups={NAV_GROUPS}
      tourSteps={MEMBER_TOUR_STEPS}
      tourKey="hop-tour-member"
      loginRedirect="/hop/login"
      afterContent={<HopAiAssistant />}
    />
  )
}
