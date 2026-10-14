# Phase 1: Shared foundation (`packages/shared`, schema, auth, demo seed)

**Goal:** everything the four apps need in common, so Phases 2–5 only build screens and routes.
No app is created in this phase. A throwaway check script proves the foundation works.

**Read first:** `CLAUDE.md`, `docs/portal/architecture.md` (all of it), `prototype/starter/lib/*`,
`prototype/starter/components/ui/*`, `prototype/starter/app/globals.css`.

The old auth code to port lives in git history:

```
git show 88ec07f:api/_lib/hopAuth.ts
```

Read it in full. It's battle-tested: lockout, HMAC-hashed session tokens, cookie flags and
password reset tokens.

## 1. Package skeleton

Create `packages/shared/`:

```
package.json      name "@hop/shared", private, "type": "module",
                  "exports": { "./brand": "./src/brand.ts", "./types": "./src/types.ts",
                    "./validate": "./src/validate.ts", "./client": "./src/client.ts",
                    "./ui/*": "./src/ui/*.tsx", "./server/*": "./src/server/*.ts",
                    "./server/integrations/*": "./src/server/integrations/*.ts",
                    "./styles/portal.css": "./styles/portal.css" }
                  dependencies: @neondatabase/serverless, bcryptjs, cookie, resend, zod, server-only
                  peerDependencies: react, react-dom, next
tsconfig.json     strict, moduleResolution "bundler", jsx "react-jsx", noEmit
src/  styles/
```

Add a `typecheck` script (`tsc --noEmit`). Run `npm install` at the repo root.

## 2. Port the starter's `lib/`

| New file | From | Changes |
|---|---|---|
| `src/brand.ts` | `lib/brand.ts` | **Delete `REPS`.** Keep `brand`, `JOB_TYPES`, `STATUS_LABEL` |
| `src/types.ts` | `lib/types.ts` | `Job.rep` and `StaffRequest.member` become user-id strings. Add `memberName`, `memberId` to `StaffRequest`. Add `Role = "staff"\|"rep"\|"console"\|"facility_admin"`, `PortalUser`, `Facility`, `Unit`, `RepSummary {id, name, first, initials}` |
| `src/validate.ts` | `lib/validate.ts` | `rep` becomes `z.string().uuid()`, not an enum. Split `patchJobSchema` into `consolePatchJobSchema` (may set `rep`) and `repPatchJobSchema` (no `rep`, no `client`/`title` edits). `newRequestSchema` drops `member`/`role` (the server fills them from the session). Add `loginSchema`, `signupSchema`, `setPasswordSchema`, `inviteSchema` |
| `src/client.ts` | `lib/client.ts` | `api.jobs()` takes **no** rep argument (the server decides). Keep `useJobs` polling as-is |
| `src/time.ts` | `lib/time.ts` | as-is |
| `src/seed.ts` | `lib/seed.ts` | Keep as demo content for `scripts/seed-demo.mjs` (§6) |
| `src/server/integrations/{twilio,seam,push}.ts` | `lib/integrations/*` | as-is, with `import "server-only"` |

## 3. Database (`db/schema.sql`)

Append the `portal_*` tables exactly as listed in `docs/portal/architecture.md` → Data model,
under the "HOP Portal" heading that is already in the file.

- Use `CREATE TABLE IF NOT EXISTS`, `CHECK` constraints for every enum-like column, and FKs with
  `ON DELETE CASCADE` for sessions/tokens and `ON DELETE SET NULL` for job/request links to users.
- Add indexes on `portal_jobs(rep_id)`, `portal_jobs(status)`, `portal_requests(member_id)`,
  `portal_requests(status)`, `portal_sessions(user_id)`, `portal_unit_signals(unit_id, day)`, and
  a unique index on `lower(email)`.
- **Never touch the existing `hop_*` tables.** Run `npm run db:migrate` **twice**. The second run
  must succeed with no changes (idempotency check).

`src/server/db.ts`: `import "server-only"`. `export function sql()` returns a module-cached
`neon(process.env.DATABASE_URL)`, and throws a clear error if the variable is unset.

## 4. Auth (`src/server/auth.ts`)

Port `hopAuth.ts` with these changes:

- Cookie name `hop_portal_session`. Tables `portal_users`, `portal_sessions`,
  `portal_password_tokens`.
- `type Role` from `types.ts`. `HopUser` → `PortalUser` (id, email, role, firstName, lastName,
  phone, status, facilityId).
- Drop everything OAuth- and hopNumber-related.
- Exports:
  - `hashPassword`, `verifyPassword`, `createSession(userId)`, `destroySession(request)`
  - `getSessionUser(request | cookieHeader)`
  - `requireUser(request, role)`, which throws a `Response` with 401/403
  - `withAuth(role, handler)`, a wrapper that catches that `Response`
  - `createPasswordToken(userId, purpose)`, `consumePasswordToken(token)`
- `getSessionUserFromCookies()`: a variant for server components that reads
  `cookies()` from `next/headers`.
- `createAuthRoutes({ role, allowSignup, onSignup? })` returns `{ GET, POST }` for
  `app/api/auth/route.ts`. Its actions:

  | Call | Does |
  |---|---|
  | `GET ?action=me` | the current user, or 401 |
  | `POST ?action=login` | logs in. A wrong role gets a 403 with `{ error, appForRole }` |
  | `POST ?action=logout` | ends the session |
  | `POST ?action=signup` | only if `allowSignup`. Calls `onSignup(user, body)` so Staff can write its profile |
  | `POST ?action=set-password` | invite or reset token + new password; activates invited users and logs them in |
  | `POST ?action=forgot` | always 200; emails a reset link if the account exists |

