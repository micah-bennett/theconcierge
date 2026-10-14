# Backend guide (for the person running HOP, not an engineer)

Step-by-step instructions for the things you do in the Vercel and Neon dashboards. An agent
should point you here rather than explain it in chat. Phase 6 of the rebuild finishes this guide
for the four Portal apps. Until then, only the landing site section applies.

## What runs where

- **One Neon database** holds everything: contact-form inquiries and, once built, all Portal
  accounts, requests and jobs.
- **Five Vercel projects** come from the same GitHub repo and the same `main` branch. Each one
  builds a different folder:

  | Vercel project | Folder ("Root Directory") | What it is |
  |---|---|---|
  | `theconcierge` | `apps/site` | Public landing site |
  | `hop-staff` | `apps/staff` | Staff App (created in Phase 6) |
  | `hop-console` | `apps/console` | Concierge Console (created in Phase 6) |
  | `hop-rep` | `apps/rep` | Concierge Rep App (created in Phase 6) |
  | `hop-facility` | `apps/facility` | Facility View (created in Phase 6) |

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

## Database updates

From the repo folder on your computer, with the database address set:

```bash
export DATABASE_URL="postgres://…"   # Neon → your project → Connection string
npm run db:migrate
```

It's always safe to run twice: it only adds things, and it never deletes tables or data.

## Coming in later phases (filled in by Phase 6)

- Creating the four Portal projects and their env vars
- Creating the first Concierge Console account (`npm run hop:create-console-admin`)
- Inviting reps and facility leaders from the Console's Team screen
- Resetting a password, disabling an account
- Deploying and rolling back one app without touching the others, and where to see logs
- Retiring `theconcierge-staff` and the `staff-portal` branch
