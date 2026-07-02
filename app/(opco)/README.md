# OpCo Portal — Shahrukh

Owned by Shahrukh. Full handoff: [`docs/HANDOFF_SHAHRUKH.md`](../../docs/HANDOFF_SHAHRUKH.md)

## Local dev environment (Step 0)

Branch: `feature/shahrukh-local-setup`

### Setup checklist

| Step | Command / action | Status |
|------|------------------|--------|
| Clone + checkout `develop` | `git pull origin develop` | Done |
| Create branch | `git checkout -b feature/shahrukh-local-setup` | Done |
| Env files | `cp .env.example .env` and `.env.local` | Done |
| Install | `npm install` | Done |
| Migrate | `npx prisma migrate dev` | Done |
| Seed | `npm run seed` | Done |
| Dev server | `npm run dev` | Run `npm run dev` then open `/login` |
| OpCo login | `http://localhost:3000/login` | `opco@dizlee.com` / `Password123!` |
| CI locally | `npm run lint && npm run typecheck && npm run test && npm run build` | Done (all green) |

### Windows notes

- Install [MySQL 8.0](https://dev.mysql.com/downloads/mysql/) and create database: `CREATE DATABASE dizlee_dev;`
- Add MySQL `bin` to PATH if you want the `mysql` CLI (optional — Prisma does not require it)
- URL-encode special characters in `DATABASE_URL` (e.g. `@` → `%40`)
- Prisma CLI reads `.env`; Next.js reads `.env.local` — keep both in sync

### Seed login (after `npm run seed`)

| Email | Password | Portal |
|-------|----------|--------|
| `opco@dizlee.com` | `Password123!` | `/opco` |

See [`docs/AUTH_SESSION.md`](../../docs/AUTH_SESSION.md) for full session contract.

### Finish Step 0 locally

```powershell
# 1. Edit .env and .env.local — set DATABASE_URL, e.g.:
# DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/dizlee_dev"

npx prisma migrate dev
npm run seed
npm run dev
# Open http://localhost:3000/login → sign in as opco@dizlee.com
```

Then push: `git push -u origin feature/shahrukh-local-setup` and open PR → `develop`.
