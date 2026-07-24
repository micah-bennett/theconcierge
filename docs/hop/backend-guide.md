# HOP — Backend Guide (for the business owner, not just engineers)

This is a plain-language runbook for the backend tasks that are yours to do directly — setting
values in Vercel, creating the first accounts, deploying, and knowing when it's safe to ask for a
new feature. It assumes no coding background. If a step says "run this command," you're typing it
into a terminal (Terminal on Mac) in the project folder.

If you get stuck on any step here, that's a reasonable thing to hand back to whoever's helping
you with development — but you shouldn't *need* to for anything on this page.

## The two apps, in plain terms

HOP is actually two separate live websites sharing the same database:

1. **theconcierge.life** — the public marketing site plus the app your hospital staff (members)
   and your own admin team log into. This is the `main` branch of the code.
2. **theconcierge-staff.vercel.app** — "HOP ConciergeHub," where your concierge reps and admin
   dispatch team work. This is the `staff-portal` branch of the code.

They share one database, so a person only has one account either way — but the two websites are
deployed separately and don't update at the same time automatically (see "Deploying" below).

## 1. Environment variables (settings Vercel needs to run the app)

Environment variables are configuration values — API keys, secrets, phone numbers — that live in
the Vercel dashboard, not in the code itself. You set these once per project (there are two
projects, one per app above) and they apply until you change them.

**Where**: Vercel dashboard → pick the project (`theconcierge` or `theconcierge-staff`) →
Settings → Environment Variables.

**What each one is for** — full technical detail in `docs/vercel-setup.md`, but here's the short
version of what to have ready and why:

| Variable | Which project(s) | What it's for |
|---|---|---|
| `DATABASE_URL` | both | Connects to the Neon database. Both projects must use the **same** value — that's what makes accounts and data consistent across both apps. |
| `SESSION_HASH_SECRET` | both, same value | Keeps login sessions secure. Changing this logs everyone out — only do it if you have a reason to (e.g. a security concern). |
| `RESEND_API_KEY` | both | Sends emails — welcome emails, password resets, and (on ConciergeHub) the invite email when you create a new concierge account. **Required on ConciergeHub** — without it, inviting a concierge still works but you have to hand them their temporary password yourself instead of them getting an email. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | `theconcierge` only | Lets members connect their Google Calendar. Not needed on ConciergeHub — staff there don't see that feature. |
| `VITE_HOP_DISPATCH_PHONE` | `theconcierge-staff` only | The phone number for the "Call the office" button concierges see. **Changing this requires a redeploy** (it's baked into the app at build time, not read live) — see "Deploying" below. |
| `NOTIFY_EMAIL` | either, optional | Overrides who gets notified about new concierge-request submissions on the public site. |

After changing any environment variable, **redeploy** that project for the change to take effect
(Vercel doesn't apply env var changes to an already-running deployment).

## 2. Creating the database tables (after a schema change)

Whenever a code change adds a new database table or column (you'll be told this happened), it
needs to be applied to the actual database once. This is safe to run more than once — it only
adds things, never deletes.

```bash
export DATABASE_URL="your-database-connection-string"
npm run db:migrate
```

Get the connection string from the Vercel dashboard (Settings → Environment Variables →
`DATABASE_URL`) or from Neon directly if you have access there.

## 3. Creating accounts

- **The first HOP Admin account** (yourself, or whoever runs the dispatch/admin side) — there's
  no signup page for this, it's created from the command line once:
  ```bash
  DATABASE_URL="your-database-connection-string" npm run hop:create-admin
  ```
  It'll prompt you for an email, password, first/last name.

- **Concierge accounts** — created in-app, not the command line. Log in as an admin on
  **theconcierge-staff.vercel.app**, go to Concierges, and add one. If `RESEND_API_KEY` is set up,
  they get an email with a link to set their own password. If not, you'll see a temporary
  password on screen to hand them directly.

- **HOP member accounts** (your hospital staff) — they sign themselves up at
  **theconcierge.life/hop/signup**. No action needed from you.

## 4. Deploying — this is the part that's easy to get wrong

**`theconcierge` (main site) auto-deploys.** Pushing code to the `main` branch on GitHub
automatically updates theconcierge.life within a few minutes. Nothing for you to do.

**`theconcierge-staff` (ConciergeHub) does NOT auto-deploy — on purpose.** This was disconnected
from automatic deployment deliberately, because it was originally set to redeploy on *any* push to
`main`, which would've overwritten ConciergeHub with the wrong version of the app. Whoever is
doing development work will run something like this when ConciergeHub needs updating:

```bash
git worktree add ../staff-portal-worktree staff-portal
cd ../staff-portal-worktree && git pull
npx vercel link --project theconcierge-staff --yes
npx vercel deploy --prod --yes
```

You don't need to run this yourself unless you're comfortable with the command line — just know
that **"I changed something in the code" does not mean ConciergeHub updated automatically.**
If concierges or admins report they're not seeing a new feature that was supposedly shipped,
"has ConciergeHub actually been deployed since then?" is the first thing to check.

## 5. Before asking for a new feature: the 12-function limit

This app runs on Vercel's free "Hobby" plan, which caps each of the two projects at **12 backend
functions** (roughly: 12 distinct "things the server can do"). Both apps currently have a little
room left, but it's not unlimited, and the code has to work around this limit by combining
related features into shared files rather than always adding a new one.

You don't need to track the exact number — just know that:

- This is a real, permanent constraint, not a bug.
- The team's decision so far has been to **stay on the free plan** and design around the limit,
  rather than pay for Vercel Pro (which would remove it, for about $20/month).
- If a big new feature request seems to be taking longer than expected or requires restructuring
  existing code first, this is often why — ask "are we out of function room?" if it comes up.
- If the limit ever becomes a real bottleneck (lots of large new features planned back-to-back),
  revisit the Pro-plan decision — it's a small monthly cost that removes the constraint entirely.

## 6. Quick troubleshooting

- **"A user says they can't log in"**: check `theconcierge`'s environment variables are set
  correctly, especially `DATABASE_URL` and `SESSION_HASH_SECRET`. After 8 failed password
  attempts, an account locks for 15 minutes automatically — that's normal, not a bug.
- **"Password reset emails aren't arriving"**: check `RESEND_API_KEY` is set on the relevant
  project. Without it, reset links are still generated but never emailed.
- **"I changed an environment variable and nothing happened"**: you need to redeploy after
  changing env vars — see "Deploying" above.
- **"Concierge invite email didn't send"**: same as password resets — check `RESEND_API_KEY` on
  `theconcierge-staff` specifically. The temporary password shown on screen when you created the
  account still works even if the email failed.
