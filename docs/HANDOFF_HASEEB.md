# Handoff: Haseeb — Dizlee Portal

> Placeholder. Full handoff prompt will be added before onboarding.

## Repo

https://github.com/MetaZura-Studio/Dizlee-Reconciliation

## Your scope

- `app/(dizlee)/` — Dizlee portal routes and pages
- `app/api/dizlee/` — Dizlee API routes
- `lib/dizlee/` — Dizlee business logic
- `components/dizlee/` — Dizlee UI components
- `prisma/schema.prisma` — **Haseeb block only** (`// ===== HASEEB: Dizlee Portal models =====`)

## Local setup

See [LOCAL_DATABASE_SETUP.md](./LOCAL_DATABASE_SETUP.md).

```bash
git clone https://github.com/MetaZura-Studio/Dizlee-Reconciliation.git
cd Dizlee-Reconciliation
git checkout develop
cp .env.example .env.local
# edit .env.local with your local MySQL credentials
npm install
npx prisma migrate dev
npm run dev
```

## Rules

- Do **not** edit Hussnain's folders (`app/(admin)/`, `app/(partner)/`, `lib/admin/`, etc.)
- Do **not** edit Shahrukh's folders (`app/(opco)/`, `lib/opco/`, etc.)
- Only edit your Prisma comment block in `schema.prisma`
- Open PRs into `develop`, not `main`
