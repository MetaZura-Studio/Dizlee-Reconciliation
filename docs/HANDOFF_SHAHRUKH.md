# Handoff: Shahrukh — OpCo Portal

**Full Cursor prompt:** [`02_SHAHRUKH_HANDOFF_PROMPT.md`](../02_SHAHRUKH_HANDOFF_PROMPT.md) — paste the section below the `---` line into Cursor Agent mode.

**Repo:** https://github.com/MetaZura-Studio/Dizlee-Reconciliation

---

## Quick reference

### Your scope
- `app/(opco)/`, `app/api/opco/`, `lib/opco/`, `components/opco/`
- `prisma/schema.prisma` — **Shahrukh block only** (with ERD rules — see below)

### Database (CRITICAL)
- **Source of truth:** [`04_DATABASE_SCHEMA_FOR_CURSOR.md`](../04_DATABASE_SCHEMA_FOR_CURSOR.md)
- All tables **already migrated** — build app code against existing schema
- **Never change the ERD** without explicit approval from Hussnain
- **Never edit** Hussnain's or Haseeb's Prisma blocks

### Git workflow
1. `git checkout develop` → `git pull`
2. `git checkout -b feature/shahrukh-<task>`
3. Work → commit → `git push -u origin feature/shahrukh-<task>`
4. Open PR on GitHub → **`develop`** (not `main`)
5. Wait for CI green → merge → delete branch

### Local setup
See [LOCAL_DATABASE_SETUP.md](./LOCAL_DATABASE_SETUP.md).

```bash
git clone https://github.com/MetaZura-Studio/Dizlee-Reconciliation.git
cd Dizlee-Reconciliation
git checkout develop
cp .env.example .env.local && cp .env.example .env
npm install && npx prisma migrate dev && npm run dev
```
