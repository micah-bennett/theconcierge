# HOP Portal: what's real, what's sample, what's not built

Keep this honest. Update it in the same change that builds, stubs or removes something. "Real"
means it reads or writes the database and works across devices. "Sample" means it's hard-coded
demo data on the client, as in leadership's mockups. "Not built" means there's no code.

_Last updated: 2026-11-01 (v2.1: Healthcare / Organizations / Concierge, Concierge Portal, instant requests, data separation)._

## Landing site (`apps/site`): real

| Feature | Status |
|---|---|
| Public pages: Home, How HOP Works, Healthcare, Organizations, Concierge, HOP Portal, Request, Contact (`/professionals` → `/healthcare`) | Real. New Healthcare, Concierge-paths and Request copy is marked `[CONFIRM]` for leadership review |
| `/portal` "Choose your portal" with five app cards (HOP Client and Concierge Portal also link to `/signup`) | Real. The links come from `VITE_*_URL` env vars, and a card shows "Coming soon" while its URL is unset |
| `/request` instant request (no account): request type, date/time, address, flight (travel types), payment preference, how heard | Real: `POST /api/request` → `portal_requests` (channel `instant`) → Console queue, plus owner email |
| Payment on request forms | Preference only: method, cardholder name, last 4 digits. **No full card number is collected anywhere**; the team takes payment by phone. Hosted checkout `TODO(IT)` |
| Contact form → `hop_inquiries` + owner email | Real |

## Portal apps

All four are live (see `backend-guide.md`) and v2 (2026-10-19) removed every invented number:
each screen reads the database, or says "Coming soon" with a "Tell me when" button
(`portal_interest`). The only sample content is the labelled demo hospital from
`scripts/seed-demo.mjs` (remove with `npm run hop:remove-demo` before launch).

### Shared (`packages/shared`)
| Feature | Status |
|---|---|
| Sign in / out, per-app role check, wrong-app message with a link to the right app | Real |
| Lockout after 8 failed attempts, password reset by email, invite links (set-password) | Real (needs `RESEND_API_KEY` on each app) |
| Job updates: conditional on the version read (409 on a concurrent change); append-merged lists | Real |
| Messages (`portal_messages`): staff ↔ Console, rep ↔ HQ, job chat rep ↔ member; who may read is enforced in SQL | Real, 4 s polling |
| Door access: rep asks, the member approves in HOP Client, then the rep unlocks (`setDoorState`); a rep can't approve themselves | Real flow; the lock itself (Seam) is a `TODO(IT)` stub |
| A job a rep passes on sends its request back to the Console queue | Real |

### HOP Client (`apps/staff`, formerly the Staff App)

For staff of any contracted organization (healthcare and other industries). Privacy copy says "your
organization"; the final label/tagline is `[CONFIRM]` with leadership.

| Feature | Status |
|---|---|
| Sign-up (facility, unit, optional referral code) | Real |
| Requests: Ask, Clutch, Overtime Rescue, Voice drop (speech or typed), Life Admin, Moments | Real `portal_requests` |
| My requests: live status, rep updates, photo proof, rate 1–5 (`portal_ratings`), message the rep | Real |
| Daily check-in (mood, stress, break, one word) and weekly pulse (`portal_checkins`) | Real; feeds the Facility View in aggregate |
| "Share anonymized totals with my hospital" (default on) | Real; off = excluded from every hospital number |
| Shift pattern (You → shifts), Today's shift bar and Week | Real (user-entered) |
| Life reminders | Real (`portal_life_items`) |
| Points: earn claims, streak from check-ins, 14-day wellbeing charts, Five Minute Reset, redeem (`portal_redemptions` → Console request), challenges, facility leaderboard (opt-out) | Real. Some earns (lunch, water, steps, sleep...) stay honour system, `TODO(IT)` |
| Learn & Play: daily quiz, word scramble, match game, Did you know? (content in `lib/learn.ts`) | Real, answers checked on the server, points once per day |
| Social rewards: follow (per network in `SOCIAL_LINKS`), read the blog, share HOP | Real claims, honour system; a network shows only when its link is set |
| Chat with HOP Concierge (real people) and job chat with the rep | Real |
| Referral link and count of people who joined | Real |
| Watch readiness, calendar/schedule sync, smart home, Family Hub, Crew community, Saved with HOP | Coming soon (Tell me when) |
| AI assistant | Not built (leadership chose people, not AI, for now) |