- Rules: lower-case emails, bcrypt cost 12, password minimum 10 characters, 8 failures → 15-minute
  lock, session TTL 30 days, `SESSION_HASH_SECRET` required.

`src/server/email.ts`: `sendInviteEmail(to, firstName, appName, link)` and
`sendPasswordResetEmail(to, link)` via Resend, with simple inline-styled HTML in the Portal
palette. If `RESEND_API_KEY` is missing in development, log the link to the console instead of
failing, so local testing works.

## 5. Store (`src/server/store.ts`)

Port `lib/store/postgres.ts` to `@neondatabase/serverless` against the `portal_*` tables.

- **Jobs:**
  - `listJobs({ repId? })`
  - `getJob(id)`
  - `createJob(job, actorId)`: inserts and writes a `job_events` row
  - `updateJob(id, patch, actorId, { repId? })`: if `repId` is given, the `WHERE` includes
    `rep_id = repId` (ownership); sync the `status`/`rep_id` columns and write a `job_events` row
    per status change
- **Requests:**
  - `listRequests({ memberId? })`
  - `createRequest(r)`
  - `updateRequest(id, patch)`
  - When a job linked to a request reaches `completed`, set the request to `completed`.
- **Users:**
  - `listUsers({ role? })`
  - `listReps()`, which returns `RepSummary[]` and replaces the starter's `REPS`
  - `createInvitedUser(...)`
  - `setUserStatus(id, status)`
  - `listFacilities()`
  - `listUnits(facilityId)`

There is no in-memory store. Local dev uses a real Neon database or a Neon branch.

## 6. Scripts (repo-root `scripts/`)

- `create-console-admin.mjs`: prompts for (or takes as flags) email, first name, last name and
  password. Creates an active `console` user. Refuses if the email exists.
- `seed-demo.mjs`: idempotent (`ON CONFLICT DO NOTHING`, fixed uuids). Creates:
  - **Demo facility** "Hudson Valley Medical Center" with units ICU, Emergency, Med-Surg,
    Cardiology, Pediatrics, Ortho and Imaging
  - **Reps** Renee Carter, Marcus Diaz and Andre Wells, active, with password from `DEMO_PASSWORD`
  - **Staff** Jordan Reyes (ICU Nurse) and Dr. Anita Patel (ER Doctor)
  - **Facility admin** facility@demo.hop
  - **Console** console@demo.hop
  - **The starter's seed jobs and requests**, re-pointed at the new user ids
  - **14 days of `portal_unit_signals`** sample values per unit, shaped like the mockup's
    numbers (all `group_size` ≥ 5 except one deliberately small unit, to prove suppression)

  Refuses to run unless `ALLOW_DEMO_SEED=1`, so it can never hit production by accident.
- Add root scripts `hop:create-console-admin` and `hop:seed-demo` to the root `package.json`.

## 7. Shared UI and styles

- `styles/portal.css`: the starter's `app/globals.css`, with the demo-stage chrome (`.stage`,
  `.side*`, `.rolepick`, `.legend`, `.pill`, `.notch`, `.status`, the `.phone` frame box-shadow
  and fixed 390×844 size) replaced by a responsive app shell.
  - `.phone` becomes a full-height column (`min-height: 100dvh`, max width 480px, centred) with
    `.tabs` fixed to the bottom and safe-area padding.
  - `.sheet`, `.veil`, `.toast`, `.fab` keep working.
  - Keep every component class.
  - Add `.auth` styles (centred card, logo, fields, errors) for the login screens.
- `src/ui/Phone.tsx`: the starter's `Phone`, `usePhone`, `ICONS`, `useDesktopToast`, minus the
  notch and status bar.
- `src/ui/AppHeader.tsx`, `StatusSteps.tsx`, `SignaturePad.tsx`: ported as-is (with
  `"use client"`).
- `src/ui/LoginScreen.tsx`: logo, app name and tagline, email + password, error states (including
  the wrong-role message with a link to the right app), "Forgot password?", and an optional "Create
  an account" link.
- `src/ui/SetPasswordScreen.tsx`: for invite and reset links. Shows the logo and posts to
  `/api/auth`.
- Copy `prototype/starter/public/logo.png` to `packages/shared/assets/logo.png`. Each app copies
  it into its own `public/` at build time via a `prebuild` script, or just keeps a committed
  copy. Decide once, then document it in `architecture.md`.

## Done when

- [ ] `npm run typecheck -w @hop/shared` passes.
- [ ] `npm run db:migrate` runs twice cleanly. The `portal_*` tables exist. The `hop_*` tables
      are untouched.
- [ ] `ALLOW_DEMO_SEED=1 npm run hop:seed-demo` runs twice cleanly.
- [ ] A throwaway script (not committed) proves the auth lifecycle against the DB:
  - createSession, then getSessionUser
  - wrong-role 403
  - lockout after 8 bad passwords
  - an invite token sets a password exactly once
- [ ] `npm run lint` and `npm run build:site` still pass.
- [ ] `docs/portal/architecture.md` matches what you built (file names, exports, the logo
      decision). The status table in `docs/rebuild/README.md` is updated.

## Notes from earlier phases

- Phase 0 trimmed `db/schema.sql` to `hop_inquiries` plus a header. The old tables still exist in
  Neon, and their names (`hop_users`, `hop_sessions`, `hop_password_resets`) are why every new
  table is prefixed `portal_`.
