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
- Admins can see all users + all requests, disable/enable users, update request status.
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

## What's stubbed / not built yet

- Fitbit, Oura, Apple Health, Garmin integrations: UI cards exist and are disabled
  ("Coming soon"), no OAuth, no data. `hop_wearable_metrics` table exists but is unpopulated.
- IP-based login rate limiting (only per-account lockout after repeated failures exists).
- Any real fulfillment/dispatch logic behind a service request — requests are just recorded
  and status-tracked, not routed to an actual provider network.
- The "VBC Dashboard" mentioned on the marketing page (hospital-admin-facing analytics).
- "HOP AI" as an actual assistant/service (it's currently just a marketing chip).

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
  (`api/relief.ts`, `relief_call_requests` table, `sendReliefEmail`) has no page linking to it
  anymore — its sidebar was part of the reverted homepage. It still works end-to-end if called
  directly; it just isn't reachable from any UI right now. If asked to add a facility-contact
  flow, check here first before rebuilding it — a natural home would be the Contact page.
- **Reverted**: the `path` (`'individual' | 'facility'`) field that was added to
  `concierge_requests`/`api/requests.ts`/`api/_lib/requestValidation.ts` for the redesign's toggle
  was removed from the app layer. The `path` column itself is still in the DB (harmless, unused,
  additive-only — matches this repo's no-DROP-COLUMN convention), so don't be surprised to see it
  in `db/schema.sql`.

**Do not re-propose putting the burnout-stats/service-cards/story content back on the public
homepage** — that exact change was made and explicitly reversed by leadership.
