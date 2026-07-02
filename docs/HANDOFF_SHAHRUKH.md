# Handoff: Shahrukh — OpCo Portal

**Full Cursor prompt:** [`02_SHAHRUKH_HANDOFF_PROMPT.md`](../02_SHAHRUKH_HANDOFF_PROMPT.md) — paste the section below the `---` line into Cursor Agent mode.

**Repo:** https://github.com/MetaZura-Studio/Dizlee-Reconciliation

---

## Quick reference

### Your scope
- `app/(opco)/`, `app/api/opco/`, `lib/opco/`, `components/opco/`
- `prisma/schema.prisma` — **Shahrukh block only** (ERD rules — never change without Hussnain approval)

### NOT your scope
- **UC-6B Consolidation** — Dizlee (Haseeb). You only upload reports that consolidation reads.
- **Shared login / NextAuth** — Hussnain built this; see **Auth (already done)** below
- Admin, Partner, Dizlee portals — never touch

### Auth (already done)

**Hussnain built:** `/login`, NextAuth (`app/api/auth/`), `middleware.ts`, seed users.  
**You build:** `lib/opco/auth.ts` only — read session via `getServerSession(authOptions)`, verify `role === "opco"` + `opcoId`.  
**Do not rebuild** login or NextAuth. Details: [`AUTH_SESSION.md`](./AUTH_SESSION.md)

| Dev login | Password |
|-----------|----------|
| `opco@dizlee.com` | `Password123!` |

### Database (CRITICAL)
- **Source of truth:** [`04_DATABASE_SCHEMA_FOR_CURSOR.md`](../04_DATABASE_SCHEMA_FOR_CURSOR.md)
- All tables **already migrated** — build app code against existing schema
- **Never change the ERD** without explicit approval from Hussnain
- Cursor must **ask Hussnain** before any schema change

### Work independently
- Run `npm run seed` after migrate for local test data
- Read Hussnain/Haseeb tables via Prisma (read-only)
- Do not wait for other developers — see [`USE_CASE_OWNERSHIP.md`](./USE_CASE_OWNERSHIP.md)

### Your use cases (summary)
| Phase | UCs |
|-------|-----|
| Nav + auth | UC-01-OPCO |
| Reports | UC-02–06-OPCO, Replace upload after approval |
| Invoices | UC-07–08-OPCO (view/ack only) |
| Notifications | OpCo inbox (read/dismiss) |

### Git workflow
1. `git checkout develop` → `git pull`
2. `git checkout -b feature/shahrukh-<task>`
3. Work → commit → `git push -u origin feature/shahrukh-<task>`
4. Open PR on GitHub → **`develop`**
5. Wait for CI green → merge → delete branch

### Local setup

```bash
git clone https://github.com/MetaZura-Studio/Dizlee-Reconciliation.git
cd Dizlee-Reconciliation
git checkout develop
cp .env.example .env.local && cp .env.example .env
npm install && npx prisma migrate dev && npm run seed && npm run dev
```

See [LOCAL_DATABASE_SETUP.md](./LOCAL_DATABASE_SETUP.md).
