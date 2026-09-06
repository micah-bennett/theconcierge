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
  `main` (`theconcierge`) is at **12 of 12 — fully maxed** as of the 2026-09 Feed pass (see
  "Feed" below) — `chat.ts`, `requests.ts` (now also carrying the former `relief.ts` and
  `ride-location.ts`), and 10 under `api/hop/**`. **Zero headroom remains** — any future `main`
  feature needs a real consolidation pass first (the next available lever is folding
  `request-messages.ts` into `requests.ts` as `?action=messages`, flagged in `docs/hop/roadmap.md`).
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
  link on `HopAdminAccountsPage.tsx` (member rows) deep-links into a thread even before a first message exists.
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
- Four roles, `user`, `admin`, `concierge` (added 2026-07-16), and `facility` (added
  2026-08-27), on the same `hop_users` table — not separate tables. `admin` and `concierge` are
  the two ConciergeHub roles: an admin manages concierge (and facility) accounts and can do
  anything a concierge can; a concierge can only see and update requests assigned to them
  (`handled_by`) and can't reassign. `facility` is a healthcare-facility-admin account,
  staff-portal only — see "Facility portal" and "ConciergeHub" below.
  There is no self-serve signup for staff roles — admins are created with
  `scripts/create-hop-admin.mjs`; concierges **and now also members** are created in-app by an
  admin (`api/hop/admin/concierges.ts?action=create`, ConciergeHub only, takes an optional
  `role: 'user' | 'concierge'`, default `'concierge'`) — see "HOP number" below. Self-serve
  member signup (`/hop/signup`, `main`) still exists side by side; this is an additional path,
  not a replacement.
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

## HOP number (2026-08-09)

A permanent, human-readable account identifier (e.g. `HOP001`), generated for every account —
self-serve signups, CLI-created admins, and admin-invited concierge/member accounts alike — via a
column `DEFAULT` on `hop_users.hop_number`, not per-`INSERT` logic:
```sql
CREATE SEQUENCE IF NOT EXISTS hop_number_seq START 1;
ALTER TABLE hop_users ADD COLUMN IF NOT EXISTS hop_number TEXT
  DEFAULT ('HOP' || LPAD(nextval('hop_number_seq')::text, 3, '0'));
```
A real Postgres `SEQUENCE` guarantees atomic, collision-free numbers under concurrent inserts with
no retry logic needed at any of the three creation call sites — every `INSERT` just needs
`hop_number` added to its `RETURNING` clause to surface the value the database already generated.
Format degrades gracefully past 999 accounts (`HOP1000`, ...) rather than erroring — an accepted,
non-urgent limitation. Existing rows from before this column existed are backfilled once via
`scripts/backfill-hop-numbers.mjs` (`npm run hop:backfill-numbers`), assigning real sequence values
in `created_at` order — a one-time data operation, not part of the idempotent `schema.sql`.

**Login accepts email or HOP number**: `api/hop/auth.ts`'s `handleLogin` takes a generic
`identifier` field (not `email`) and matches `LOWER(email) = ... OR UPPER(hop_number) = ...`
case-insensitively either way. `HopLoginPage.tsx`/`HopAdminLoginPage.tsx` (both branches) show a
plain text input labeled "Email or HOP number" (not `type="email"`, since a HOP number isn't valid
email syntax). `src/hop/api.ts`'s `hopLogin()` takes `{ identifier, password }`.

**Emailed to the account holder**: `main`'s self-serve welcome email
(`hopWelcomeTemplate`/`sendHopWelcomeEmail`) and ConciergeHub's admin-invite email
(`hopAccountInviteTemplate`/`sendHopAccountInviteEmail`, generalized 2026-08-09 from the old
concierge-only `hopConciergeInviteTemplate`/`sendHopConciergeInviteEmail`) both surface the HOP
number in a highlighted callout, framed as "use it instead of your email to sign in."

## Points ledger (2026-08-09)