### Concierge Portal (`apps/concierge`, new in v2.1)
| Feature | Status |
|---|---|
| Self sign-up (name, email, phone, password, optional address and how heard), sign in, reset password | Real (`customer` role, no facility) |
| New request: the expanded concierge form (same fields as `/request`), saved address prefill | Real `portal_requests` (source/channel `concierge`) |
| My requests: live status (10 s polling), details, cancel while still New, request again | Real |
| Messages: own thread with HOP Concierge, chat with the rep on an active request | Real |
| Profile: name, phone, address, how heard | Real (`portal_customer_profiles`) |
| "Needs attention" flag and unread badge | Not built |
| Realtime instead of polling | `TODO(IT)` |

### Data separation (v2.1)
| Feature | Status |
|---|---|
| Customers and instant requests excluded from Facility View (role `staff` + channel `organization` on every query) | Real; tested against a scratch Postgres with a deliberately planted leak |
| `npm run hop:check-separation` read-only leak test for the live database | Real |

### Concierge Console (`apps/console`)
| Feature | Status |
|---|---|
| Request queue with source labels (incl. Reward redemption, Unit support, Safety alert pinned, Concierge Portal, Instant request), cancel/reopen, "Rep passed — dispatch again" | Real |
| Concierge/instant request details panel (address, flight, contact, payment preference); rep job notes get the details without payment | Real |
| Dispatch to one rep (online reps first), live dispatch table, details, reassign | Real; push `notify()` is a `TODO(IT)` stub |
| KPIs: new requests, active jobs, needs attention, completed with proof, avg response (request → accepted), service rating, today's volume by service | Real |
| Messages tab: every staff, rep and job thread, unread counts, urgent pinned | Real |
| Team: invite rep/console/facility_admin, disable, enable, resend; rep availability and rating | Real |

### Concierge Rep App (`apps/rep`)
| Feature | Status |
|---|---|
| My jobs only, Accept/Pass, forward-only status steps, proof photo and signature | Real |
| Online/offline (Console sees it), real rating, done today | Real |
| Inbox: HOP HQ thread and job chats | Real |
| Door: ask the member, wait for approval, unlock/lock logged | Real flow; Seam lock stub |
| Safety help → urgent HQ message + Console safety alert | Real; HOP line button needs `HOP_SUPPORT_PHONE` |
| Call/Text | `tel:`/`sms:` with the member's number; masked numbers (Twilio) `TODO(IT)` |
| Navigate | Google Maps link |
| Start-of-shift checklist | Saved on the device only |

### Facility View (`apps/facility`)

For hospitals and partner organizations. Counts HOP Client staff of that organization only.

| Feature | Status |
|---|---|
| Heat map (Strain, Stress, Missed breaks, HOP requests, Mood) × Today / Last 7 days / Next 72 hours | Real, from `portal_checkins` + `portal_requests` (formulas `[CONFIRM]`, see `apps/facility/lib/server/aggregate.ts`) |
| Privacy floor: < 5 distinct people → `{suppressed: true}`; a unit with nobody is "No check-ins yet"; opted-out staff excluded | Real; asserts in `apps/facility/scripts/check-suppression.mts` |
| KPIs: participation, average mood vs last week, units on high alert, requests handled, support sent | Real |
| Department table, 8-week mood/stress trend, Burnout Radar, Surge Shield (14-day history) | Real |
| Send support → Console queue, mark resolved | Real |
| `portal_unit_signals` | No longer read (kept in the schema) |

## Explicitly deferred (IT handoff; stubs + `TODO(IT)` only)

Twilio masked calls and texts. Seam smart locks. Push alerts. An AI assistant. Realtime (polling for now). Private
Blob with signed URLs. Maps and live location. Apple Health, Health Connect, Fitbit, Garmin,
Oura, WHOOP. Google/Outlook/Apple calendars. Unit scheduling systems. Alexa, Siri and Google
Actions. Apple Watch, Live Activities. The "Saved with HOP" share target. Server-verified reward
earn events. Native mobile apps.

## Removed in the 2026-10 rebuild (don't re-propose without being asked)

The old `/hop/app` member app and `/hop/admin`, the `staff-portal` ConciergeHub, the social feed,
wellness check-ins, family care, Google Calendar OAuth, the marketing chatbot, the
concierge/relief request forms, the Capacitor iOS wrapper. Their tables remain in Neon, unused.
