# HOP

HOP (Hospitality On-Site Professionals): the public landing site plus the four HOP Portal apps,
in one npm-workspaces monorepo. Each app is deployed to its own Vercel project, and all of them
share one Neon Postgres database.

| Folder | What it is | Stack |
|---|---|---|
| `apps/site` | Public landing site. `/portal` links to the four apps | Vite + React, Vercel Functions |
| `apps/staff` | Staff App, for nurses, doctors and every healthcare professional | Next.js |
| `apps/console` | Concierge Console, for the HOP dispatch team | Next.js |
| `apps/rep` | Concierge Rep App, for HOP field reps | Next.js |
| `apps/facility` | Facility View, for hospital leaders (unit totals only) | Next.js |
| `packages/shared` | Types, brand, validation, DB store, auth, shared UI | TypeScript |

**Agents: read [CLAUDE.md](CLAUDE.md) first.** It routes you to `docs/`. The build is being done
in phases; see [docs/rebuild/README.md](docs/rebuild/README.md) for status.

## Development

```bash
npm install            # once, from the repo root (installs every workspace)
npm run dev:site       # landing site on http://localhost:5173
npm run lint
npm run build:site
```

Run each Portal app with `npm run dev -w @hop/<staff|console|rep|facility>`, once its phase has
been built. Database changes: `npm run db:migrate` (needs `DATABASE_URL`).
