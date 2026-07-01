# The Concierge

React, TypeScript, and Vite frontend deployed on Vercel, with Vercel Functions and Neon Postgres for backend services.

## Development

```bash
npm install
npm run dev
```

Use `vercel dev` when testing `/api/requests` and `/api/chat` locally.

## Validation

```bash
npm run lint
npm run build
```

## Backend

- `api/requests.ts`: validates requests, stores them in Neon, and sends emails.
- `api/chat.ts`: server-side Gemini concierge assistant.
- `db/schema.sql`: idempotent Postgres schema.
- `.env.example`: required server-only environment variables.

See [docs/vercel-setup.md](docs/vercel-setup.md) for deployment and migration instructions.
