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

- [ ] `npm run build -w @hop/staff` and lint pass.
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

## Notes from earlier phases

_(none yet)_
