# HOP Portal: what's real, what's sample, what's not built

Keep this honest. Update it in the same change that builds, stubs or removes something. "Real"
means it reads or writes the database and works across devices. "Sample" means it's hard-coded
demo data on the client, as in leadership's mockups. "Not built" means there's no code.

_Last updated: 2026-10-14 (Phases 0–5 built; database verification pending)._

## Landing site (`apps/site`): real

| Feature | Status |
|---|---|
| Seven public pages | Real |
| `/portal` "Choose your portal" with four app cards (Staff card also links to `/signup`) | Real. The links come from `VITE_*_URL` env vars, and a card shows "Coming soon" while its URL is unset |
| Contact form → `hop_inquiries` + owner email | Real |

## Portal apps

All four are built. **None has been run against a database yet**: build, type checks and the
signed-out (401) route checks pass, but the end-to-end flow waits on a Neon dev branch. See
`docs/rebuild/README.md`. "Real" below means DB-backed in the code.

### Shared (`packages/shared`)
| Feature | Status |
|---|---|
| Sign in / out, per-app role check, wrong-app message with a link to the right app | Real |
| Lockout after 8 failed attempts, password reset by email, invite links (set-password) | Real (Resend; links are logged to the terminal in dev when `RESEND_API_KEY` is unset) |
| Job updates: conditional on the version read (409 on a concurrent change); log/updates/notes/door log append-merged | Real |

### Concierge Console (`apps/console`)
| Feature | Status |
|---|---|
| Staff request queue (5 s poll) with Open/All, cancel/reopen (`new ⇄ cancelled` only) | Real |
| Request lifecycle Matching → Dispatched → On the way → Verified → Completed | Real, derived from request + job status (`apps/console/lib/lifecycle.ts`); nothing new stored |
| "Know your member" | Real shared prefs; the mockup's tier and mood not built |
| Dispatch to one active rep (composer, prefill from a request, "Fill with sample"); a request can only be dispatched once | Real; push `notify()` is a `TODO(IT)` stub |
| Live dispatch table (4 s), job details (timeline, photos, signature, attention, rep notes), reassign | Real |
| KPIs: new requests, active jobs, needs attention, completed with proof | Real; mockup's "Avg response" and "Service rating" not built |
| Volume by service / Service network | Sample (labelled) / static copy, partners `[CONFIRM]` |
| Team: invite rep/console/facility_admin (emailed set-password link to their app), disable, enable, resend | Real |
| Message staff | Not built |

### Concierge Rep App (`apps/rep`)
| Feature | Status |
|---|---|
| My jobs only (server filters by session; no rep picker), Accept/Pass | Real |
| Status steps, forward only, enforced server side; Complete blocked without required photo/signature | Real |
| Client updates, quick updates, notes, checklist, share toggle, Needs attention / Resolved | Real |
| Photo proof (camera, downscaled ~1600px JPEG) and signature with signer name | Real; inline data URLs unless `BLOB_READ_WRITE_TOKEN` is set (public Blob; private + signed URLs is `TODO(IT)`) |
| Smart door card with a `portal_door_events` row per unlock/lock | Event log real; member approval simulated; Seam stub |
| Call/Text client and vendor | `tel:`/`sms:` links; Twilio masked numbers stubbed |
| Navigate, Inbox, chat, rating, online toggle, shift checklist, Safety help | Sample / UI only |
| Installable web app (manifest, icons) | Real |

### Staff App (`apps/staff`)
| Feature | Status |
|---|---|
| Sign-up (facility and unit checked) with default "HOP knows you" prefs | Real |
| Requests from Ask (with a When window), Clutch (urgent), Overtime Rescue, Voice drop (Web Speech API, scripted fallback), Chat asks, Welcome-card actions, Life Admin "Have HOP handle it", Special moments | Real `portal_requests` |
| My requests with live job status (5 s), rep first name, window, updates, timeline | Real |
| Profile (name, job title, facility, unit, member since); HOP knows you (confirm, forget, teach) | Real |
| Points balance, lifetime tier, once-per-period earn claims (ET days / ISO weeks `[CONFIRM]`) | Real, client-claimed (`TODO(IT)`: server-verify before cash value) |
| Watch / calendar / schedule / learn-from / privacy switches | Consent intent only; no data read |
| Welcome-card observations, shift state and Week pattern (picked from job title), suggestions, Life items, moments, Family Hub, streak, redeem, challenges, leaderboard (except your row), wellbeing charts, Crew, Hop chat replies, Smart home | Sample |

### Facility View (`apps/facility`)
| Feature | Status |
|---|---|
| Sign-in scoped to the admin's facility (from the session; no facility parameter exists) | Real |
| Heat map: Overall strain / Stress / Missed breaks / HOP requests × Today / Last 7 days / Next 72 hours, cell detail | Real queries over seeded sample signals. Strain = 0.45·stress + 0.35·breaks + 0.2·requests; forecast = 7-day mean adjusted by the last 3 days `[CONFIRM]` |
| Privacy floor: < 5 people → `{ suppressed: true }` server side, left out of every average | Real; assert script `apps/facility/scripts/check-suppression.mts` |
| Burnout Radar (score, trend, drivers, filters, action log) | Real over sample signals; score rule `[CONFIRM]` |
| Send support → Console queue (unit + fixed actions, no names), mark resolved | Real |
| Live HOP request counts per unit (7 days) | Real, suppressed under 5 enrolled staff |
| Surge Shield | Partial (14-day daily peak, not a forecast) |
| Other KPIs, data sources, morale/retention chart, pilot measurement | Sample |

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
