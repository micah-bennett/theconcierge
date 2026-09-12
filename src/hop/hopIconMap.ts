import {
  LayoutDashboard,
  Megaphone,
  ClipboardList,
  Users2,
  HeartPulse,
  MessageCircle,
  Link2,
  IdCard,
  BarChart3,
  Users,
  Menu,
  X,
  Car,
  UtensilsCrossed,
  Package,
  Sparkles,
  Palette,
  Lock,
  UserCog,
  Calendar,
  Thermometer,
  TrendingUp,
  PiggyBank,
  type LucideIcon,
} from 'lucide-react'

// Central icon lookup for HOP's nav/menu chrome — a small string key (kept on each NAV_ITEMS/
// QUICK_REQUESTS entry, same shape as the old `icon: '🏠'` emoji field) maps to a real Lucide
// component instead. Emoji stay everywhere they're *content* (tour step illustrations, reaction
// buttons, the mood picker) — this map only covers UI chrome: nav links, quick-request tiles, and
// dashboard/profile block headers. Add a new key here (not a raw emoji import elsewhere) whenever
// a new nav item or block needs an icon, so every icon in the app's chrome stays swappable in one
// place — see docs/hop/architecture.md's redesign entries.
//
// This file is identical on `main` and `staff-portal` (same convention as api/hop/**,
// AuthContext.tsx, etc. — see "Deployments" in docs/hop/architecture.md), even though some keys
// below (accounts/calendar/heatmap/requestStats/retention) are only used by ConciergeHub's
// admin/concierge/facility nav — keeping one shared file avoids the two branches' icon maps
// drifting out of sync.
//
// Split from the `HopIcon` component (./icons.tsx) purely so that file only exports a component —
// `react-refresh/only-export-components` requires that for Fast Refresh, same reason
// OnboardingTour.tsx/useTourVisibility.ts are split.
export const HOP_ICONS = {
  dashboard: LayoutDashboard,
  feed: Megaphone,
  requests: ClipboardList,
  familyCare: Users2,
  wellness: HeartPulse,
  messages: MessageCircle,
  integrations: Link2,
  profile: IdCard,
  overview: BarChart3,
  users: Users,
  menu: Menu,
  close: X,
  ride: Car,
  meal: UtensilsCrossed,
  errand: Package,
  other: Sparkles,
  appearance: Palette,
  security: Lock,
  accounts: UserCog,
  calendar: Calendar,
  heatmap: Thermometer,
  requestStats: TrendingUp,
  retention: PiggyBank,
} as const satisfies Record<string, LucideIcon>

export type HopIconKey = keyof typeof HOP_ICONS
