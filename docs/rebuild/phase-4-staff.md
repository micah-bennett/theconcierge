# Phase 4: Staff App (`apps/staff`)

**Goal:** nurses, doctors and every healthcare professional sign themselves up and ask HOP for
anything: typed, Clutch, Overtime Rescue or Voice drop. Their requests land in the Console queue
and they see the status come back. The rest of the mockup's experience (Week, Life Admin,
Recharge, Crew, HOP knows you, smart home) is built faithfully, on sample data where the IT
handoff says so.

**Prerequisites:** Phases 1–3. You need the Console to see requests arrive and the Rep App to
complete them.

**Read first:**
- `docs/portal/architecture.md` → Privacy rules
- `prototype/starter/components/staff/StaffApp.tsx`
- `prototype/starter/app/api/requests/route.ts`
- **The mockup `prototype/starter/docs/mockups/staff-app.html` is much richer than the starter.**
  Click through every tab and sheet before writing code.

## Mockup vs starter: what to build

The starter has 4 tabs (Today, Rewards, You, Home). The mockup has 5 bottom tabs plus screens
reached from the top bar. **Build the mockup's structure.**

| Mockup screen (JS fn) | Where | Data |
|---|---|---|
| **Today** (`home`, `welcome`, `reqRow`) | tab 1 | Greeting with name and shift state. Welcome-back cards "From your calendar / watch / schedule / Saved" (**sample**; each card's action creates a **real** request). **My requests** list with live status (**real**). Ask HOP composer (**real**) |
| **Week** (`plan`) | tab 2 | Shift-aware week planner with Sleep Guard and delivery windows (**sample** shift pattern; picking a window attaches it to the next request) |
| **Life** (`life`) | tab 3 | Life Admin: license renewal, CEU credits, car inspection and so on (**sample**; "Have HOP handle it" creates a **real** request) |
| **Recharge** (`me`) | tab 4 | Recharge points, tier progress (Bronze/Silver/Gold/Platinum), earn lists (daily/weekly/big), leaderboard, breathing reset. **Points balance is real** (`portal_staff_profiles.points`). Earn events are client-claimed and flagged `TODO(IT): server-verify before cash value`. Leaderboard is **sample** |
| **Crew** (`crewV`) | tab 5 | Groups, Feed, News, Pulse, Refer sub-tabs (**sample**, opt-in copy kept) |
| **You** (`you`) | avatar | Profile (**real**: name, job title, facility, unit, member since), points, links to HOP knows you and Smart home, connect wearables/calendars/schedule (`connectSheet`/`permSheet`: records **consent intent only**, no data pulled), Sign out |
| **HOP knows you** (`know`) | from You | Learned preferences, editable and forgettable (**real**: `portal_staff_profiles.prefs`, seeded from the starter's `PREFS0` on sign-up) |
| **Smart home** (`smart`) | from You | Alexa/Apple/Google/smart lock cards (**sample**, `TODO(IT)`) |
| **Clutch** (`clutchSheet`) | FAB / top bar | "What is on fire?" grid → **real** request, flagged urgent. Clutch coverage hours `[CONFIRM]` |
| **Overtime Rescue** (`rescueSheet`) | from Today | Toggles → one **real** request listing the chosen items |
| **Voice errand drop** (`voiceSheet`) | from Today | Use the Web Speech API (`webkitSpeechRecognition`) when available, otherwise the mockup's scripted demo. The transcript is split into items → one **real** request |
| **Chat with Hop** (`chatSheet`) | top bar chat icon | Scripted assistant thread as in the mockup (**sample**). Anything the member asks for becomes a **real** request. No LLM in this phase |

**Drop the "See it as" role picker.** Role, name and unit come from the signed-in profile. For
role-specific sample content (the mockup's `ROLES` with shift patterns and licence names), pick
the closest sample role from the user's job title, falling back to "nurse".

## 1. Scaffold

Same pattern as the earlier apps, with `@hop/staff`, port 3001, `APP_ROLE = "staff"`,
`APP_NAME = "HOP"`. Mobile-first, with a web app manifest as in Phase 3.

## 2. Auth with sign-up

- `createAuthRoutes({ role: "staff", allowSignup: true, onSignup })`. `onSignup` validates
  `facilityId` and `unitId` (the unit must belong to the facility), then inserts
  `portal_staff_profiles` with the job title and default prefs.
- `app/signup/page.tsx`: first and last name, email, password, job title (free text with
  suggestions: ICU Nurse, ER Doctor, Imaging Tech, Home Health Aide, Respiratory Therapist,
  Phlebotomist, Unit Clerk), facility, unit, and a terms/privacy consent checkbox `[CONFIRM]`
  wording.
- `GET /api/auth?action=facilities` is a **public** list of facilities and units for the sign-up
  form (id and name only). Add it to `createAuthRoutes` as an option so no extra route file is
  needed.
- The landing site's `/portal` "Create an account" button links to `/signup`.

## 3. API routes (each starts with `requireUser(request, "staff")`)

| Route | Method | Does |
|---|---|---|
| `/api/requests` | GET | `listRequests({ memberId: user.id })`, each with its job's status, rep first name and ETA text, so "My requests" can show New offer → Accepted → … → Completed |
| `/api/requests` | POST | `newRequestSchema` {cat, text, urgent?, window?, source: "ask"\|"clutch"\|"rescue"\|"voice"\|"chat"\|"welcome"\|"life"}. The server fills `memberId`, the name and the job title from the session |
| `/api/profile` | GET | profile + prefs + points |
| `/api/profile` | PATCH | `{ prefs }`, `{ claim: earnKey }` (adds the starter's point value, once per period per key, enforced in SQL), `{ consent: { source, granted } }` |

## Done when

- [x] `npm run build -w @hop/staff` and lint pass. (Build and `tsc --noEmit` pass. The repo has
      no ESLint config yet, so Next's lint step is a no-op.)
- [ ] Sign up a new user with the demo facility → lands on Today with their name.
- [ ] Leadership's Test 2: every tab and sheet from the table above renders and behaves like the
      mockup. Clutch, Rescue, Voice, Ask, a welcome card and a Life item each create a request
      that appears in the Console queue within 4 s.
- [ ] Full loop: staff request → Console dispatches to Andre → Andre completes in the Rep App →
      the Staff App's "My requests" shows Completed.
- [ ] Staff user A can't see B's requests (API returns only A's). A staff cookie on the Console
      or Rep App is refused.
- [ ] Claiming the same daily earn twice in one day adds points once.
- [ ] Docs: `mvp-scope.md` Staff rows (real vs sample, exactly as built) and the status table.
      (Text drafted in "Phase 4 build notes" below; the parallel-build lane rules kept this agent
      out of `docs/portal/*` and `docs/rebuild/README.md`, so whoever merges applies it.)

Verified without a database (no `DEV_DATABASE_URL` was available): every `/api/requests` and
`/api/profile` method returns 401 with no session, `/` redirects to `/login`, `/signup` renders,
sign-up rejects a bad body with 400 before touching the DB, and `/manifest.webmanifest` serves.
Everything that needs Neon (sign-up, requests reaching the Console, the full loop, A-vs-B
isolation, the double-claim check) is **not yet verified**.

## Phase 4 build notes (2026-10-14)

What was built, file by file:

- `app/api/auth/route.ts`: `allowSignup: true`, `onSignup: createProfileOnSignup`. The hook
  checks the unit belongs to the facility (`throw json({error}, 400)`, so the shared factory
  deletes the new user row) and inserts `portal_staff_profiles` (job title, unit, `PREFS0`).
- `app/signup/page.tsx` + `components/SignupForm.tsx`: name, email, password, optional mobile,
  job title (datalist suggestions), facility, unit, consent checkbox (`[CONFIRM]` wording).
- `app/api/requests/route.ts`: GET (mine only, with job status, rep first name, job window,
  needs-attention flag, client updates; staff-local query in `lib/server/requests.ts`), POST
  (`newRequestSchema`; member id, name and job title from session + profile).
- `app/api/profile/route.ts`: GET; PATCH with exactly one of `{prefs}`, `{claim}`,
  `{consent:{source,granted,scopes?}}`. Claims are one SQL statement (`INSERT … ON CONFLICT DO
  NOTHING RETURNING` feeding the points `UPDATE`). Periods: daily = local date, weekly = ISO
  week, big wins = once, counted in `America/New_York` (`[CONFIRM]`). `connect` needs a granted
  `wear:*` consent and `profile` needs three "You told HOP" prefs.
- Consent keys (`portal_staff_profiles.consents`): `wear:<app>` (one at a time), `cal:<app>`,
  `work:<app>`, plus the "What HOP learns from" (`learn:<source>`) and "Your privacy"
  (`priv:<setting>`) switches. Intent only; nothing is read from any of them.
- `components/`: `StaffApp` (shell, 5 tabs, top bar chat + avatar, voice FAB), `store.tsx`
  (profile, 5 s request polling, `ask()`, picked Week window), `sheets.tsx` (Compose, Clutch,
  Rescue, Voice, Chat, Connect, Perm), `screens/*` (Today, Week, Life, Recharge, Crew, You,
  Know, Smart), `app/manifest.ts`.
- Sample role content comes from `lib/roles.ts` `pickRole(jobTitle)` (nurse / doctor / tech /
  home health, default nurse). The Overtime Rescue card shows for everyone, because the shift
  state it was gated on in the mockup is sample.
- Request categories are the shared `JOB_CATS` (the mockup's "wellness" isn't one; the
  "Schedule reset" suggestion files as an errand).
- Redeem is sample (toast only, `[CONFIRM reward catalog]`), since nothing fulfils a redemption.

Leftovers for other phases:

- Phase 6 / `apps/site`: the landing page's "Create an account" button should link to the Staff
  App's `/signup` (not in this app's lane).
- `docs/portal/mvp-scope.md` Staff row, as built: **Real**: sign-up with facility/unit check,
  Ask / Clutch (urgent) / Overtime Rescue / Voice drop / Chat asks / Welcome-card actions / Life
  Admin "Have HOP handle it" → `portal_requests`; My requests with live job status (5 s poll),
  rep first name, window and updates; profile (name, job title, facility, unit, member since);
  "HOP knows you" prefs (confirm, forget, teach); points balance + lifetime tier; once-per-period
  earn claims (client-claimed, `TODO(IT)` server-verify); consent intent for watch, calendars,
  work schedule, learn-from and privacy switches. **Sample**: welcome-card observations, shift
  state and Week pattern, suggestions, Post Shift Landing / Sleep Guard / Home Ready, readiness
  and synced-day cards, Life Admin items / moments / Family Hub, streak, redeem, challenges,
  leaderboard (except your own points), wellbeing charts, Crew (all five sub-tabs; Pulse submit
  claims the real weekly points), Hop chat replies, Smart home.

## Notes from earlier phases

- **Phase 1 already scaffolded this app.** `apps/staff` has `package.json` (dev port 3001),
  `next.config.ts`, `tsconfig.json`, `lib/app.ts`, the root layout, `/login`, `/set-password`,
  `/api/auth`, `public/logo.png` and an `(app)/` group whose layout requires the session. Replace
  the placeholder `app/(app)/page.tsx` and skip the "Scaffold" section below, except for anything
  it lists that doesn't exist yet.
- Wrap routes as `export const GET = withAuth(APP_ROLE, async (request, user, ctx) => …)`
  (`@hop/shared/server/auth`). Use `readJson`, `json` and `zodMessage` from
  `@hop/shared/server/db`, and the store functions in `@hop/shared/server/store`. Read
  `packages/shared/src/` before writing anything new; most of what you need is there.
- Use `useJobs` from `@hop/shared/client`. It takes no rep argument, `update()` returns a promise
  that rejects with `ApiError`, and `onData` gives you the whole `/api/jobs` response.
- UI from `@hop/shared/ui/*`: `Phone`/`usePhone`/`ICONS`/`useDesktopToast`, `AppHeader`
  (+ `SignOutButton`), `StatusSteps` (+ `statusPill`), `SignaturePad`. All the starter's CSS
  classes are in `@hop/shared/styles/portal.css`, already imported.
- Demo accounts (after `hop:seed-demo`; every password is `DEMO_PASSWORD`):
  - console@demo.hop
  - renee@ / marcus@ / andre@demo.hop (reps)
  - jordan@ / patel@ / kelly@demo.hop (staff)
  - facility@demo.hop

  The facility is "Hudson Valley Medical Center", with 6 mockup units plus "Wound Care"
  (group size 3, which must be suppressed).