A reduced-scope build of the roadmap's Phase 3 rewards design (`docs/hop/roadmap.md`) — a member's
Profile tab needed "all the services they've taken" plus a rewards mechanism; this ships the
points-earning half only, deliberately **without** a redemption flow.

- **Schema**: `hop_points_ledger` (`user_id`, `delta`, `source` CHECK IN `admin_award` |
  `concierge_award` | `checkin_streak` | `profile_complete` | `redemption` | `wearable_challenge`,
  `reason`, `awarded_by`, `request_id` nullable, `created_at`) — append-only. Only
  `admin_award`/`concierge_award` are ever written today; the other `source` values are kept in
  the CHECK set as forward-compatible plumbing for the roadmap's still-unbuilt auto-earning rules
  and redemption flow, not implemented behavior.
- **API**: new `api/hop/rewards.ts` (shared, identical file on both branches). `GET`
  (`requireUser`) returns the caller's own ledger + `SUM(delta)` balance. `POST ?action=award`
  (`requireStaff`) takes `{ userId, delta, reason }`; `delta` must be a positive integer (1-1000,
  negative/zero rejected — that's how a future redemption would work, explicitly out of scope
  now); `source` is derived from the caller's own role (`admin_award` if admin, `concierge_award`
  if concierge), never accepted from the client, so the audit trail can be trusted. **No
  `?action=redeem`** — deliberately absent this cycle.
- **Function budget**: this is the one new top-level file this cycle adds, on both branches — see
  "Deployments" below for the resulting counts. `main` was at 11/12 before this; adding
  `rewards.ts` brings it to **exactly 12/12, fully maxed** — the roadmap's original Phase 3 plan
  assumed a prerequisite consolidation (merging `relief.ts` into `requests.ts`) only because it
  needed 3 new files (`profile.ts`/`social.ts`/`rewards.ts`) at once; this cycle adds just the one,
  so it fit without that consolidation. Any future `main` feature needs a consolidation pass first.
- **Frontend**: member-facing UI lives on the merged Profile page (`HopProfilePage.tsx`, re-labeled
  from "Settings"), not a standalone page/nav item — a view-only balance + ledger history is one
  card's worth of content at this scope. New `HopServiceHistoryCard.tsx` (reuses the existing
  `GET /api/hop/requests` call for service history, no new endpoint) and `HopRewardsCard.tsx` (new
  `hopGetRewards()` call) both mount on `HopProfilePage.tsx`. Staff-side: `HopAdminAccountsPage.tsx`
  (ConciergeHub, member rows — was `HopAdminUsersPage.tsx` before the 2026-09 accounts merge)
  gained an inline "Award points" form per row (`hopAdminAwardPoints()`), not a new nav tab — award-giving is a small action, not a destination. No concierge-facing award UI is
  built this cycle (concierge-sourced awards are only plumbed server-side, not reachable from any
  concierge screen yet).

## HOP Phase 2 (2026-08-27)

A large cycle from a detailed feature request covering all four HOP access levels, matching this
plan's original workstream numbering (1-10; 10 was the `main` function-budget consolidation, see
"Stack" above). Function budget after this pass: `main` **12/12**, `staff-portal` **12/12** —
both fully maxed; see "Deployments" for exactly what filled each slot.

**Member special dates + family profile** — new `api/hop/profile.ts` (`main` only, `?action=self`
GET/PATCH `hop_users.birthday`/`anniversary`; `?action=family` GET/POST/DELETE against
`hop_family_members`). A new "🎂 Special dates & family" card on `HopProfilePage.tsx`, not a new
page/nav item. The first time both dates are set, one `hop_points_ledger` row fires
(`source='profile_complete'`) — the concrete wiring for a `source` value that existed in the
ledger's CHECK constraint since it shipped but had no writer until now. **Deliberately not synced
to `staff-portal`** — syncing it would exceed that deployment's function cap once `facility.ts`
landed in the same cycle; if member special-dates data is ever needed on ConciergeHub, that needs
a prior consolidation there (merging `request-messages.ts` into `requests.ts`).

