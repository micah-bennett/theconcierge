# Vercel and Neon setup

## Required environment variables

Configure these in Vercel for Production, Preview, and Development as appropriate:

- `DATABASE_URL`: pooled Neon connection string.
- `AI_GATEWAY_API_KEY`: optional outside Vercel. Production Functions authenticate to Vercel AI Gateway using the automatically supplied OIDC token.
- `AI_MODEL`: optional; defaults to `google/gemini-2.5-flash`.
- `SMTP_PASS`: Google App Password for the SMTP account.
- `SMTP_USER`, `SMTP_FROM`, `SMTP_HOST`, `SMTP_PORT`, `NOTIFY_EMAIL`, `CONCIERGE_BRAND`: optional overrides documented in `.env.example`.

These are server-only variables. Never prefix them with `VITE_`.

## Create or update the database

```bash
export DATABASE_URL='your-pooled-neon-connection-string'
npm run db:migrate
```

The schema migration is idempotent and can be safely rerun.

## Local full-stack development

```bash
vercel env pull .env.local
vercel dev
```

The plain Vite development server does not execute the functions under `/api`.

## Deployment

Vercel deploys pushes to the GitHub production branch. The `vercel.json` rewrite enables React Router deep links, while files under `api/` are deployed as Node.js Functions.

## Firebase retirement

The website no longer imports the Firebase browser SDK. The old `functions/`, `firebase.json`, `firestore.rules`, and `docs/firebase-setup.md` files are retained temporarily as migration history and rollback material. Do not use the old Firebase deployment script for new releases.

After production request storage, email delivery, chat, and historical data are verified in Neon, remove the legacy Firebase material in a separate cleanup commit.
