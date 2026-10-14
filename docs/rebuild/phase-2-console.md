# Phase 2: Concierge Console (`apps/console`)

**Goal:** the HOP dispatch team signs in, sees every staff request, dispatches trips and tasks to
one specific rep, watches each job update live, reviews proof, and manages team accounts.

**Prerequisite:** Phase 1 done (`@hop/shared`, schema, auth, demo seed).

**Read first:**
- `docs/portal/architecture.md`
- `prototype/starter/components/console/ConsoleApp.tsx`
- `prototype/starter/app/console/page.tsx`
- `prototype/starter/app/api/{jobs,requests}/**`
- In the mockup (`prototype/starter/docs/mockups/concierge-console.html`), the **Concierge** view
  and its **Dispatch to reps** panel.

## 1. Scaffold the app

Create `apps/console` as a Next.js App Router app. Use the layout in `architecture.md` → Repo
layout, with `name: "@hop/console"` and dev port 3002.

- `next.config.ts`: the starter's security headers plus `transpilePackages: ["@hop/shared"]`.
- `lib/app.ts`: `APP_ROLE = "console"`, `APP_NAME = "Concierge Console"`.
- Root layout: Montserrat + DM Sans from Google Fonts, `import "@hop/shared/styles/portal.css"`,
  `<title>` "Concierge Console · HOP".

## 2. Auth pages and routes

- `app/login/page.tsx`: `<LoginScreen app="console" />`, with no sign-up link.
- `app/set-password/page.tsx`: `<SetPasswordScreen />`.
- `app/api/auth/route.ts`: `createAuthRoutes({ role: "console", allowSignup: false })`.
- `app/(app)/layout.tsx`: a server-side session check that redirects to `/login`. It renders the
  `AppHeader`, with nav links Console and Team, the signed-in name, and Sign out.

## 3. API routes (each starts with `requireUser(request, "console")`)

| Route | Method | Does |
|---|---|---|
| `/api/jobs` | GET | every job, newest first, plus `reps: RepSummary[]` so the UI can name them |
| `/api/jobs` | POST | `newJobSchema`. **The rep must be an active `rep` user** (check in the DB). Creates the job and marks the linked request `dispatched`. `notify(rep)` stub |
| `/api/jobs/[id]` | PATCH | `consolePatchJobSchema`, for reassigning and console notes |
| `/api/requests` | GET | every request, with member name and job title |
| `/api/requests` | PATCH `?id=` | status changes, such as cancel |
| `/api/team` | GET | all non-staff users (console, rep, facility_admin), plus facilities for the picker |
| `/api/team` | POST | `inviteSchema` {email, firstName, lastName, phone, role ∈ rep\|console\|facility_admin, facilityId (required for facility_admin)}. Creates an invited user, then emails a set-password link to that role's app (`REP_URL`/`FACILITY_URL`/`APP_URL` + `/set-password?token=…`) |
| `/api/team` | PATCH `?id=` | `{ action: "disable" \| "enable" \| "resend-invite" }` |

That's 4 route files, well under the cap.

## 4. Screens

**Console (`app/(app)/page.tsx`).** Port `ConsoleApp.tsx`:

- Replace every `REPS` use with the `reps` list returned by `GET /api/jobs`, in the rep filter
  chips, the composer "Send to rep" select, `repName()` and the reassign select.
- The composer prefill from a queue request carries `requestId`, member name and job title.
- Keep the 4 s polling (`useJobs()` with no argument).
- Keep "Fill with sample", the job details sheet (timeline, photos, signature, attention flag)
  and the reassign control.
- **Gap check against the mockup's Concierge view:**
  - KPIs (open/completed counts) and the request-lifecycle stepper. The mockup's lifecycle words
    are `matching → dispatched → en_route → verified → completed`. Map them to our request and job
    statuses: new = matching, dispatched/offer/accepted = dispatched, started/in_progress =
    en_route, completed with proof = verified/completed.
  - The volume-by-category bars, as sample data. Label them "Sample".
  - Build whatever is visible in the mockup and missing from the starter, using starter classes.

**Team (`app/(app)/team/page.tsx`).** This screen is new; there's no mockup for it, so keep it
plain with starter classes (`.panel`, `.tag`, `.btn`, `.field`):

- A table of users: name, email, role, facility, status (Invited/Active/Disabled), last login.
- "Invite" sheet: role select, names, email, phone; a facility select when the role is
  facility_admin.
- Row actions: Resend invite, Disable/Enable.

## 5. Env

`.env.example` in the app lists:
- `DATABASE_URL`, `SESSION_HASH_SECRET`, `RESEND_API_KEY`
- `APP_URL` (this app's base URL)
- `REP_URL`, `FACILITY_URL`, `STAFF_URL`

## Done when

- [ ] `npm run build -w @hop/console` and `npm run lint` pass.
- [ ] With the demo seed: sign in as console@demo.hop. A rep account signing in here gets the
      wrong-app message, not a session.
- [ ] Dispatch a job to Andre from the composer. It appears in the dispatch table with "New
      offer". `portal_jobs.rep_id` is Andre's uuid.
- [ ] Dispatch from a queued staff request. The request moves to dispatched.
- [ ] `curl` without a cookie → 401 on every `/api/*` route except `auth`. A forged `rep` uuid
      that isn't a rep → 400.
- [ ] Team: invite a rep. The set-password link is logged (dev) or emailed. Disable → that user
      can't sign in.
- [ ] Docs: `mvp-scope.md` Console rows updated and the status table updated.

## Notes from earlier phases

- **Phase 1 already scaffolded this app.** `apps/console` has `package.json` (dev port 3002),
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
