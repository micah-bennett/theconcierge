# HOP — MVP scope (first build)

This tracks what's actually real after the initial login+framework build, so a future agent
doesn't assume more exists than does. Update this file whenever scope changes.

## Decided (with the user, 2026-07-10)

1. **Auth**: email + password, not magic-link, not a managed vendor (Clerk/Auth0). Reason:
   no existing auth vendor in the stack, and password auth is the most self-contained option
   given Neon is already the system of record.
2. **Integration depth**: build the full DB schema + UI framework for all integration types,
   but only Google Calendar is wired to a real OAuth flow. Reason: OAuth for each wearable
   vendor requires separate developer accounts/approval — out of scope for a first pass.
3. **Admin scope**: manage users (view/activate/disable), manage/triage service requests,
   view integration/connection status across all users. No content/CMS management for the
   marketing site itself.

## What's real

- Signup/login/logout for `user` role; login for `admin` role (admin accounts are seeded via
  `scripts/create-hop-admin.mjs`, no self-serve admin signup).
- Users can submit and view their own service requests (`ride`, `meal`, `errand`, `wellness`,
  `family_home`, `other`).
- Admins can see all users + all requests, disable/enable users, assign a request to any active
  staff/admin account, move a request through the full staff-controlled status lifecycle, and log
  dispatch notes — see "Dispatch workflow" below and in `architecture.md`.
- Google Calendar: connect via real OAuth, see upcoming events on the user dashboard,
  disconnect.
- Password reset: "Forgot password?" on both login pages sends a single-use, 30-minute reset
  link by email (Resend). Resetting destroys all of that user's existing sessions, so they're
  signed out everywhere and have to log in again with the new password.
- Settings page (`/hop/app/profile`, sidebar label "Settings"): users can edit their first and
  last name, which updates immediately everywhere the name is shown (e.g. the sidebar). Email is
  read-only — there is no self-serve email-change flow. There is no in-page "change password"
  form; the Security section links out to the forgot-password flow instead, since that's the
  only password-change path that exists.
- Family Care (`/hop/app/family-care`, sidebar item after Requests): six choice cards (childcare,
  eldercare, school/activity logistics, pet care, household emergency, other) that all submit
  through the existing request flow as the existing `family_home` service type — see "Family
  Care" in `architecture.md` for exactly how the category is captured without a schema change.
- Wellness check-ins (`/hop/app/wellness`, sidebar item after Family Care): a voluntary, private
  self-report check-in (feeling + what would help + optional note + optional shift-protection
  question), with a "Request support now" action into the existing request flow and the member's
  own recent check-ins. Admins have a read-only triage list at `/hop/admin/wellness` — no scoring,
  no risk alerts, no per-employee reporting to hospital administrators. See "Wellness check-ins"
  in `architecture.md` for the full shape and what's deliberately not built yet (aggregate
  reporting).
- Dispatch and live request tracking (2026-07-14): staff-controlled status lifecycle
  (`submitted → received → assigned → in_progress → [en_route → arrived, rides only] →
  completed`, `cancelled` from any non-terminal status), assignment to any active staff/admin
  account, a full status-change audit trail, and member-facing read-only tracking (status badge,
  assigned concierge, member-safe status language, timeline). Members can never change status —
  every status-changing endpoint requires `requireAdmin`. See "Dispatch workflow" in
  `architecture.md`.
- Live ride location (2026-07-14): while a ride request is `en_route`, the assigned staff member
  can start/stop sharing their live location (explicit in-app consent copy, then the browser's own
  permission prompt); the member sees a "last known location" map link and a "last updated" time,
  never a location history. Sharing stops automatically the moment status leaves `en_route`. This
  is active-browser sharing, not background tracking — see "Live ride location" in
  `architecture.md` for exactly what that means and its real limitations.

## 2026-09-06: HOP Feed, unified accounts page, function-budget consolidation, polish pass

From a push to make the app feel like "a big application" — a shared social feed across all four
roles, a smoother admin account-creation flow, and a visual/UX polish pass. See "Feed", "Unified
accounts page", and "Deployments" in `architecture.md` for full technical shape.

