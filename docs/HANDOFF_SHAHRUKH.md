# Handoff: Shahrukh — OpCo Portal

> Placeholder. Full handoff prompt will be added before onboarding.

## Repo

https://github.com/MetaZura-Studio/Dizlee-Reconciliation

## Your scope

- `app/(opco)/` — OpCo portal routes and pages
- `app/api/opco/` — OpCo API routes
- `lib/opco/` — OpCo business logic
- `components/opco/` — OpCo UI components
- `prisma/schema.prisma` — **Shahrukh block only** (`// ===== SHAHRUKH: OpCo Portal models =====`)

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
- Do **not** edit Haseeb's folders (`app/(dizlee)/`, `lib/dizlee/`, etc.)
- Only edit your Prisma comment block in `schema.prisma`
- Open PRs into `develop`, not `main`
