# HOP Portal: what's real, what's sample, what's not built

Keep this honest. Update it in the same change that builds, stubs or removes something. "Real"
means it reads or writes the database and works across devices. "Sample" means it's hard-coded
demo data on the client, as in leadership's mockups. "Not built" means there's no code.

_Last updated: 2026-10-14 (Phase 0 complete)._

## Landing site (`apps/site`): real

| Feature | Status |
|---|---|
| Seven public pages | Real |
| `/portal` "Choose your portal" with four app cards | Real. The links come from `VITE_*_URL` env vars, and a card shows "Coming soon" while its URL is unset |
| Contact form → `hop_inquiries` + owner email | Real |

## Portal apps

Nothing is built yet. Phases 1–6 in `docs/rebuild/` build them. When a phase lands, move its
rows here with an honest status. The target per app:

| App | Real (DB-backed) once built | Sample data (by design, until IT handoff items land) |
|---|---|---|
| Shared | Sign in/out, sessions, roles, invites, set/reset password | n/a |
| Console | Request queue, dispatch to a specific rep, live job tracking, reassign, proof review, timeline, Team (create/disable rep, console and facility accounts) | Volume charts, request-lifecycle demo states without a backing job |
| Rep | My jobs only, accept/pass, status steps, updates, notes, photo + signature proof, needs-attention, door event log | Masked calls (uses `tel:`), smart lock (stub), navigation links |
| Staff | Sign-up, Ask HOP / Clutch / Overtime Rescue / Voice drop → real requests, my request status, "HOP knows you" prefs, points balance | Welcome-back cards from calendar/watch/schedule, Week planner, Life Admin, Crew (groups/feed/news/pulse/refer), leaderboard, smart home, wearables/calendar connect (consent intent only) |
| Facility | Sign-in scoped to one facility, heat map + Burnout Radar from `portal_unit_signals` with min-group suppression, Send support → recorded + lands in the Console queue | The signal values themselves (seeded sample rows until real sources exist) |

## Explicitly deferred (IT handoff; stubs + `TODO(IT)` only)

Twilio masked calls and texts. Seam smart locks. Push alerts. Realtime (polling for now). Private
Blob with signed URLs. Maps and live location. Apple Health, Health Connect, Fitbit, Garmin,
Oura, WHOOP. Google/Outlook/Apple calendars. Unit scheduling systems. Alexa, Siri and Google
Actions. Apple Watch, Live Activities. The "Saved with HOP" share target. Server-verified reward
earn events. Native mobile apps.

## Removed in the 2026-10 rebuild (don't re-propose without being asked)

The old `/hop/app` member app and `/hop/admin`, the `staff-portal` ConciergeHub, the social feed,
wellness check-ins, family care, Google Calendar OAuth, the marketing chatbot, the
concierge/relief request forms, the Capacitor iOS wrapper. Their tables remain in Neon, unused.
