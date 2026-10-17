# HOP Portal: architecture

How the four Portal apps are wired. This is the **design every phase builds toward**. What is
actually built today is tracked in `docs/portal/mvp-scope.md` (and in the status table of
`docs/rebuild/README.md`). If code and this doc disagree, the code wins: fix this doc in the
same change.

## Repo layout

```
apps/
  site/        Vite landing site (not part of the Portal; links to it from /portal)
  staff/       Next.js: Staff App                 role: staff
  console/     Next.js: Concierge Console         role: console
  rep/         Next.js: Concierge Rep App         role: rep
  facility/    Next.js: Facility View             role: facility_admin
packages/
  shared/      @hop/shared: everything two or more apps need
db/schema.sql  one idempotent schema for the shared Neon database
scripts/       repo-level Node scripts (create the first console account, seed and remove demo data)
prototype/     leadership's concept: starter code + mockups. Reference only, never imported
```

Each Portal app is a standard Next.js App Router project:

```
apps/<app>/
  app/layout.tsx            fonts + "@hop/shared/styles/portal.css"; <body class="phone-app"> (Staff, Rep) or "desk-app" (Console, Facility)
  app/login/page.tsx        <LoginScreen appName tagline [signupHref] /> (redirects to / if already signed in)
  app/set-password/page.tsx <SetPasswordScreen /> (invite + reset links land here)
  app/(app)/layout.tsx      requirePageUser(APP_ROLE) → redirect("/login") if absent or wrong role
  app/(app)/page.tsx        the app itself (client component ported from the starter)
  app/api/auth/route.ts     export const { GET, POST } = createAuthRoutes({ role: APP_ROLE, ... })
  app/api/<resource>/...    route handlers wrapped in withAuth(APP_ROLE, handler)
  lib/app.ts                APP_ROLE, APP_NAME, APP_TAGLINE
  public/logo.png           a committed copy of packages/shared/assets/logo.png
  next.config.ts            transpilePackages: ["@hop/shared"], the starter's security headers
  package.json              name "@hop/<app>", fixed dev port (see below)
```

Dev ports: site 5173, staff 3001, console 3002, rep 3003, facility 3004.

## packages/shared (`@hop/shared`)

Source-only TypeScript with no build step. The apps compile it via `transpilePackages`.
Subpath exports:

| Import | Contents | Ported from |
|---|---|---|
| `@hop/shared/brand` | brand tokens, `JOB_TYPES`, `STATUS_LABEL`. **No hard-coded `REPS`**: reps come from the DB | `prototype/starter/lib/brand.ts` |
| `@hop/shared/types` | `Job`, `StaffRequest`, `PortalUser`, `Role`, facility/unit types | `lib/types.ts` |
| `@hop/shared/validate` | zod schemas for every API body | `lib/validate.ts` |
| `@hop/shared/client` | `j()` fetch helper + `ApiError`, `authApi`, `jobsApi`, `useJobs` polling hook (4 s, optimistic `update`, `onData` for side data) | `lib/client.ts` |
| `@hop/shared/time` | `nowT`, `nowTA` | `lib/time.ts` |
| `@hop/shared/ui/*` | `Phone` (screen shell: tabs, sheet, toast, `usePhone`, `ICONS`, `useDesktopToast`; no decorative frame), `AppHeader` (+ `SignOutButton`), `StatusSteps` (+ `statusPill`), `SignaturePad`, `LoginScreen`, `SetPasswordScreen` | `components/ui/*` |
| `@hop/shared/styles/portal.css` | the Portal design tokens + classes | `app/globals.css` |
| `@hop/shared/server/db` | `sql()` (cached `neon(DATABASE_URL)`), `json()`, `readJson()` (size-capped), `zodMessage()` | new |
| `@hop/shared/server/auth` | sessions, passwords, `requireUser`, `withAuth`, `getSessionUser`, `getSessionUserFromCookies`, password tokens, `createAuthRoutes` | old `api/_lib/hopAuth.ts` (in git history) |
| `@hop/shared/server/session` | `requirePageUser(role)` for server layouts/pages | new |
| `@hop/shared/server/store` | jobs (ownership-checked via `repId`), job/door events, requests (`listMyRequests` joins job status), users/reps/invites, facilities/units | `lib/store/postgres.ts` |
| `@hop/shared/server/email` | Resend: invite, password reset | new |
| `@hop/shared/server/integrations/*` | Twilio, Seam, push stubs with `TODO(IT)` | `lib/integrations/*` |