**Certifications + renewal reminders** — same `profile.ts` file, `?action=certifications`
(`hop_certifications`: name, issuing body, issued/expires dates). A "📜 Certifications" card on
`HopProfilePage.tsx`; `HopDashboardPage.tsx` checks client-side for anything expiring within 30
days and shows a `DailyNagBanner` if so.

**Daily health-task rewards** — `api/hop/rewards.ts` gained `GET ?action=tasks` and
`POST ?action=complete-task` against a new `hop_daily_tasks_log` table (one row per
user/task/day, `UNIQUE` index enforces same-day idempotency, 409 on a repeat). Four fixed,
hardcoded tasks (walk 10min, stand 10min, read an article, a rotating daily question keyed off
day-of-week) — no admin-editable task/question bank this cycle. 5 points each, a new
`'task_complete'` ledger `source`. New `HopDailyTasksCard.tsx` on `HopDashboardPage.tsx` (the
daily landing page, not Profile — `HopRewardsCard` on Profile stays the ledger/balance view).

**Wellness self-tracking + daily check-in nag** — self-reported only, not real wearable data (a
locked-in scope decision). New `hop_daily_metrics` table (steps/sleep hours/mood 1-5, one row per
user/day, upserted) — deliberately separate from `hop_wellness_checkins`, which serves a
different purpose (a support-request signal, not a self-quantification log) and whose own schema
comment warns against this kind of scope creep. `api/hop/wellness.ts` gained `?type=metrics`
(GET/POST). `HopWellnessPage.tsx` gained a "📈 Your trends" section — hand-rolled CSS bar charts,
no new charting library. New shared `src/hop/DailyNagBanner.tsx` (dismiss via component
`useState` only, not `localStorage`, so it genuinely reappears next visit if still true — distinct
from the onboarding tour's permanent per-role dismiss) — reused by the cert-expiry nag above and
the mood check-in below. `HopDashboardPage.tsx` shows it when today's wellness check-in is
missing.

**One-tap mood check-in** — the actual member-facing trigger for the Facility portal's aggregate
morale/heatmap data (see below); easy to miss since its backend (`?type=mood` on `wellness.ts`)
and its consumer (`facility.ts`) were built in different parts of this cycle. New
`src/hop/HopMoodCheckinPrompt.tsx` on `HopDashboardPage.tsx` — four color-coded one-tap buttons,
posts to `hop_mood_checkins` (write-only from `wellness.ts`; no per-user read endpoint exists,
aggregate reads live exclusively in `facility.ts`). "Already answered today" tracked via a
date-scoped `localStorage` key (naturally resets each day) rather than `DailyNagBanner`'s
session-only dismiss, since this one-tap action is genuinely done for the day once tapped, not
just deferred.

**HOP AI assistant widget** — new `src/hop/HopAiAssistant.tsx`, a floating bottom-right widget
mounted in `HopAppLayout.tsx` only (member app; never on the ConciergeHub admin/concierge
layouts). `profile.ts` gained `?action=feed` — a DB-only rule table (upcoming family/self dates
within 14 days + soon-expiring certifications), explicitly not a real LLM call; calendar-event
proximity is merged client-side from the existing `hopGoogleCalendarEvents()` call rather than
fetched server-side, keeping the endpoint a pure DB read with an obvious future seam (same input
shape could later feed `api/chat.ts`'s existing Anthropic client instead of the static rule
table — not built now). Suggestions are answered entirely via tap, never free text — the
birthday-cake example is a short multiple-choice sequence (confirm name spelling, age, icing
color, tier count) culminating in the **existing** `hopCreateRequest()` call
(`service_type='family_home'`), reusing the same category-prefix-in-`details` convention
`HopFamilyCarePage.tsx` already uses — no new request field or schema change. Widget copy states
plainly that suggestions only appear while the app is open, not as real push notifications.

**Admin on-duty auto-match suggestion** — pure client-side convenience on
`HopAdminRequestsPage.tsx` (staff-portal): pre-computes the least-loaded on-duty concierge from
already-fetched data (`hopAdminListOnDuty()` + current per-concierge open-assignment counts) and
shows a "🎯 Suggested: {name}" one-click-accept button next to the existing manual assignment
dropdown. No new backend endpoint; the dropdown/`handleAssign` themselves are untouched — the
admin still explicitly confirms every assignment, satisfying "auto-match, but let admin manually
switch" without ever taking the click away from them.
(Separately: admin-created member accounts from ConciergeHub — `api/hop/admin/concierges.ts`'s
`role` param — were already fully shipped before this cycle; no work was needed for that ask.)

**Staff messaging (admin↔specific-concierge, concierge↔concierge)** — new `hop_staff_messages`
table (`sender_id`, `recipient_id`, peer-to-peer, `LEAST/GREATEST` composite index for two-party
thread lookups) — deliberately a new table, not a further overload of `hop_direct_messages`,
whose own comment is explicit that "admin" there is a *role*, not a counterparty, and doesn't
generalize to arbitrary peers. `api/hop/messages.ts` gained a `?scope=staff` mode (GET with
optional `peerId` for a thread or an inbox summary without it; POST) alongside the existing
`?scope=admin`/member behavior, untouched. `api/hop/admin/users.ts`'s `?scope=staff` roster guard
widened from `requireAdmin` to `requireStaff` so concierges can browse who to message. Frontend:
a "Staff" tab on `HopAdminMessagesPage.tsx` (kept as a separate panel/state from the member-thread
UI, not a generic refactor, to avoid risking the working member flow); new
`HopConciergeMessagesPage.tsx` (`/hop/concierge/messages`) — the first concierge messaging
surface, with an unread-count badge on its nav item.

**Staff-only member notes** — new `hop_member_notes` table (append-only, matching
`hop_service_request_status_history`'s existing convention — no edit/delete), persistent and
cross-request, unlike per-request dispatch notes. `api/hop/requests.ts` gained `?action=notes`
(GET/POST, `requireStaff`, scoped by `memberId`) and `?action=notes-count` (admin-only, "N notes
added today by concierges" — the "alerts admin" signal, deliberately a live count rather than a
new per-viewer read-receipt table). Lives on `requests.ts`, not `admin/users.ts`, specifically
because concierges need access too and `admin/users.ts` is `requireAdmin`-only end to end.
Frontend: an expandable notes panel on `HopAdminAccountsPage.tsx` per member row (was
`HopAdminUsersPage.tsx` before the 2026-09 accounts merge), and the same panel
on `HopConciergeRequestsPage.tsx` per assigned request (concierges have no Users list, so this is
their only entry point) — staff-only, never shown to the member.

**Facility portal** (net-new, staff-portal only) — builds the design already sketched in
`docs/hop/roadmap.md`'s Phase 2, plus the cost-savings ask. A fourth role, `'facility'`, added to
`hop_users_role_check`. New `requireFacility`/`requireFacilityOrStaff` in `api/_lib/hopAuth.ts`.
New `hop_mood_checkins` (aggregate-only mood data, see above), `hop_users.department` (nullable
free text, no taxonomy — the heatmap degrades to "Unspecified" if unused), and
`hop_retention_events` (`role_title`, `estimated_cost`, `note`, `recorded_by` — deliberately no
`member_id`, keeping it aggregate/non-identifying per the same hard rule as mood check-ins: this
is a manually-logged bookkeeping entry recording a staff judgment call, **not** a
computed/derived metric — there is no way to automatically attribute a retention to concierge
services). New `api/hop/facility.ts` (staff-portal's one new file this cycle) — `?action=overview`
(on-duty count/names, "worked past shift end" using the previously-unused
`default_shift_end_time` column, today's mood check-ins as percentages, **no `user_id` in the
response**), `?action=heatmap` (mood check-ins by hour × department, aggregate only),
`?action=request-stats` (request counts by day/week/month/year, site-wide), `?action=retention`
(GET total + list, POST to log a new entry). `api/hop/admin/concierges.ts` widened to create/
list/manage `'facility'` accounts alongside `'concierge'` (same Team page), plus an optional
`defaultShiftEndTime` field on create/update. New `src/pages/hop/facility/` tree
(`HopFacilityLayout.tsx` + 5 pages: Overview, Heat map, Request stats, Retention, My Requests),
routed behind `RequireFacility`. The "My Requests" tab (a Facility Admin also has a regular
member identity under the same account, without a second login) needed **zero backend change** —
`requireUser` has no role check, and `api/hop/requests.ts`'s GET/POST only special-case
`role === 'admin'`; every other role, including `'facility'`, already gets "my own requests only"
scoping automatically.

**Known limitations, stated plainly, not silently designed around**: there is no
facilities/tenancy table — every `facility.ts` aggregate is site-wide, not scoped to one
hospital client; if a second facility client is ever signed, this needs a real tenancy design
first. The "on-duty" signal in the overview is HOP's own concierge duty log, not the hospital's
own staff shift data (which doesn't exist in this schema). The retention/satisfaction proxy
reuses `hop_wellness_checkins`/`hop_mood_checkins` distributions, both self-reported for a
different original purpose — not a real "would you stay" survey, since none exists anywhere in
this codebase.

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

- **Admin** creates and manages concierge, member, and (2026-08-27) Facility Admin accounts from
  one page (`/hop/admin/accounts`, nav-labeled "Accounts" — see "Unified accounts page" below),
  assigns them to requests (existing
  `handled_by` / `api/hop/requests.ts` PATCH, now `requireStaff`-gated with ownership checks for
  concierge callers), and can view everything a concierge can.
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
- **Concierge and member account creation** is admin-driven and in-app (not the CLI script used
  for admins): `POST /api/hop/admin/concierges?action=create` takes an optional
  `role: 'user' | 'concierge'` (default `'concierge'`, 2026-08-09), generates a random temp
  password, creates the account as `active` immediately, and tries to email an invite
  (`hopAccountInviteTemplate`, surfacing the account's HOP number — see "HOP number" above) via
  the same `hop_password_resets` mechanism as forgot-password. If `RESEND_API_KEY` isn't
  configured (or sending fails), the temp password is returned in the API response so the admin
  can hand it over directly — the ConciergeHub deployment needs `RESEND_API_KEY` set for the clean
  path; see `docs/vercel-setup.md`. `handleList`/`handleUpdateStatus` on this file stay scoped to
  `role IN ('concierge', 'facility')` deliberately — a member account created here is fetched from
  the existing `api/hop/admin/users.ts` (`role = 'user'`) instead, since it's the same `hop_users`
  table and that endpoint already lists/toggles every `role = 'user'` row; duplicating that logic
  here would create two places managing the same accounts. **`HopAdminAccountsPage.tsx`
  (2026-09) merges the display of both endpoints client-side** — see "Unified accounts page"
  below — so this backend split is invisible to the admin using it.
- **Function budget**: `api/hop/admin/concierges.ts` and `api/hop/concierge.ts` exist **only** on
  the ConciergeHub deployment's `api/` tree. ConciergeHub drops three files unrelated to HOP
  (`chat.ts`, `requests.ts`, `relief.ts` — they belong to the separate concierge-request/
  relief-call product on the same site) to make room. See "Deployments" for the current exact
  count per project.
- **Divergence beyond `App.tsx`**: `src/hop/HopAdminLayout.tsx`'s `NAV_ITEMS` now also
  legitimately diverges between branches (ConciergeHub's admin nav has an "Accounts" link — see
  "Unified accounts page" below — that main's frozen admin portal can't support, since it has no
  backing endpoint there beyond the old member-only Users list). When merging future `main`
  changes into `staff-portal`, keep ConciergeHub's extra nav item rather than blindly taking
  `main`'s version of that one constant.

## Unified accounts page (2026-09, ConciergeHub only)

`HopAdminAccountsPage.tsx` replaced the former `HopAdminConciergesPage.tsx` ("Team") and
`HopAdminUsersPage.tsx` ("Users") — the old split meant creating a Member account buried the new
row on a separate tab from where it was created, with only a one-line link back to it. The new
page fetches both existing endpoints (`hopAdminListConcierges()`, `hopAdminListUsers()`) in
parallel via `Promise.allSettled` (a failure in one doesn't blank the whole page), tags each row
with its already-present `role`, and merges them into one list filterable by role tabs
(All/Concierges/Members/Facility Admins) — the same "one fetch, multiple client-side tabs"
pattern `HopAdminRequestsPage.tsx` already used for its status buckets. **No new backend
endpoint** — this was a deliberate choice to keep the function budget's freed slot (see
"Deployments") available for `api/hop/social.ts` instead. The create form also now surfaces
`defaultShiftEndTime` (concierge/facility only) — a field the backend already accepted but no
form ever sent. Routes/nav: `/hop/admin/concierges` + `/hop/admin/users` → one
`/hop/admin/accounts`, clean cutover (no redirects — internal tool bookmarks, not public URLs).

## Feed (2026-09)

A lightweight, LinkedIn/Facebook-style internal feed — the first surface built specifically to be
identical and visible across **all four roles** (member, admin, concierge, facility), on **both**
deployments. Schema: `hop_social_posts` (author, body, timestamp), `hop_social_reactions` (one row
per post/user, `reaction` free-text so new reaction types never need a migration — the app-level
allowlist `like`/`celebrate`/`support` lives in `api/hop/social.ts`), and `hop_user_status` (one
row per user, upserted, powering the Feed's "who's around" rail).

`api/hop/social.ts` — genuinely identical file on both branches (no role-gating differences,
unlike every other ConciergeHub-adjacent feature) — gates everything with `requireUser`, which
already authenticates any logged-in HOP account regardless of role, so no new auth code was
needed. `?action=posts` (GET, cursor-paginated on `created_at` rather than `OFFSET` so posts
don't shift under an actively-polling feed; POST to create), `?action=react` (POST to
upsert/change your reaction via `ON CONFLICT (post_id, user_id) DO UPDATE`, DELETE to remove it),
`?action=status` (GET everyone's status, PATCH your own only — a user can never set anyone else's
status; mirrors `rewards.ts`'s "actor is always derived server-side" pattern).

"Live" = 15s polling (`src/hop/feed/HopFeedPage.tsx`), copying the exact pattern already
established by `RequestMessageThread.tsx` and ride location — no websocket infrastructure exists
anywhere in this codebase, and none was introduced here. A post/reaction/status change also
triggers an immediate re-fetch for instant own-action feedback rather than waiting for the next
tick.

Frontend: `HopAvatar.tsx` (new — no avatar pattern existed anywhere before this; a colored circle
with initials, color deterministically hashed from the user's id via `hsl()`, never `color-mix()`
— banned in this codebase, breaks the Capacitor iOS WKWebView target) and
`src/hop/feed/HopFeedPage.tsx` + subcomponents (composer, post card with the 3-reaction bar,
status rail) — one shared component tree, reused as-is across every route it's mounted on.
Routing is per-branch since that's where the roles' surfaces actually diverge: `main` gets one
route (`/hop/app/feed`) on the member nav; `staff-portal` gets three (`/hop/admin/feed`,
`/hop/concierge/feed`, `/hop/facility/feed`), one per layout's `NAV_ITEMS`. **Deliberately
excluded**: `main`'s frozen `/hop/admin/*` portal — matching the precedent of every other
ConciergeHub-only feature (Team/Accounts, staff messaging, rewards-award UI) never being
retrofitted there either.

Pre-filled sample data: `scripts/seed-hop-concierge-hub.mjs`'s `seedFeed()` step inserts ~9 posts
staggered across the last several days (using the 4 seeded test accounts as authors), a handful
of cross-reactions, and one status per account, gated behind a marker-prefix check so re-running
the script doesn't duplicate them.

Enabling this required freeing one function slot on **each** deployment first — see
`api/hop/ride-location.ts`'s merge into `api/hop/requests.ts` under "Deployments" above. This
also **widens the scope** `docs/hop/roadmap.md` originally sketched for this feature (which
scoped it `main`-only, on the reasoning that "no family/social surface is planned for
ConciergeHub") — the actual requirement turned out to be a feed shared by every role, so
`social.ts` ships on both branches instead.

### Visual polish (2026-09)

Alongside the Feed: bigger/more touch-confident `.hop-btn-primary`/`-secondary`/`-ghost` padding
app-wide; `--hop-gold` leaned on more deliberately for warmth (the Feed's Celebrate reaction, a
circular backdrop behind `EmptyState`'s icon, previously bare emoji text); `HopAvatar.tsx` and
`.hop-role-badge--*` as new reusable primitives. Skeleton-loader/`EmptyState`/toast consistency
was extended to `HopDashboardPage.tsx`/`HopMessagesPage.tsx` (`main`) and
`HopAdminDashboardPage.tsx`/`HopAdminRequestsPage.tsx` (ConciergeHub) — chosen by traffic, not
exhaustively. Still plain (left for a follow-up pass, not silently dropped):
`HopAdminWellnessPage.tsx`, `HopAdminIntegrationsPage.tsx`, `HopFamilyCarePage.tsx`,
`HopIntegrationsPage.tsx`, `HopWellnessPage.tsx`.

## Deployments

There are **two** Vercel projects sharing this one GitHub repo and this one Neon database. Don't
try to merge them back into one — the whole point is that staff/admin gets its own domain,
decoupled from the consumer-facing product, as the seed of a future standalone ERP.

- **`theconcierge`** (`ay-projects3/theconcierge`, production domain `theconcierge.life`) — tracks
  the `main` branch. Full app: public marketing site + consumer HOP signup/login (`/hop/app/*`) +
  a legacy admin portal (`/hop/admin/*`, frozen — see below). **12 of 12 — fully maxed** as of the
  2026-09 Feed pass: `chat.ts`, `requests.ts` (now also carrying the former `relief.ts` *and* the
  former `ride-location.ts`, see below), and 10 under `api/hop/**` (`admin/users.ts`, `auth.ts`,
  `integrations/google.ts`, `messages.ts`, `profile.ts`, `request-messages.ts`, `requests.ts`,
  `rewards.ts`, `social.ts` (new), `wellness.ts`). `admin/integrations.ts` and the top-level
  `integrations.ts` were folded into `admin/users.ts` (`?scope=integrations`) and
  `integrations/google.ts` (`?action=list`) respectively to make room for `messages.ts` (Phase 1);
  `rewards.ts` took the next slot (points ledger pass); `api/relief.ts` was folded into
  `api/requests.ts` as `?type=relief` in the Phase 2 pass to free the slot `api/hop/profile.ts`
  needed; `api/hop/ride-location.ts` was folded into `api/hop/requests.ts` as
  `?action=location-*` in the 2026-09 pass specifically to free the slot `api/hop/social.ts`
  needed (see "Feed" below). **Zero headroom remains** — any future `main` feature needs a real
  consolidation pass first (the next available lever is folding `request-messages.ts` into
  `requests.ts` as `?action=messages`, same as `staff-portal` below).
- **`theconcierge-staff`**, branded **HOP ConciergeHub** (`ay-projects3/theconcierge-staff`,
  `theconcierge-staff.vercel.app` for now — no custom domain attached yet) — tracks the
  `staff-portal` branch. This is where all *new* staff/admin functionality grows going forward;
  `main`'s admin portal stays as a frozen fallback (it can't take new ConciergeHub-only
  endpoints — see "ConciergeHub" above). `src/App.tsx` on this branch is trimmed to
  `/hop/admin/login`, the `RequireAdmin` → `/hop/admin/*` tree (now including `/accounts`, see
  "Feed" below for why `/concierges` and `/users` were merged into one route), the
  `RequireConcierge` → `/hop/concierge/*` tree, the `RequireFacility` → `/hop/facility/*` tree
  (new in Phase 2, see "Facility portal" below), and the shared `/hop/forgot-password` +
  `/hop/reset-password` routes. Every other path redirects to `/hop/admin/login`. **12 of 12 —
  fully maxed** as of the 2026-09 Feed pass: `admin/concierges.ts`, `admin/users.ts`, `auth.ts`,
  `concierge.ts`, `facility.ts`, `integrations/google.ts`, `messages.ts`, `request-messages.ts`,
  `requests.ts`, `rewards.ts`, `social.ts` (new), `wellness.ts` — the same
  `admin/integrations.ts`/`integrations.ts` consolidation, `rewards.ts` addition, and
  `ride-location.ts` → `requests.ts` merge as `main` (shared files, identical content), plus the
  new `social.ts` took the slot freed by that merge. **Zero headroom remains here either** — the
  standing lever for a future slot is merging `request-messages.ts` into `requests.ts` as
  `?action=messages`, already flagged in `docs/hop/roadmap.md`. Same `DATABASE_URL` as `main`, so
  accounts, sessions, and data are consistent across both domains. Env vars (`DATABASE_URL`,
  `SESSION_HASH_SECRET`) were copied over from the main project; **`RESEND_API_KEY` is a hard
  requirement here now** (not just for password resets — the account-invite flow's clean path
  depends on it too; see `docs/vercel-setup.md`). `GOOGLE_CLIENT_ID`/`SECRET`/`REDIRECT_URI` are
  not needed here (no `/hop/app/integrations` page is ever served on this deployment).
  `VITE_HOP_DISPATCH_PHONE` (client-visible, build-time) is new here as of Phase 1 — see
  `.env.example` and `docs/hop/backend-guide.md`.
- **`api/**` is no longer identical between the two deployments** (it was until 2026-07-16).
  `admin/concierges.ts`, `concierge.ts`, and `facility.ts` exist only on `staff-portal`; `chat.ts`
  and `requests.ts` (top-level, now also carrying the former `relief.ts` — the unrelated
  concierge-request/relief-call product) exist only on `main`; `profile.ts` exists only on `main`
  (member-only surface, deliberately not synced to `staff-portal` — see "HOP Phase 2" below for
  why). Everything else stays shared/synced — including `messages.ts` (new in Phase 1) and
  `social.ts` (new in the 2026-09 Feed pass, the first genuinely *symmetric* new feature across
  both deployments — see "Feed" below), even though `main`'s frozen legacy admin has no UI calling
  either file's admin-side actions today; only the member-side `HopMessagesPage.tsx`/`HopFeedPage`
  (`main`) and admin/concierge/facility-side equivalents (`staff-portal`) exist.
  Keeping `staff-portal` in sync: any future shared-file change on `main` (`api/hop/**` besides
  the ConciergeHub-only files, `hop/AuthContext.tsx`, `hop/RequireAuth.tsx`, theme/CSS) should be
  merged or cherry-picked into `staff-portal` manually — the branches are not auto-synced.
  `src/App.tsx` and each layout's `NAV_ITEMS` are *expected* to permanently diverge; don't try to
  reconcile them.
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
