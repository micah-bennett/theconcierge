# Backend guide (for the person running HOP, not an engineer)

Step-by-step instructions for the things you do in the Vercel and Neon dashboards. An agent
should point you here rather than explain it in chat. Phase 6 of the rebuild finishes this guide
for the four Portal apps. Until then, only the landing site section applies.

## What runs where

- **One Neon database** holds everything: contact-form inquiries and, once built, all Portal
  accounts, requests and jobs.
- **Six Vercel projects** come from the same GitHub repo and the same `main` branch. Each one
  builds a different folder:

  | Vercel project | Folder ("Root Directory") | What it is |
  |---|---|---|
  | `theconcierge` | `apps/site` | Public landing site |
  | `hop-client` | `apps/staff` | HOP Client |
  | `hop-console` | `apps/console` | Concierge Console (created in Phase 6) |
  | `hop-rep` | `apps/rep` | Concierge Rep App (created in Phase 6) |
  | `hop-facility` | `apps/facility` | Facility View (created in Phase 6) |
  | `hop-concierge` | `apps/concierge` | Concierge Portal for individual customers (added in v2.1, 2026-11) |

- The old `theconcierge-staff` project (ConciergeHub, on the `staff-portal` branch) is being
  retired. Leave it alone until Phase 6 says to delete it.

## ⚠️ Required right after the 2026-10 rebuild merges: point the landing site at its new folder

The landing site moved from the top of the repo into `apps/site`. Until you do this, the next
deploy of `theconcierge` will fail.

1. Vercel → `theconcierge` project → **Settings → Build and Deployment**.
2. **Root Directory**: click Edit, choose `apps/site`, and Save. Leave "Include files outside the
   root directory" **on**.
3. **Framework Preset** stays **Vite**. Build command and output directory stay on their defaults
   (`npm run build`, `dist`).
4. **Settings → Environment Variables**. Keep `DATABASE_URL`, `RESEND_API_KEY` and
   `NOTIFY_EMAIL`, and add these four (Production + Preview), even before the apps exist:
   - `VITE_STAFF_URL`
   - `VITE_CONSOLE_URL`
   - `VITE_REP_URL`
   - `VITE_FACILITY_URL`

   Leave a value blank and that card on `/portal` shows "Coming soon". Fill them in once the
   apps are live.
5. Env vars only for the removed old system can be deleted once you're happy:
   - `SESSION_HASH_SECRET` on this project (the Portal apps get their own)
   - `GOOGLE_*` OAuth values
   - `ANTHROPIC_API_KEY`
6. **Deployments → Redeploy** the latest `main` deployment. Then open `/`, `/portal` and
   `/contact`, and send a test message through the contact form.

## ⚠️ v2.1 (2026-11): Concierge Portal, Healthcare / Organizations / Concierge, instant requests

Do these **in this order**. Step 1 must happen before the code reaches `main`, because the new code
writes a new database column; without it, new requests and the Facility View would fail.

1. ✅ Done 2026-11-01. **Update the database** (see "Database updates" below): `npm run db:migrate`. It adds the
   `customer` account type, the `portal_customer_profiles` table and a `channel` column on
   requests. Safe to run twice; nothing is deleted.
2. **Merge the code to `main`** (all projects redeploy).
3. **Create the sixth Vercel project** for the Concierge Portal: Vercel → Add New → Project →
   import the same repo → name it `hop-concierge` → **Root Directory** `apps/concierge` (leave
   "Include files outside the root directory" on) → Framework **Next.js**. Before the first
   deploy, add its settings: `DATABASE_URL`, `SESSION_HASH_SECRET` (the same value as the other
   apps), `RESEND_API_KEY`, and `APP_URL` = its own address (for example
   `https://hop-concierge.vercel.app`). Deploy.
