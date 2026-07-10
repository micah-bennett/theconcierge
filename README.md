# The Concierge

React, TypeScript, and Vite frontend deployed on Vercel, with Vercel Functions and Neon Postgres for backend services.

## Development

```bash
npm install
npm run dev
```

Use `vercel dev` when testing `/api/requests`, `/api/chat`, or any `/api/hop/*` route locally.

## Validation

```bash
npm run lint
npm run build
```

## Backend

- `api/requests.ts`: validates requests, stores them in Neon, and sends emails.
- `api/chat.ts`: server-side Gemini concierge assistant.
- `api/hop/**`: HOP login, service requests, admin, and Google Calendar integration APIs.
- `db/schema.sql`: idempotent Postgres schema.
- `.env.example`: required server-only environment variables.

See [docs/vercel-setup.md](docs/vercel-setup.md) for deployment and migration instructions.

## HOP

HOP (`/hop`) is a concierge product for healthcare staff with its own login (`/hop/login`,
`/hop/signup`) and admin (`/hop/admin/login`) accounts. See `docs/hop/vision.md`,
`docs/hop/architecture.md`, and `docs/hop/mvp-scope.md` before adding a HOP feature — they're
kept up to date with what's actually built vs. stubbed.

To create the first admin account:

```bash
DATABASE_URL="..." npm run hop:create-admin
```