Server-only modules start with `import "server-only"` so they can never end up in a client
bundle.

## Accounts and auth

- **Roles**: `staff`, `rep`, `console`, `facility_admin`. One role per user, and one app per
  role. A rep who signs in on the Console gets "This account is for the Rep App" with a link to
  it, not a session.
- **How accounts are created**:
  - `staff`: self sign-up on the Staff App (`/signup`) with name, email, password, job title,
    facility and unit.
  - `rep`, `facility_admin` and extra `console` users: created by a console user on the
    Console's Team screen. They are created with `status = 'invited'` and no password, and
    Resend emails them a one-time set-password link to *their* app's `/set-password?token=…`.
  - The first `console` user: `node scripts/create-console-admin.mjs` (from the repo root,
    reads `DATABASE_URL`).
- **Sessions**: a random 32-byte token in an httpOnly, `SameSite=Lax`, `Secure` (on https)
  cookie named after the app's role: `hop_portal_staff`, `hop_portal_console`, `hop_portal_rep`
  or `hop_portal_facility_admin`. (On localhost every app shares one cookie jar, because cookies
  ignore the port, so a single name would let signing in to one app sign you out of another.) Only `HMAC-SHA256(token, SESSION_HASH_SECRET)` is stored, in
  `portal_sessions`. The TTL is 30 days.
  - Lockout: 8 failed attempts lock the account for 15 minutes.
  - Passwords: bcrypt cost 12, minimum length 10.
  - Each app has its own domain, so each app has its own cookie. One person can't be signed into
    two apps with one cookie, and that's intended.
- **Every route handler** is wrapped as `export const GET = withAuth(APP_ROLE, async (request,
  user, ctx) => …)`. `withAuth` returns 401 when there's no session for this app's role, and
  turns any thrown `Response` (`throw json({ error }, 400)`) into the reply. Ownership is checked in the query:
  - A rep only reads and patches jobs where `rep_id = user.id`.
  - A staff member only sees requests where `member_id = user.id`.
  - A facility admin only sees aggregates for `user.facility_id`.

## Data model (`db/schema.sql`, all tables prefixed `portal_`)

```
portal_facilities      id uuid, name, city, created_at
portal_units           id uuid, facility_id → facilities, name, created_at
portal_users           id uuid, email (unique, lower-cased), password_hash (null while invited),
                       role, first_name, last_name, phone, status ('invited'|'active'|'disabled'),
                       facility_id (staff + facility_admin), failed_login_attempts, locked_until,
                       created_at, last_login_at
portal_sessions        token_hash pk, user_id, expires_at, created_at
portal_password_tokens token_hash pk, user_id, purpose ('invite'|'reset'), expires_at, used_at
portal_staff_profiles  user_id pk, job_title, unit_id, prefs jsonb (what "HOP knows you"),
                       consents jsonb (watch/calendar/schedule consent intent), points int, lifetime_points int, updated_at
portal_point_claims    (user_id, earn_key, period) pk, points, claimed_at   (one claim per earn per day/week)
portal_requests        id text pk ('r'+8), member_id → users, status ('new'|'dispatched'|'completed'|'cancelled'),
                       job_id, data jsonb (StaffRequest), created_at, updated_at
portal_jobs            id text pk ('d'+8), rep_id → users, request_id, status, data jsonb (Job),
                       created_at, updated_at
portal_job_events      id bigserial, job_id, actor_id, kind, detail jsonb, at   (audit timeline)
portal_door_events     id bigserial, job_id, actor_id, action ('unlock'|'lock'), at
portal_unit_signals    unit_id, day date, metric ('strain'|'stress'|'missed_breaks'|'requests'),
                       hour smallint null, value numeric, group_size int   (Facility View source)
portal_support_actions id uuid, facility_id, unit_id, actions jsonb, sent_by, status ('sent'|'resolved'), request_id, created_at
```

Jobs and requests keep their full detail in JSONB `data`, exactly the starter's `Job` /
`StaffRequest` shape, so the ported UI works unchanged. The indexed columns (`rep_id`,
`member_id`, `status`) are kept in sync on every write. `Job.rep` holds the rep's **user id**
(uuid), not a name like `"andre"`. Normalizing proofs and events out of `data` is a later step
(IT handoff §1).

## The cross-app flow