4. **Tell the other apps where it is**: add `CONCIERGE_URL` = that address to `hop-client`,
   `hop-console`, `hop-rep` and `hop-facility` (used for the "this account is for the Concierge
   Portal" message), and `VITE_CONCIERGE_URL` = the same address to the site (`hop_services`).
   Redeploy each one. Until `VITE_CONCIERGE_URL` is set, the site shows the Concierge Portal as
   "Coming soon"; the no-account instant request form at `/request` works either way.
5. **Check that customer data stays separate** (read-only, safe on the live database):
   ```bash
   DATABASE_URL="postgres://…" npm run hop:check-separation
   ```
   Every line should say PASS. Run it again any time, for example before a hospital review.

Instant requests from the public site land in the Concierge Console queue as "Instant request" and
also email `NOTIFY_EMAIL` on the site project. Payment: the forms never take a full card number.
They take the method, the cardholder name and the last 4 digits, and the team calls to take
payment. A real card checkout (for example Stripe) is not set up yet.

## Database updates

From the repo folder on your computer, with the database address set:

```bash
export DATABASE_URL="postgres://…"   # Neon → your project → Connection string
npm run db:migrate
```

It's always safe to run twice: it only adds things, and it never deletes tables or data.

**Status:** applied to the live database on 2026-10-17 (it added the `portal_` tables and
`hop_inquiries`; the old tables were not touched).

**v2.1 status:** applied to the live database on 2026-11-01 (role `customer`,
`portal_customer_profiles`, `portal_requests.channel`; all 109 existing requests became
`organization`, 275 accounts untouched). `npm run hop:check-separation` passed right after.

## Demo accounts (in the live database until launch)

On 2026-10-17 the operator chose to put the demo data in the live database instead of a separate
Neon branch. Nothing live reads the `portal_` tables yet, so this is safe for now. The demo is one
sample hospital ("Hudson Valley Medical Center"), eight accounts ending in `@demo.hop`, four
sample jobs and two sample requests. All the demo accounts share one password (`DEMO_PASSWORD`).

**Before real staff sign up**, delete it. This removes only the demo hospital, the `@demo.hop`
accounts and anything they created:

```bash
CONFIRM_REMOVE_DEMO=1 DATABASE_URL="postgres://…" npm run hop:remove-demo
```

To put a fresh copy back (for example, to reset after a walkthrough), run the remove command, then:

```bash
ALLOW_DEMO_SEED=1 DEMO_PASSWORD="…10+ characters…" DATABASE_URL="postgres://…" npm run hop:seed-demo
```

## The five Vercel projects (team: AY Projects)

| Project | Folder (Root Directory) | Live address |
|---|---|---|
| `hop_services` | `apps/site` | https://www.hopserves.com (the public site) |
| `hop-client` | `apps/staff` | https://hop-client.vercel.app (HOP Client; the old hop-staff.vercel.app address still works) |
| `hop-console` | `apps/console` | https://hop-console.vercel.app |
| `hop-rep` | `apps/rep` | https://hop-rep.vercel.app |
| `hop-facility` | `apps/facility` | https://hop-facility.vercel.app |
| `hop-concierge` | `apps/concierge` | Not created yet (v2.1 step 3 above) |

All six are connected to the GitHub repo. A push to `main` deploys to production, and a push to
any other branch makes a preview. If a site deploy ever shows "Ready" but the live site doesn't
change, an earlier rollback has paused auto-promotion: Deployments → the new one → ⋯ → Promote to
Production. (`theconcierge.life` is not attached to any project right now; it shows Vercel's
DEPLOYMENT_NOT_FOUND page.) Every push rebuilds all six.

**Settings each Portal app has** (Vercel → project → Settings → Environment Variables):
- `DATABASE_URL`: the Neon database.
- `SESSION_HASH_SECRET`: one random value, shared by the five apps.
- `APP_URL`: that app's own address.
- `CLIENT_URL` (HOP Client; the old name `STAFF_URL` still works), `CONSOLE_URL`, `REP_URL`,
  `FACILITY_URL`, `CONCIERGE_URL`: the five addresses above.
- `RESEND_API_KEY`: needed for invite and password-reset emails. **Add it by hand** (see below).

**HOP Client only:** `SOCIAL_LINKS` turns on the "Follow HOP" reward cards. Paste exactly this
shape, with only the accounts HOP has (each must start with https://):
`{"instagram":"https://…","facebook":"https://…","linkedin":"https://…","tiktok":"https://…"}`.
Leave it unset to show only the blog and share cards. Redeploy HOP Client after changing it.

**Rep App only:** `HOP_SUPPORT_PHONE` (for example `+18455550100`) shows a "Call the HOP line"
button on the rep's Safety screen.

**The site** also has `VITE_CLIENT_URL`, `VITE_CONSOLE_URL`, `VITE_REP_URL`,
`VITE_FACILITY_URL` and `VITE_CONCIERGE_URL`. These are the links on the HOP Portal and
Concierge pages.

### Adding the email key to the Portal apps (one time)
1. Vercel → `hop_services` → Settings → Environment Variables → `RESEND_API_KEY` → copy the value
   (or create a new key at resend.com → API Keys).
2. For each of `hop-client`, `hop-console`, `hop-rep`, `hop-facility` and `hop-concierge`: Settings → Environment
   Variables → Add → Key `RESEND_API_KEY`, paste the value, tick Production and Preview → Save.
3. Redeploy each one: Deployments → the top one → ⋯ → Redeploy.

Until this is done, inviting someone from the Console Team screen and "Forgot password" won't work
on the live apps.

### Changing an app's address (custom domain)
Vercel → project → Settings → Domains → Add (for example `console.theconcierge.life`). Then update
that address in all five apps' `*_URL` settings and the site's `VITE_*_URL`, and redeploy.

### Rolling back one app
Vercel → that project → Deployments → pick the last good one → ⋯ → Promote to Production. The
other apps aren't affected.

### Logs
Vercel → project → Logs (or Deployments → a deployment → Runtime Logs).

## Still to do
- v2.1 steps 2-5 above (database update, Concierge Portal project, `CONCIERGE_URL` /
  `VITE_CONCIERGE_URL`, separation check).
- Creating the real first Concierge Console account (`npm run hop:create-console-admin`) and
  removing the demo data (above) before real staff sign up.
- Retiring `theconcierge-staff` and the `staff-portal` branch (only with the operator's go-ahead;
  it can't be undone).
