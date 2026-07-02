# Vercel and Neon setup

## Required environment variables

Configure these in the Vercel dashboard for Production, Preview, and Development:

- `DATABASE_URL`: pooled Neon connection string.
- `RESEND_API_KEY`: Resend API key for transactional email delivery.
- `AI_GATEWAY_API_KEY`: optional outside Vercel. Production Functions authenticate to Vercel AI Gateway using the automatically supplied OIDC token.
- `AI_MODEL`: optional; defaults to `google/gemini-2.5-flash`.
- `NOTIFY_EMAIL`: optional; overrides the default owner notification address.

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

Vercel deploys pushes to the GitHub production branch automatically. The `vercel.json` rewrite enables React Router deep links, while files under `api/` are deployed as Node.js Functions.
