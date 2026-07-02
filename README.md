# Dizlee Reconciliation Platform

Multi-portal reconciliation platform built with Next.js, Prisma, and MySQL.

## Database schema

The database schema is defined in [`04_DATABASE_SCHEMA_FOR_CURSOR.md`](04_DATABASE_SCHEMA_FOR_CURSOR.md). All Prisma models must match this document exactly.

- **Framework:** Next.js 14+ (App Router, TypeScript, strict mode)
- **Database:** MySQL 8 (local dev) → TiDB Cloud (staging/production, Phase 4)
- **ORM:** Prisma
- **Auth:** NextAuth.js (Phase 2)
- **UI:** Tailwind CSS + shadcn/ui (Phase 2)
- **Testing:** Vitest, React Testing Library, Playwright
- **CI:** GitHub Actions

## Portals

| Portal | Route | Owner | Status |
|--------|-------|-------|--------|
| Admin | `/admin` | Hussnain | Scaffold |
| Partner | `/partner` | Hussnain | Scaffold |
| OpCo | `/opco` | Shahrukh | Placeholder |
| Dizlee | `/dizlee` | Haseeb | Placeholder |
| Auth | `/login` | Hussnain | Placeholder |

## Getting started

### Prerequisites

- Node.js 22+
- Local MySQL 8 on port 3306

See [docs/LOCAL_DATABASE_SETUP.md](docs/LOCAL_DATABASE_SETUP.md) for database setup (no Docker required).

### Run locally

```bash
cp .env.example .env.local
# Edit .env.local with your MySQL credentials

npm install
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Admin portal on a separate port:

```bash
npm run dev:admin
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run dev:admin` | Start dev server for admin (port 3001) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright) |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |

## Repository layout

```
app/
  (admin)/        Hussnain — Admin portal
  (auth)/         Hussnain — Shared auth (login, password reset)
  (partner)/      Hussnain — Partner portal
  (opco)/         Shahrukh — OpCo portal (placeholder)
  (dizlee)/       Haseeb — Dizlee portal (placeholder)
  api/            API route handlers
prisma/
  schema.prisma   Shared schema with 3 developer blocks
lib/
  admin/          Hussnain — Admin auth & logic
  partner/        Hussnain — Partner auth & logic
  opco/           Shahrukh (placeholder)
  dizlee/         Haseeb (placeholder)
components/       Per-portal UI components
tests/            unit/, integration/, e2e/
docs/             Setup guides and developer handoffs
```

## Branch strategy

- `main` — production-ready code (protected, PR + approval required)
- `develop` — integration branch; all feature PRs merge here first

### Branch protection (set manually on GitHub)

- `main`: no direct pushes, requires PR + passing CI + 1 approval
- `develop`: no direct pushes, requires PR + passing CI

## Developer handoffs

- [Shahrukh — OpCo Portal](docs/HANDOFF_SHAHRUKH.md)
- [Haseeb — Dizlee Portal](docs/HANDOFF_HASEEB.md)

## CI/CD

GitHub Actions runs on every push/PR to `main` and `develop`:

- Lint & type-check
- Unit tests
- Production build
- Prisma migration validation (on PRs)

Vercel deploys and TiDB Cloud provisioning are deferred to Phase 4.

## License

MIT — see [LICENSE](LICENSE).
