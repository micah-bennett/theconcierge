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

## What's stubbed / not built yet

- Fitbit, Oura, Apple Health, Garmin integrations: UI cards exist and are disabled
  ("Coming soon"), no OAuth, no data. `hop_wearable_metrics` table exists but is unpopulated.
- Password reset / forgot-password flow.
- IP-based login rate limiting (only per-account lockout after repeated failures exists).
- Any real fulfillment/dispatch logic behind a service request — requests are just recorded
  and status-tracked, not routed to an actual provider network.
- The "VBC Dashboard" mentioned on the marketing page (hospital-admin-facing analytics).
- "HOP AI" as an actual assistant/service (it's currently just a marketing chip).

Before building any of the above, re-check this file and `architecture.md` — don't assume a
stubbed integration is further along than described here.
