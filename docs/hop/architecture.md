# HOP — Architecture

Read this before adding a HOP feature. It describes how the app is actually wired today, not
how it might look eventually — check `mvp-scope.md` for what's real vs. stubbed.

## Stack

- **Frontend**: Vite + React 19 + TypeScript, client-side routed with `react-router-dom` v7
  (`src/App.tsx`). No CSS framework or component library — every page has hand-written CSS with
  BEM-ish class names (e.g. `hop-page`, `hop-service-card__ico`).
- **Backend**: Vercel Functions under `api/`, written as Web-standard handlers
  (`export async function POST(request: Request): Promise<Response>`), not Node
  `req`/`res` handlers. File-system routing: `api/foo.ts` → `/api/foo`.
  **Avoid dynamic segments** (`api/foo/[id].ts`): `vercel.json`'s SPA catch-all rewrite
  (`"/(.*)" -> "/index.html"`) wins over bracket routes in both `vercel dev` and real
  production on this project, so a request to `/api/foo/123` silently returns the SPA's
  `index.html` instead of hitting the function. Pass an `id`/`action` via a query string or
  the request body on a flat file instead (see `api/hop/auth.ts`'s `?action=` dispatch and
  `api/hop/requests.ts`'s body-based `PATCH`). This also matters for the Hobby-plan
  12-Serverless-Function cap, tracked **per Vercel project** — see "Deployments" below for how
  `main` and the ConciergeHub deployment now carry different `api/` trees and different counts.
  `main` (`theconcierge`) is at **11 of 12** as of the 2026-07-23 Phase 1 pass (see "Phase 1 quick
  wins" above) — `chat.ts`, `requests.ts`, `relief.ts`, and 8 under `api/hop/**`. Any future
  `main` feature needing a new function must fold into an existing `?action=` file or free a slot
  first (`api/relief.ts` is the current best candidate — see `mvp-scope.md` and
  `docs/hop/roadmap.md`, which already spends that slot in its Phase 3 design).
- **Database**: Neon serverless Postgres via `@neondatabase/serverless`'s `neon()` tagged-template
  client. One schema file, `db/schema.sql`, written idempotently (`CREATE TABLE IF NOT EXISTS`,
  `ADD COLUMN IF NOT EXISTS`, etc.) and applied with `npm run db:migrate`.
- **Email**: Resend (`api/_lib/email.ts`), used today for the concierge-request notification
  flow. Not used by HOP auth (auth is email+password, not magic-link).
- **AI**: `api/chat.ts` calls the Anthropic API directly for the marketing site's chatbot. Unrelated
  to HOP's own AI plans ("HOP AI" chip is a future service category, not built yet).
- **Local dev**: `vite` alone does not serve `/api/*`; use `vercel dev` for anything that touches
  the API/DB, per `README.md`.

## Conventions used by existing API code (`api/requests.ts`, `api/chat.ts`)

- Validate the request DB URL / API key is configured before doing anything; return `503` if not.
- Validation lives in dedicated helpers under `api/_lib/` (e.g. `requestValidation.ts`), not
  inline in the handler.
- Errors: catch broadly, classify by message pattern into a 4xx or 500 status, `console.error`
  only on 500s (don't log expected validation failures).
- Responses always set `Cache-Control: no-store` on dynamic JSON.

HOP's own API code (`api/hop/**`, `api/_lib/hopDb.ts`, `api/_lib/hopAuth.ts`,
`api/_lib/googleCalendar.ts`) follows the same conventions but is kept separate from the
existing concierge-request/chat code — no shared modules were refactored to avoid touching
working, unrelated code.

## Where HOP's app lives in routing

- `/hop` — the existing marketing page (`src/pages/HopPage.tsx`), untouched except for a
  login/signup CTA in the hero.
- `/hop/login`, `/hop/signup`, `/hop/admin/login`, `/hop/forgot-password`, `/hop/reset-password`
  — auth pages, public.
- `/hop/app/*` — authenticated **user** portal (`src/pages/hop/app/`), behind `RequireAuth`.
- `/hop/admin/*` — authenticated **admin** portal (`src/pages/hop/admin/`), behind `RequireAdmin`.

Auth state lives in `src/hop/AuthContext.tsx`, scoped to a layout route that wraps only the
`/hop/login`, `/hop/signup`, `/hop/admin/login`, `/hop/forgot-password`, `/hop/reset-password`,
`/hop/app/*`, `/hop/admin/*` subtree — so loading the marketing site (including plain `/hop`)
never triggers a session check.

`HopDashboardPage.tsx` (`/hop/app`) is functional-only: greeting, quick-request tiles, and the
Google Calendar preview. It previously also rendered a componentized "why HOP" marketing section
below that (`src/hop/dashboard/`, `src/styles/hopDashboard.css`) — removed 2026-07-13 as repetitive
noise once a user is already logged in; see `mvp-scope.md` for that history. Don't re-add
marketing/sell content to the authenticated dashboard — if leadership wants HOP's pitch shown
somewhere, that belongs on the public `/hop` marketing page (`src/pages/HopPage.tsx`), not here.

## Family Care (`/hop/app/family-care`)

A dedicated entry point for the `family_home` service type, for users who want more specific
framing than the generic request form. `HopFamilyCarePage.tsx` shows six choice cards (childcare,
eldercare, school/activity logistics, pet care, household emergency, other) that each link to
`/hop/app/requests?type=family_home&category=<slug>` — **there is no `family_care` or per-category
value in the `hop_service_requests.service_type` CHECK constraint**; every choice submits as the
existing `family_home` type. `HopRequestsPage.tsx` reads the optional `category` param purely to
pre-fill the free-text `details` field with a human-readable label (e.g. "Eldercare support — ")
so the concierge still sees which category was picked, without a schema change or a duplicate
service type. If per-category structured data (not just a details prefix) is needed later, that
requires a real schema change — check with the user before assuming free-text is sufficient long
term.

## Wellness check-ins (`/hop/app/wellness`, `/hop/admin/wellness`)

A voluntary, append-only self-report log — not a clinical tool, not a performance record. Deciding
what to build here, and what *not* to build, matters: don't add scoring, risk alerts, diagnostic
language, individual reporting to hospital administrators, or anything that reads as an employee
monitoring feature. If a future task asks for aggregate/de-identified trend reporting, that's a
new admin analytics view built on top of this table — it is explicitly not built yet.

- **Schema**: `hop_wellness_checkins` (`db/schema.sql`) — `user_id`, `feeling` (`doing_well` |
  `stretched_thin` | `low_energy` | `overwhelmed`), `desired_support` (`meal` | `ride` | `errands`
  | `wellness_appt` | `time_back_home` | `talk_to_concierge`), `note` (free text, 500 char cap
  enforced in `api/hop/wellness.ts`), `shift_protection` (nullable: `yes` | `no` |
  `not_applicable`), `created_at`. No `status`/`handled_by`/`updated_at` — check-ins aren't a
  ticket workflow, they're a log a concierge reads for triage.
- **API**: `api/hop/wellness.ts` (one flat file, no new function beyond the one it is — 10 total
  now). `GET` is role-branched like `api/hop/requests.ts`: a `user` gets their own last 20
  check-ins, an `admin` gets everyone's, joined with name/email, for triage. `POST` creates a
  check-in for the caller. No `PATCH` — there's nothing to update/triage-status on a check-in.
- **Frontend**: `HopWellnessPage.tsx` (user) has the check-in form, a privacy statement, an
  emergency-services notice, and the user's own recent check-ins. `HopAdminWellnessPage.tsx`
  (admin) is a plain read-only table, same shape as `HopAdminRequestsPage.tsx` — deliberately not
  an analytics/aggregate view.
- **"Request support now"**: after submitting, the confirmation offers a request pre-filled from
  `desired_support` → the closest existing `hop_service_requests.service_type` (`meal`→`meal`,
  `ride`→`ride`, `errands`→`errand`, `wellness_appt`→`wellness`, `time_back_home`→`family_home`,
  `talk_to_concierge`→`other`). Same `category` query-param + details-prefix mechanism as Family
  Care — see `CATEGORY_LABEL` in `HopRequestsPage.tsx`. No new service_type was added. The
  check-in's `shift_protection` answer, if any, is also folded into the pre-filled details text
  (`&shift=` query param) so it's visible to dispatch — there's no direct DB link between a
  check-in row and the request it produces.

## Visual redesign + onboarding tour (2026-07-24)

- **Design tokens** (`src/styles/hopApp.css`, root `.hop-shell, .hop-auth-page` block): a distinct
  "aurora dusk" identity — a fixed, low-opacity multi-color radial-gradient glow (`--hop-aurora-1/
  2/3`) behind glass-panel cards (`backdrop-filter: blur(...)`), the existing indigo/violet/cyan
  trio kept as the cool brand palette, plus a new `--hop-gold` reserved for ratings/rewards/
  highlights so those moments read as distinct from routine indigo badges. New shared radius/
  shadow tokens (`--hop-radius-sm/md/lg/pill`, `--hop-shadow-card`, `--hop-shadow-glow`). Both
  dark and light theme variants defined, same as before. Every rule still reads colors via
  `var(--hop-*)` — see `docs/design-system.md`.
- **Sidebar nav** (`HopAppLayout.tsx`, `HopAdminLayout.tsx`, `HopConciergeLayout.tsx`): each
  `NAV_ITEMS` entry now carries an `icon` (emoji) rendered alongside its label; the active item is
  a gradient pill with a glow shadow. A small gradient brand mark (✦) replaces the plain "HOP"
  wordmark. The theme toggle/logout buttons moved into a `.hop-shell__utility-row` of small pill
  buttons alongside the new "🧭 Quick tour" button.
- **Onboarding tour** (`src/hop/OnboardingTour.tsx` + `src/hop/useTourVisibility.ts`): a
  dismissible modal carousel, not a DOM-anchored spotlight tour — deliberately, so it works
  identically regardless of which page happens to be open and never needs to track real page
  elements. `useTourVisibility(storageKey)` gates it on a `localStorage` flag scoped **per role,
  per browser** (`hop-tour-member`, `hop-tour-concierge`, `hop-tour-admin`,
  `hop-tour-conciergehub-admin`) — not per account, which avoids an async-timing dependency on the
  logged-in user id being available on first render. Step content is authored per layout (each
  `*Layout.tsx` defines its own `*_TOUR_STEPS` array) since the four roles' features differ
  meaningfully; see `docs/hop/walkthrough.md` for the plain-language version of the same content.
  Split into two files (component vs. hook) specifically to satisfy
  `react-refresh/only-export-components` — Fast Refresh requires a component file to export only
  components.
- **Known gradient-text gotcha, already fixed**: `.hop-page-title`'s gradient-text effect
  (`-webkit-background-clip: text`) clips letter descenders (a lowercase "y"/"g" reads as cut off)
  without enough `line-height`/`padding-bottom` — both are set explicitly on `.hop-page-title` for
  this reason. If a future gradient-text treatment is added elsewhere, budget the same headroom or
  it will visibly clip in Chrome.

## Phase 1 quick wins (2026-07-23)

A batch of concierge-rep, admin, and member features from a strategy review between the product
owner and their boss. Full phased design (including what's *not* built yet — the Facility portal,
mood check-ins, family profiles, social feed, rewards) lives in `docs/hop/roadmap.md`; this
section covers only what shipped in this pass.

- **Acceptance/acknowledgment**: `hop_service_requests.accepted_at` (nullable timestamp) — the
  assigned staff member must call `PATCH { id, accept: true }` before the request can move past
  `assigned`. Deliberately a separate column, not a new status value, so
  `isValidStatusTransition()`/`nextValidStatuses()` in `hopRequestWorkflow.ts` stay untouched;
  the gate is `requiresAcceptance(current)` (true only for `assigned`), checked in
  `api/hop/requests.ts`'s `PATCH` alongside the existing transition check. Only the current
  `handled_by` can accept; accepting logs a `hop_service_request_status_history` row
  (`note='Accepted'`) but does not itself change `status`. The concierge UI hides the status
  `<select>` entirely until accepted (shows an "Accept request" button instead), so the
  server-side rejection path is a defense-in-depth backstop, not the primary UX.
- **Click-to-call/text/email**: `hop_users.phone` (new column, editable via
  `auth.ts?action=update-profile`, alongside `firstName`/`lastName`). Surfaced on request cards as
  a `ContactMenu` component (`src/hop/ContactMenu.tsx`, staff-portal) — click a name, a small
  disclosure reveals `tel:`/`sms:`/`mailto:` links. No telephony vendor integration; these are
  plain browser-native link schemes. The concierge's "Call the office" button
  (`HopConciergeRequestsPage.tsx`) is a static `tel:` link sourced from the build-time
  `VITE_HOP_DISPATCH_PHONE` env var (staff-portal only — see `.env.example`), not a DB-backed
  setting; changing the number requires a redeploy.
- **Concierge ratings**: `hop_concierge_ratings` (`request_id` UNIQUE, `concierge_id`,
  `rated_by`, `stars` 1–5, `comment`, `created_at`) — one rating per completed request, submitted
  by the request's own member via `POST /api/hop/requests?action=rate`
  (`api/hop/requests.ts`). Both the member's request list and the admin's dispatch view include
  an `assignee_rating` aggregate (`AVG(stars)`, `COUNT(*)`, computed live via
  `attachAssigneeRatings()`, not denormalized onto `hop_users`) so a concierge's overall rating is
  visible wherever they're shown as an assignee. The concierge's own profile page
  (`api/hop/concierge.ts?action=profile`) also returns this aggregate for their own account. No
  gratuity/payout logic — this is visibility only, for the human decision the boss described.
- **Admin ↔ member direct messaging**: `hop_direct_messages` (`thread_user_id`, `sender_id`,
  `body`, `read_at`, `created_at`) — new, flat `api/hop/messages.ts`. Deliberately separate from
  `hop_request_messages` (which stays scoped to one request's requester/assignee/admin): this is a
  single ongoing thread per member, not tied to any request, threaded by `thread_user_id` — "admin"
  is a role here (any admin can read/reply into any member's thread), not one specific
  counterparty, matching the existing assignment model. Member UI: `HopMessagesPage.tsx`
  (`/hop/app/messages`, `main`). Admin UI: `HopAdminMessagesPage.tsx`
  (`/hop/admin/messages`, staff-portal) — an inbox (`GET /messages?scope=admin`, latest message +
  unread count per thread) plus a thread view (`GET /messages?scope=admin&userId=`); a "Message"
  link on `HopAdminUsersPage.tsx` deep-links into a thread even before a first message exists.
  15-second polling, same pattern as `RequestMessageThread`/`RideTracker` — no websockets.
- **On/off-duty roster**: `hop_duty_log` (`user_id`, `clock_in_at`, `clock_out_at` nullable) —
  self-toggle clock-in/out, not GPS/biometric-verified. Concierges toggle it from a badge in
  `HopConciergeLayout.tsx`'s sidebar (`api/hop/concierge.ts?action=duty-status`, GET reads own
  state, POST `{ onDuty }` opens/closes a row). Admin's dashboard shows a "Working today" count
  and name/role list (`api/hop/admin/users.ts?scope=on-duty`, staff-portal only — the write side
  only exists on `concierge.ts`, which isn't on `main`). `hop_users.default_shift_end_time` (new,
  nullable `TIME` column) was added alongside this — not used by anything in this pass, but is the
  minimal "shift schedule" the Facility portal's overtime metric (`docs/hop/roadmap.md`, Phase 2)
  will read against.
- **Function-budget consolidation** (needed to make room for `api/hop/messages.ts` on `main`,
  which was already at 12/12): `api/hop/integrations.ts` folded into
  `api/hop/integrations/google.ts` as `?action=list`; `api/hop/admin/integrations.ts` folded into
  `api/hop/admin/users.ts` as `?scope=integrations`. Both consolidations applied on **both**
  branches (frees 2 on `main`, 2 on `staff-portal`) — see "Deployments" below for the resulting
  counts. No behavior change, just fewer files; `src/hop/api.ts`'s exported functions
  (`hopListIntegrations`, `hopAdminListIntegrations`) kept the same names/signatures so no caller
  changed.

## Dispatch workflow (2026-07-14)

Staff-controlled request lifecycle, assignment, and a status-change audit trail.

- **Status lifecycle** (`api/_lib/hopRequestWorkflow.ts`): `submitted → received → assigned →
  in_progress → completed`, with `en_route`/`arrived` inserted between `in_progress` and
  `completed` **only** for `service_type = 'ride'`. `cancelled` is reachable from any non-terminal
  status. `completed` and `cancelled` are terminal — no further transitions out of either.
  `isValidStatusTransition()` enforces "exactly one step forward, or cancel" server-side in
  `api/hop/requests.ts`'s `PATCH`; it is the single source of truth `nextValidStatuses()` also
  feeds to the admin UI so the status `<select>` never even offers an invalid option. Only
  `requireAdmin` callers can reach `PATCH` — members can never set their own status.
- **Assignment reuses `handled_by`**: `hop_service_requests.handled_by` already existed (it used
  to mean "whichever admin last touched status"); it's now the deliberate "assigned staff member"
  field, set via its own `assignedTo` field on the same `PATCH` body, independent of a status
  change. It was **not** renamed — a column rename isn't safely idempotent to rerun on a table
  with existing rows, and the meaning is now documented here instead. Assignment only accepts a
  `role = 'admin' AND status = 'active'` user id (or `null` to unassign) — `api/hop/admin/users.ts`
  gained a `?scope=staff` mode for the assignment dropdown; it never returns `role = 'user'`
  accounts, so members can never be assigned a request.
- **Audit trail**: `hop_service_request_status_history` — one row per `PATCH` call that actually
  changes status, assignment, and/or adds a note (a note-only call with no status/assignment
  change still logs a row). Append-only, never edited or deleted except by cascade when the
  parent request is deleted. Admin's `GET` returns the full entry (`status`, `note`, `staff_name`,
  `created_at`); a member's `GET` returns only `status` + `created_at` for their own requests —
  raw staff notes are **never** sent to members (see "member-safe" below).
- **Member-safe status language**: members never see raw dispatch notes. `HopRequestsPage.tsx`
  renders a static per-status message (`MEMBER_STATUS_MESSAGE`) instead — e.g. `en_route` →
  "Your ride is on the way." This is a deliberate design choice, not a missing feature: dispatch
  notes can contain internal operational detail ("driver stuck on 87, ETA slipping") that isn't
  appropriate to forward verbatim, and there's no reliable way to auto-sanitize free text.
- **Admin dispatch UI** (`HopAdminRequestsPage.tsx`): request cards (not a table — the old
  table-based UI didn't have room for assign/status/note controls per row) with five filter tabs
  computed client-side from the already-fetched list (`bucketFor()`): **New/unassigned**
  (`handled_by IS NULL`, non-terminal), **Assigned** (`handled_by` set, not yet
  `in_progress`/`en_route`/`arrived`), **Active** (`in_progress`/`en_route`/`arrived`),
  **Completed**, **Cancelled**. No new list endpoints per tab — one `GET /api/hop/requests` call,
  filtered in the browser.
- **Member tracking** (`HopRequestsPage.tsx`): status badge, assigned concierge name (once
  assigned), the member-safe status message, and — only when history exists — a timeline of
  status changes (status + timestamp only, no notes/staff names). Members have no status-changing
  UI at all; the only requests API call available to a `role='user'` caller is `GET`/`POST`, never
  `PATCH` (enforced by `requireAdmin` on the server, not just hidden in the UI).

## Live ride location (2026-07-14)

Privacy-first, active-browser-only location sharing — **not** background tracking. This only
exists for `service_type = 'ride'` while `status = 'en_route'`; it is unreachable for every other
service type or status, enforced server-side in `api/hop/ride-location.ts`, not just hidden client-
side.

- **Schema**: `hop_ride_locations` — `request_id` is the **primary key** (one row per request,
  always upserted via `ON CONFLICT (request_id) DO UPDATE`), `shared_by`, `latitude`, `longitude`,
  `updated_at`. Deliberately no history table — only the latest known point is ever stored, and
  the row is deleted (not archived) the moment sharing should stop. This is why the member-facing
  `GET` can never expose a location *history*, only ever the current/last point.
- **API** (`api/hop/ride-location.ts`, one new flat file — 11 of 12 functions now):
  - `GET ?requestId=` — the request's owner or any admin; returns `{ location: null }` for every
    other case (wrong caller, wrong service_type, wrong status, no row yet) rather than an error,
    so this endpoint can't be used to probe a request's existence or status.
  - `POST ?action=update` — **only** the staff member the request is assigned to
    (`handled_by === caller.id`); rejects (409) if the request isn't `ride` + `en_route` at the
    moment of the call, even if the client's timer is still running from before a status change.
  - `POST ?action=stop` — any admin (a supervisor can force-stop, not just the original assignee).
  - **Automatic stop**: `api/hop/requests.ts`'s `PATCH` deletes the `hop_ride_locations` row
    whenever a status change lands on `arrived`, `completed`, or `cancelled` — this is the
    authoritative stop, independent of whether the staff member's browser tab is even still open.
- **Staff flow** (`RideLocationSharing` in `HopAdminRequestsPage.tsx`): only rendered when
  `service_type='ride' && status='en_route' && handled_by === current admin's id`. "Start location
  sharing" explains what sharing does *before* the browser's native permission prompt fires (two
  layers of consent: the in-app explanation, then the OS/browser dialog). Once granted,
  `navigator.geolocation.getCurrentPosition` fires immediately and then every 20 seconds via
  `setInterval` (not `watchPosition`, to keep the update cadence predictable and bounded) until
  the staff member clicks "Stop sharing" or navigates away (the interval is cleared on unmount,
  but the *authoritative* stop is still the server-side one above).
- **Member flow** (`RideTracker` in `HopRequestsPage.tsx`): only rendered when
  `service_type='ride' && status='en_route'`. Polls `GET` every 15 seconds and shows a plain
  `https://www.google.com/maps?q=lat,lng` link plus a relative "Last updated" time — deliberately
  a link, not an embedded interactive map widget, so **no maps API key is required at all** (see
  "No maps API key needed" below). No location history is ever shown to the member — only the
  current/last-known point while the ride is actively en route.
- **No maps API key needed today**: the member's tracking link is a plain URL, not an embedded map
  SDK, so there is nothing to configure and no key of any kind is exposed to the frontend. If an
  embedded interactive map is wanted later, that requires a real maps provider (Google Maps
  JavaScript API, Mapbox GL JS, etc.) and a provider API key — note that JS-embedded map keys are
  *inherently* client-visible by design (that's how they're loaded into the browser); the standard
  mitigation is restricting the key by HTTP referrer/domain in the provider's console, not hiding
  it. That's a real, separate decision to make later, not something to add silently now.
- **Known limitation, stated plainly**: this is active-browser sharing, not background tracking.
  It only works while the assigned staff member has HOP open in a browser tab (typically on their
  phone) and has granted location permission for that tab/session. If they close the tab, lock
  their phone in a way that suspends the browser, or never grant permission, no location updates
  happen — the member's tracker will just show "hasn't started sharing their location yet" or a
  stale "Last updated" time. This is an honest constraint of browser geolocation APIs, not a bug.

## Auth model

- Email + password. Passwords hashed with `bcryptjs` (`api/_lib/hopAuth.ts`).
- Sessions are DB-backed, not JWT: a random token (`crypto.randomBytes(32)`) is set in an
  httpOnly/Secure/SameSite=Lax cookie; only its SHA-256 hash (peppered with
  `SESSION_HASH_SECRET`) is stored in `hop_sessions`. This makes sessions individually
  revocable (needed for admin "disable user").
- Three roles, `user`, `admin`, and `concierge` (added 2026-07-16), on the same `hop_users`
  table — not separate tables. `admin` and `concierge` are the two ConciergeHub roles: an admin
  manages concierge accounts and can do anything a concierge can; a concierge can only see and
  update requests assigned to them (`handled_by`) and can't reassign. See "ConciergeHub" below.
  There is no self-serve signup for either staff role — admins are created with
  `scripts/create-hop-admin.mjs`; concierges are created in-app by an admin
  (`api/hop/admin/concierges.ts`, ConciergeHub only).
- Basic brute-force protection: after 8 failed logins, an account locks for 15 minutes
  (`hop_users.failed_login_attempts` / `locked_until`). No IP-based rate limiting yet.
- Password reset: `hop_password_resets` (id, user_id, token_hash, expires_at, used_at). Same
  "store the hash, not the raw token" pattern as sessions — `createPasswordResetToken` /
  `consumePasswordResetToken` in `hopAuth.ts`, dispatched via `api/hop/auth.ts`'s
  `?action=forgot-password|reset-password` (no new top-level function). Tokens expire after 30
  minutes and are single-use (`used_at`). `forgot-password` always returns the same generic
  message regardless of whether the email matched an account, to avoid leaking which emails have
  HOP accounts. A successful reset destroys *all* of that user's existing sessions
  (`destroyAllSessions`), forcing re-login everywhere. Requires `RESEND_API_KEY` to actually
  deliver the email — without it, the token is still created but the email send fails silently
  (logged, not thrown) so the generic response is unaffected.

## Theme (dark/light)

- `src/hop/ThemeContext.tsx` (`HopThemeProvider`) + `useHopTheme()` — `localStorage`-backed
  (`hop-theme`), defaults to `dark`. Renders a `<div data-hop-theme="dark|light">` wrapper around
  everything inside the HOP route tree (both the auth pages and the authenticated app/admin
  shells sit inside it).
- Scope is deliberately narrow: **HOP app + admin only**. The public marketing site keeps its
  fixed dark "cinematic canvas" design — it has no theme toggle and isn't wrapped in
  `HopThemeProvider`.
- `src/styles/hopApp.css` defines the base (dark) values for the `--hop-*` custom properties on
  `.hop-shell, .hop-auth-page`, plus a `[data-hop-theme='light'] .hop-shell, [data-hop-theme='light']
  .hop-auth-page` block overriding them for light mode. Every HOP rule should read colors via
  `var(--hop-*)` — never hardcode a hex/rgba color in HOP CSS — so the whole app (core pages +
  the componentized dashboard sections) reskins for free. Watch out for bare `h1`/`h2` elements:
  the marketing site's global `index.css` sets `h1, h2 { color: var(--text-h) }`, and `--text-h`
  follows the *browser's* OS color-scheme preference, not HOP's own toggle — any HOP heading needs
  its own explicit `color: var(--hop-text)` (see `.hop-auth-card__title`, `.hop-page-title`,
  `.hop-card h2`) or it'll silently ignore the HOP theme.
- Toggle buttons live in `HopAppLayout.tsx` and `HopAdminLayout.tsx`, next to "Log out".

## Integrations model

- `hop_integrations` holds one row per (user, provider). `provider` is an open set today:
  `google_calendar`, `fitbit`, `oura`, `apple_health`, `garmin`.
- Only `google_calendar` is real: OAuth handled in `api/hop/integrations/google.ts` (one flat
  file, `?action=start|callback|disconnect|events`) using plain `fetch` against Google's OAuth2 +
  Calendar v3 REST endpoints (no `googleapis` SDK, to keep Vercel function bundles small).
- The other providers exist only so the UI (`HopIntegrationsPage.tsx`) can render a consistent
  "connect this" card per provider; their connect buttons are disabled ("Coming soon") and hit
  no API. `hop_wearable_metrics` exists in the schema but nothing writes to it yet.

## ConciergeHub (2026-07-16)

The staff/admin side of HOP, branded "HOP ConciergeHub," lives on the `staff-portal` branch /
`theconcierge-staff` deployment (see "Deployments" below) — not on `main`. It turns the existing
admin-only dispatch tooling into a two-sided staff product:

- **Admin** creates and manages concierge accounts (`/hop/admin/concierges`,
  `api/hop/admin/concierges.ts`), assigns them to requests (existing `handled_by` /
  `api/hop/requests.ts` PATCH, now `requireStaff`-gated with ownership checks for concierge
  callers), and can view everything a concierge can.
- **Concierge** sees only requests assigned to them (`/hop/concierge/requests`,
  `api/hop/concierge.ts?action=my-requests`), can move status forward and add dispatch notes on
  those requests (not reassign), has an agenda-style calendar of their scheduled requests
  (client-side only, built from the same request list — no separate calendar backend or personal
  Google Calendar sync yet), and can build a showcase profile
  (`hop_concierge_profiles`: headline/bio/specialties/years/photo URL —
  `/hop/concierge/profile`, `api/hop/concierge.ts?action=profile`). Photo is a pasted URL only;
  there's no file upload/blob storage in this repo yet.
- **Request messaging**: `hop_request_messages` is an async, polling-based (15s, same pattern as
  `RideTracker`/`RideLocationSharing`) message thread per request, visible to the requester,
  whoever it's assigned to, and any admin (`api/hop/request-messages.ts`,
  `src/hop/requestMessages/RequestMessageThread.tsx`). Deliberately **separate** from
  `hop_service_request_status_history` — that table stays admin/staff-only and its dispatch notes
  are never shown to members raw (see "Dispatch workflow" above); the message thread is always
  user-visible by design. This is the one ConciergeHub piece that also ships on `main`, since the
  HOP user's side of the conversation lives in the consumer app (`HopRequestsPage.tsx`) — it's
  what pushed `main` to its 12-function cap.
- **Concierge account creation** is admin-driven and in-app (not the CLI script used for admins):
  `POST /api/hop/admin/concierges?action=create` generates a random temp password, creates the
  account as `active` immediately, and tries to email a password-reset link
  (`hopConciergeInviteTemplate`) via the same `hop_password_resets` mechanism as forgot-password.
  If `RESEND_API_KEY` isn't configured (or sending fails), the temp password is returned in the
  API response so the admin can hand it over directly — the ConciergeHub deployment needs
  `RESEND_API_KEY` set for the clean path; see `docs/vercel-setup.md`.
- **Function budget**: `api/hop/admin/concierges.ts` and `api/hop/concierge.ts` exist **only** on
  the ConciergeHub deployment's `api/` tree — `main` is already at 12/12 and can't take them.
  ConciergeHub itself drops three files unrelated to HOP (`chat.ts`, `requests.ts`, `relief.ts` —
  they belong to the separate concierge-request/relief-call product on the same site) to make
  room, landing at 11/12. See "Deployments" for the exact list per project.
- **Divergence beyond `App.tsx`**: `src/hop/HopAdminLayout.tsx`'s `NAV_ITEMS` now also
  legitimately diverges between branches (ConciergeHub's admin nav has a "Concierges" link that
  main's admin portal can't support, since it has no backing endpoint there). When merging future
  `main` changes into `staff-portal`, keep ConciergeHub's extra nav item rather than blindly
  taking `main`'s version of that one constant.

## Deployments

There are **two** Vercel projects sharing this one GitHub repo and this one Neon database. Don't
try to merge them back into one — the whole point is that staff/admin gets its own domain,
decoupled from the consumer-facing product, as the seed of a future standalone ERP.

- **`theconcierge`** (`ay-projects3/theconcierge`, production domain `theconcierge.life`) — tracks
  the `main` branch. Full app: public marketing site + consumer HOP signup/login (`/hop/app/*`) +
  a legacy admin portal (`/hop/admin/*`, frozen — see below). **11 of 12** functions used as of
  the 2026-07-23 Phase 1 pass: `chat.ts`, `requests.ts`, `relief.ts`, and 8 under `api/hop/**`
  (`admin/users.ts`, `auth.ts`, `integrations/google.ts`, `messages.ts`, `request-messages.ts`,
  `requests.ts`, `ride-location.ts`, `wellness.ts`). `admin/integrations.ts` and the top-level
  `integrations.ts` were folded into `admin/users.ts` (`?scope=integrations`) and
  `integrations/google.ts` (`?action=list`) respectively to make room for the new `messages.ts` —
  see "Phase 1 quick wins" above. One slot of headroom.
- **`theconcierge-staff`**, branded **HOP ConciergeHub** (`ay-projects3/theconcierge-staff`,
  `theconcierge-staff.vercel.app` for now — no custom domain attached yet) — tracks the
  `staff-portal` branch. This is where all *new* staff/admin functionality grows going forward;
  `main`'s admin portal stays as a frozen fallback (it can't take new ConciergeHub-only
  endpoints — see "ConciergeHub" above). `src/App.tsx` on this branch is trimmed to
  `/hop/admin/login`, the `RequireAdmin` → `/hop/admin/*` tree (now including `/concierges`), the
  `RequireConcierge` → `/hop/concierge/*` tree, and the shared `/hop/forgot-password` +
  `/hop/reset-password` routes. Every other path redirects to `/hop/admin/login`. **10 of 12**
  functions used as of the 2026-07-23 Phase 1 pass: `admin/concierges.ts`, `admin/users.ts`,
  `auth.ts`, `concierge.ts`, `integrations/google.ts`, `messages.ts`, `request-messages.ts`,
  `requests.ts`, `ride-location.ts`, `wellness.ts` — the same `admin/integrations.ts`/
  `integrations.ts` consolidation as `main` applies here too. Two slots of headroom. Same
  `DATABASE_URL` as `main`, so accounts, sessions, and data are consistent across both domains.
  Env vars (`DATABASE_URL`, `SESSION_HASH_SECRET`) were copied over from the main project;
  **`RESEND_API_KEY` is a hard requirement here now** (not just for password resets — the
  concierge-invite flow's clean path depends on it too; see `docs/vercel-setup.md`).
  `GOOGLE_CLIENT_ID`/`SECRET`/`REDIRECT_URI` are not needed here (no `/hop/app/integrations` page
  is ever served on this deployment). `VITE_HOP_DISPATCH_PHONE` (client-visible, build-time) is
  new here as of Phase 1 — see `.env.example` and `docs/hop/backend-guide.md`.
- **`api/**` is no longer identical between the two deployments** (it was until 2026-07-16).
  `admin/concierges.ts` and `concierge.ts` exist only on `staff-portal`; `chat.ts`, `requests.ts`,
  and `relief.ts` (the unrelated concierge-request/relief-call product) exist only on `main`.
  Everything else stays shared/synced — including `messages.ts` (new in Phase 1), even though
  `main`'s frozen legacy admin has no UI calling its admin-side actions today; only the member-side
  `HopMessagesPage.tsx` (`main`) and admin-side `HopAdminMessagesPage.tsx` (`staff-portal`) exist.
  Keeping `staff-portal` in sync: any future shared-file change on `main` (`api/hop/**` besides
  the ConciergeHub-only files, `hop/AuthContext.tsx`, `hop/RequireAuth.tsx`, theme/CSS) should be
  merged or cherry-picked into `staff-portal` manually — the branches are not auto-synced.
  `src/App.tsx` and `src/hop/HopAdminLayout.tsx`'s `NAV_ITEMS` are *expected* to permanently
  diverge; don't try to reconcile them.
- **No git auto-deploy (deliberate, for now)**: `theconcierge-staff`'s Production Branch setting
  defaulted to `main` (the repo's default branch) when the project was first connected to GitHub,
  and neither the `vercel` CLI nor the public `PATCH /v9/projects/:id` API expose a way to change
  that non-interactively (several field/endpoint shapes were tried, all rejected). Left connected,
  **every push to `main` would silently redeploy `theconcierge-staff` with the full marketing
  site** — this actually happened once during setup. Rather than leave that landmine, the GitHub
  connection was disconnected (`vercel git disconnect`) for this project, so pushing to *either*
  branch no longer auto-deploys `theconcierge-staff`. Deploy it deliberately instead, from a
  worktree linked to the project:
  ```
  git worktree add ../staff-portal-worktree staff-portal
  cd ../staff-portal-worktree && git pull
  npx vercel link --project theconcierge-staff --yes
  npx vercel deploy --prod --yes
  ```
  (`vercel deploy --prod` was observed hanging/getting `BLOCKED` for several minutes when a stale
  build was mid-flight — if that happens, find the `READY` deployment for the right commit via
  `GET /v6/deployments?projectId=<id>&teamId=<id>` and run `npx vercel promote <deployment-id>
  --yes` instead of re-triggering a fresh build.)
  If someone with dashboard access later sets Settings → Git → Production Branch to `staff-portal`
  for the `theconcierge-staff` project, the GitHub connection can be safely re-added
  (`vercel git connect`) and this manual step won't be needed.