- **Feed** (`/hop/app/feed` on `main`; `/hop/admin/feed`, `/hop/concierge/feed`,
  `/hop/facility/feed` on `staff-portal` — **not** on `main`'s frozen legacy admin): a shared,
  LinkedIn/Facebook-style feed. Any of the four roles can post, react (Like/Celebrate/Support),
  and set a one-line status visible on a "who's around" rail. 15s polling, same pattern as
  request messages/ride location — no websockets. Pre-filled with sample posts/reactions/statuses
  via an extended `scripts/seed-hop-concierge-hub.mjs`. This widens the scope
  `docs/hop/roadmap.md` originally sketched (main-only) — the real requirement was a feed shared
  by every role, so it ships identically on both branches.
- **Unified accounts page** (`/hop/admin/accounts` on ConciergeHub, replacing the former separate
  "Team" and "Users" pages): one create form (concierge/member/Facility Admin), one list,
  filterable by role tab — no more losing track of a just-created Member account on a different
  page. No new backend endpoint; merges the two existing list endpoints client-side.
- **Function-budget consolidation**: `api/hop/ride-location.ts` merged into
  `api/hop/requests.ts` as `?action=location-*` on both branches, freeing exactly the one slot
  each project needed for `api/hop/social.ts`. Same request/response shapes, no behavior change.
- **Toast-provider fix**: `main`'s frozen `HopAdminLayout.tsx` was missing `HopToastProvider`
  (staff-portal's three admin/concierge/facility layouts already had it) — a real latent bug,
  fixed opportunistically.
- **Schema bug fix**: `db/schema.sql` had two sequential `hop_users_role_check` constraint
  definitions — an intermediate 3-role version left over from before the `facility` role existed,
  which broke re-running the migration against any DB that already had a `facility` row (violated
  before ever reaching the correct, wider constraint further down). Removed the stale
  intermediate version; only the final, most-permissive constraint should ever exist.
- **Visual polish**: bigger/more touch-confident buttons app-wide, a new `HopAvatar.tsx` component
  (first avatar pattern in this codebase), role badges, a warmer `--hop-gold`-accented empty-state
  treatment, and skeleton-loader/empty-state/toast consistency extended to previously-plain pages
  (`HopDashboardPage`, `HopMessagesPage` on `main`; `HopAdminDashboardPage`,
  `HopAdminRequestsPage` on ConciergeHub) — deliberately not exhaustive of every remaining plain
  page; see "Visual polish" in `architecture.md`'s Feed section for what's left for a follow-up
  pass.

## 2026-08-27: HOP Phase 2 — Facility portal, member engagement, staff tools

A large cycle from a detailed feature request covering all four HOP access levels. See "HOP
Phase 2" in `architecture.md` for the full technical shape of every item below.

- **Member**: special dates + family profile (birthday/anniversary, family member CRUD) on the
  Profile page; certifications with a 30-day renewal nag; four fixed daily health tasks worth
  points each (walk, stand, read an article, a rotating daily question); self-reported wellness
  trends (steps/sleep/mood) with a daily check-in nag; a one-tap anonymized mood check-in that
  feeds the Facility portal's morale/heatmap views; a floating HOP AI assistant widget (bottom-
  right, tap-only suggestions from upcoming family dates/certifications, no free text, no real
  push notifications — an honest in-app-only limitation stated in the widget itself).
- **HOP Admin (ConciergeHub)**: an on-duty auto-match suggestion on the dispatch page (one-click
  accept, manual reassignment untouched); admin-created member accounts confirmed already live
  from before this cycle.
- **HOP Concierge**: peer-to-peer staff messaging (new "Messages" nav item, first messaging
  surface for concierges) with admins and fellow concierges; staff-only, cross-request notes
  about a member, visible to admin and concierge, never the member.
- **Facility Admin** (net-new role + portal, ConciergeHub only): Overview (on-duty count,
  overtime, today's aggregate morale), Heat map (mood by hour × department), Request stats
  (daily/weekly/monthly/yearly volume), Retention (manually-logged cost-savings entries, not
  computed), and a "My Requests" tab so a Facility Admin can also use their own regular member
  identity without a second login. Everything facility-facing is aggregate/de-identified — no
  member is ever named alongside mood/heatmap/retention data.
- **Explicitly deferred this cycle** (stated, not silently dropped): real wearable OAuth
  integration (self-report only); real push notifications (in-app nag pattern only); automatic
  retention/cost-savings computation (manual entries only); a second linked member account +
  switcher for Facility Admins (single account, "My Requests" tab instead); a
  facilities/multi-tenancy model (every Facility view is site-wide, not scoped to one client).
- Function budget: `main` and `staff-portal` both landed at **12/12, fully maxed** — see
  "Deployments" in `architecture.md`. `api/relief.ts` was folded into `api/requests.ts` as
  `?type=relief` to free `main`'s last slot for `api/hop/profile.ts`.

## 2026-08-09: HOP numbers, admin-invited accounts, points ledger, UI/UX pass

From a push to make HOP "ready for real users" — sign-in/request-a-concierge for members, a
single admin ERP surface, a member profile with service history + rewards, and a UI/UX bug-fix +
polish pass. See "HOP number", "Points ledger", "Visual redesign" (this section's CSS fixes are a
follow-on to that 2026-07-24 pass, not a replacement of it) in `architecture.md` for full shape.

- Every HOP account (self-serve signups, CLI-created admins, admin-invited concierges/members) now
  gets a permanent, human-readable HOP number (`HOP001`, ...), usable to log in instead of email.
  Existing accounts were backfilled once via `scripts/backfill-hop-numbers.mjs`.
- ConciergeHub admins can now create **member** accounts in-app (`/hop/admin/concierges`, nav
  relabeled "Team"), not just concierge accounts — alongside the existing self-serve `/hop/signup`
  on `main`, which is unchanged and still live. Both paths work side by side.
- Member Profile tab (`/hop/app/profile`, relabeled from "Settings"): now also shows a full
  service-history summary (total/completed requests, ratings given) and a points balance + ledger
  history. Staff can manually award points from the Users tab (ConciergeHub). **No redemption
  flow** — view-only balance/history is the full scope this cycle.
- UI/UX bug-fix pass on `src/styles/hopApp.css`/`src/App.css` (shared across both deployments):
  removed all 13 uses of `color-mix()`, which silently drops the whole containing CSS property on
  WKWebView ≤16.1 (this app's Capacitor iOS target is 15.0) — the most likely concrete cause of
  "pale"/flat cards reported on the real mobile app; added a real `@supports`-gated fallback color
  for gradient-text headings/stat values (previously fully invisible if the clip effect failed);
  added `:active` press states and `.hop-btn-primary:disabled` styling (buttons had zero touch
  feedback before this, which read as "not working" even though every handler was correctly
  wired); grew several under-44px touch targets; fixed a genuinely undefined `--hop-surface` CSS
  variable (the contact-menu dropdown had no background at all); deepened light-theme contrast.
  Plus new shared polish infrastructure — toast confirmations, skeleton loaders, empty states, a
  status-change pulse animation, a breathing glow on the dashboard's primary action, staggered
  card fade-in — wired into the highest-traffic pages (dashboard/requests/profile/admin users), no
  new dependencies.

## 2026-07-24: Visual redesign + onboarding tour

A full pass on HOP's visual identity (`src/styles/hopApp.css`, shared across every page) plus a
new dismissible "🧭 Quick tour" walkthrough per role. See "Visual redesign + onboarding tour" in
`architecture.md` for the shape, and `docs/hop/walkthrough.md` for what each tour actually says
per role — that doc doubles as a plain-language page-by-page reference. Nothing here changed any
API/data behavior — CSS and two new frontend-only files (`OnboardingTour.tsx`,
`useTourVisibility.ts`).

## 2026-07-23: Phase 1 quick wins (concierge acceptance, ratings, messaging, duty status)

From a strategy review between the product owner and their boss covering concierge-rep, admin,
and member experience. See "Phase 1 quick wins" in `architecture.md` for the full technical shape;
`docs/hop/roadmap.md` has the phased design for everything from that review **not** built in this
pass (Facility portal, mood check-ins, family profiles, social feed, rewards — Phases 2 and 3).

What's real as of this pass:

- Concierges must explicitly accept an assigned request (`accepted_at`) before moving its status
  past `assigned` — no more silent assignment.
- Every HOP user can set a phone number (`/hop/app/profile`, `auth.ts?action=update-profile`);
  request cards (member, concierge, admin) surface it as click-to-call/text/email links.
- Members rate the concierge/admin who fulfilled a completed request (1–5 stars + optional
  comment, one per request); the rating aggregate shows on request cards and the concierge's own
  profile page.
- Admin ↔ member direct messaging (`/hop/app/messages`, `/hop/admin/messages`), separate from the
  existing per-request message thread.
- Concierges self-toggle on/off duty; admin's dashboard shows who's working today.
- The concierge's "Call the office" button and calendar's History/Upcoming toggle
  (`/hop/concierge/calendar`) — both staff-portal only.

**Not built in this pass** (see `docs/hop/roadmap.md` for the design): the Facility/hospital-
admin portal, the "how are you feeling right now" one-tap mood check-in and its stress-level heat
map, self/family profile dates, the dashboard suggestion feed, the internal social feed, and the
HVCS points/rewards ledger.

## 2026-07-16: HOP ConciergeHub, Phase 1 (Foundation)

Turned the admin-only dispatch tooling into a two-sided staff product on the ConciergeHub
deployment (`staff-portal` branch / `theconcierge-staff` project) — see "ConciergeHub" in
`architecture.md` for the full technical shape. What's real as of this pass:

- A third role, `concierge`, distinct from `admin`. Concierge accounts are created in-app by an
  admin (`/hop/admin/concierges`), not self-serve, not via CLI.
- Concierges can see and update requests assigned to them (`/hop/concierge/requests`), including
  status changes and dispatch notes, but cannot reassign requests or see anyone else's.
- A concierge showcase profile (headline, bio, specialties, years of experience) at
  `/hop/concierge/profile`. **Photo is a pasted URL only — there is no file upload/blob storage
  in this repo.** Don't assume real photo upload exists without checking here first.
- An agenda-style calendar (`/hop/concierge/calendar`) built client-side from the concierge's own
  assigned requests that have a needed-by time. **Not** a full calendar UI and **not** a personal
  Google Calendar sync — that would extend the existing `hop_integrations` OAuth flow and hasn't
  been built.
- An async, polling-based message thread per request (`hop_request_messages`), visible to the
  requester, the assigned concierge/admin, and any admin — reachable from the HOP user's own
  requests page once a concierge is assigned, from the concierge's request card, and read-only
  from the admin dispatch view. No read receipts / unread badges yet.
- Ride location sharing (previously admin-only) and request status/assignment updates now accept
  concierge callers too, gated to their own assigned requests.

**Smart Suggestions / Moments (AI-driven traffic alerts, lunch reminders, wearable recovery
tips)** — this was the third priority feature named alongside wellness and family care, and is
**explicitly deferred, not built in this pass**. Wearable integrations (Fitbit/Oura/Apple
Health/Garmin) are still UI-only stubs with no real data (see "What's stubbed" below), so there's
no real signal to build "smart" suggestions from yet beyond calendar events and request history.
Don't build a placeholder route for this without an explicit spec, per the "Smart Moments" note
below.

## 2026-07-14: dashboard trimmed to exactly 6 quick-request cards

The dashboard's quick-request grid is now exactly Ride, Meals, Errands, Wellness, Family Care,
Other — matching the 6 service categories 1:1. The "How are you doing today?" wellness-*check-in*
quick tile (added 2026-07-13) was removed from this grid to match that explicit 6-card list; the
check-in feature itself is unaffected and still fully reachable via the sidebar's "Wellness" nav
item. If a future task wants a 7th "check-in" tile back on the dashboard, that's a deliberate
choice to make explicitly — don't assume it should just be re-added.

No "Smart Moments" route/placeholder was added — nothing by that name existed in this codebase
before, and inventing a placeholder for a feature that was never built would itself be exactly the
kind of fabricated feature these docs tell you not to add. If "Smart Moments" refers to something
specific from a design reference, it needs its own explicit spec first.

## What's stubbed / not built yet

- Fitbit, Oura, Apple Health, Garmin integrations: UI cards exist and are disabled
  ("Coming soon"), no OAuth, no data. `hop_wearable_metrics` table exists but is unpopulated.
- IP-based login rate limiting (only per-account lockout after repeated failures exists).
- Rewards **redemption** (`hop_points_ledger` exists, points can be awarded and viewed, but
  there's no "redeem points toward a request" flow) and any automatic point-earning rule
  (check-in streaks, profile-completion bonus, wearable challenges) — the `source` CHECK values
  exist for these, but nothing writes them yet. See "Points ledger" in `architecture.md`.
- Any real fulfillment/dispatch logic behind a service request — requests are just recorded
  and status-tracked, not routed to an actual provider network.
- Real wearable OAuth data behind the wellness trends chart and mood check-in (both are
  self-reported this cycle — see "HOP Phase 2" above); a facilities/multi-tenancy model for the
  Facility portal (every view is currently site-wide, not scoped to one hospital client); real
  push notifications (every "reminder" in the app is an in-app nag, not a push notification);
  automatic retention/cost-savings computation (the Facility portal's retention entries are
  manually logged by staff, never derived).
- The "VBC Dashboard" mentioned on the marketing page (hospital-admin-facing analytics) — built as
  of 2026-08-27's Facility portal (`/hop/facility/*`, staff-portal only). See "Facility portal" in
  `architecture.md`.
- "HOP AI" as an actual assistant (it was previously just a marketing chip) — built as of
  2026-08-27 as a rule-based, tap-only suggestion widget (`HopAiAssistant.tsx`), **not** a real
  LLM call. `api/hop/profile.ts?action=feed`'s DB-only rule table is the seam a future version
  could hand to `api/chat.ts`'s existing Anthropic client instead — not built now.

Before building any of the above, re-check this file and `architecture.md` — don't assume a
stubbed integration is further along than described here.

## 2026-07-11: public homepage redesign → reverted, moved into HOP dashboard

A separate workstream rebuilt the entire public marketing site (new Syne/Inter fonts, indigo/cyan
palette, one-page structure: hero, burnout stats, how-it-works, 6 service cards, HOP teaser,
about, an inline request form + "Book a Relief Call" sidebar) based on a leadership-provided
prototype PDF. It also replaced the public `/hop` marketing page with a redirect and the
`/request` modal with an inline section.

Leadership then decided that content was healthcare-specific and belonged in HOP's **post-login**
experience, not the general-audience public homepage (which serves families/seniors/businesses
too). Result:

- **Reverted**: the public homepage, nav, footer, fonts/colors, `/hop` marketing page, and
  `/request` modal are all back to their original (pre-redesign) versions. The public site today
  is exactly as described elsewhere in these docs — nothing healthcare-specific on `/`.
- **Kept, moved into HOP, then removed (2026-07-13)**: the redesign's sections were componentized
  (not copy-pasted) into `src/hop/dashboard/` and appended below the functional content on
  `/hop/app`. That lasted until 2026-07-13, when it was removed entirely as repetitive — a user
  doesn't need HOP's own sales pitch every time they log in to *use* HOP. `src/hop/dashboard/` and
  `src/styles/hopDashboard.css` no longer exist. If HOP's pitch needs to live somewhere again,
  that's the public `/hop` marketing page's job (`src/pages/HopPage.tsx`), not the authenticated
  dashboard — see "Where HOP's app lives in routing" in `architecture.md`.
- **Orphaned (backend kept, no frontend)**: the "Book a Relief Call" facility-lead-capture feature
  (`relief_call_requests` table, `sendReliefEmail`) has no page linking to it anymore — its
  sidebar was part of the reverted homepage. It still works end-to-end if called directly (now
  via `POST /api/requests?type=relief` — merged from the former standalone `api/relief.ts` into
  `api/requests.ts` on 2026-08-27 as a function-budget consolidation, freeing a slot for
  `api/hop/profile.ts`; see `docs/hop/architecture.md`); it just isn't reachable from any UI right
  now. If asked to add a facility-contact flow, check here first before rebuilding it — a natural
  home would be the Contact page.
- **Reverted**: the `path` (`'individual' | 'facility'`) field that was added to
  `concierge_requests`/`api/requests.ts`/`api/_lib/requestValidation.ts` for the redesign's toggle
  was removed from the app layer. The `path` column itself is still in the DB (harmless, unused,
  additive-only — matches this repo's no-DROP-COLUMN convention), so don't be surprised to see it
  in `db/schema.sql`.

**Do not re-propose putting the burnout-stats/service-cards/story content back on the public
homepage** — that exact change was made and explicitly reversed by leadership.