```
Staff App  ── POST /api/requests ─────────────▶ portal_requests (status new)
Console    ── GET  /api/requests (all) ◀────────┘
Console    ── POST /api/jobs {rep: <uuid>, requestId} ▶ portal_jobs (status offer); request → dispatched
Rep App    ── GET  /api/jobs (server filters rep_id = me) every 4 s
Rep App    ── PATCH /api/jobs/:id (status, updates, photos, sig, door, attn) ▶ portal_jobs + job_events
Console    ── GET  /api/jobs every 4 s ◀── sees Accepted → Started → In progress → Completed, proof, signature
Staff App  ── GET  /api/requests (mine) ◀── request status derived from its job's status
Facility   ── GET  /api/facility (aggregates for my facility; cells with group_size < MIN_GROUP hidden)
Facility   ── POST /api/facility?action=support ▶ portal_support_actions (+ a Console queue item, unit-level, no names)
```

Each app hosts its **own** route handlers for the resources it touches, and all of them call the
same `@hop/shared/server/store` functions against the same database. There is no shared API
server and no cross-origin calls between apps.

### Who may change what on a job

| Field | Console | Rep (own jobs only) |
|---|---|---|
| `rep` (reassign) | ✓ | ✗ |
| `status` | ✓ | ✓ forward only: offer→accepted/declined→started→in_progress→completed |
| `log`, `updates`, `notesList`, `done`, `attn`, `share` | ✓ | ✓ |
| `photos`, `sig`, `signedBy` | view | ✓ |
| `door` | view | ✓ (the unlock itself goes through `/api/door`, which writes `portal_door_events`) |

The server enforces this with two zod schemas, `consolePatchJobSchema` and
`repPatchJobSchema`. Don't use a single permissive schema.

## Realtime, uploads, integrations

- **Realtime**: client polling every 4 s (`useJobs`), as in the starter. Local edits are applied
  optimistically. Swapping to SSE/Pusher/Ably is a later step (`TODO(IT)` in `client.ts`).
- **Photo and signature proof**: `POST /api/uploads` (Rep App). With `BLOB_READ_WRITE_TOKEN` set,
  files go to Vercel Blob. Without it, the data URL is stored inline (demo only, 2 MB cap). Making
  Blob private with signed URLs is required before real deliveries.
- **Masked calls (Twilio), smart locks (Seam), push (OneSignal)**: stubs in
  `@hop/shared/server/integrations` that log and return demo values. The Rep App's Call/Text
  buttons use `tel:`/`sms:` links until Twilio is wired.

## Deployments

| Vercel project | Root Directory | Framework | Env vars |
|---|---|---|---|
| `theconcierge` (existing) | `apps/site` | Vite | `DATABASE_URL`, `RESEND_API_KEY`, `NOTIFY_EMAIL`, `VITE_STAFF_URL`, `VITE_CONSOLE_URL`, `VITE_REP_URL`, `VITE_FACILITY_URL` |
| `hop-staff` | `apps/staff` | Next.js | shared set ↓ + `APP_URL` |
| `hop-console` | `apps/console` | Next.js | shared set + `APP_URL`, `STAFF_URL`, `REP_URL`, `FACILITY_URL` (for invite links) |
| `hop-rep` | `apps/rep` | Next.js | shared set + `APP_URL`, optional `BLOB_READ_WRITE_TOKEN` |
| `hop-facility` | `apps/facility` | Next.js | shared set + `APP_URL` |

The shared set is `DATABASE_URL`, `SESSION_HASH_SECRET` and `RESEND_API_KEY`, the same values in
every project.

- All five projects deploy from `main`. Vercel detects npm workspaces and installs from the repo
  root.
- In each Portal project, "Include files outside the root directory" must stay on (the default),
  because the apps import `packages/shared`.
- Use Vercel's "Ignored Build Step" with
  `git diff --quiet HEAD^ HEAD -- . ../../packages ../../package-lock.json`, so a change to one app doesn't
  rebuild the others.
- The old `theconcierge-staff` project and the `staff-portal` branch are retired in Phase 6.

## Privacy rules (from the IT handoff, non-negotiable)

- Facility View shows **unit totals only**, and any unit or cell with fewer than `MIN_GROUP_SIZE`
  (5) people is suppressed **server-side**, not just hidden in the UI. No names, ever.
- No watch, calendar or schedule data is collected until a privacy/HIPAA review is done. Those
  screens show sample data and "Connect" flows that only record consent intent.
- Proof photos are private before any real job (signed Blob URLs).
