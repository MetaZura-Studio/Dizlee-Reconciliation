# Handoff: Shahrukh — OpCo Portal

**Full Cursor prompt:** [`02_SHAHRUKH_HANDOFF_PROMPT.md`](../02_SHAHRUKH_HANDOFF_PROMPT.md) — paste the section below the `---` line into Cursor Agent mode.

**Repo:** https://github.com/MetaZura-Studio/Dizlee-Reconciliation

---

## Quick reference

### Your scope (OpCo + Partner)
- **OpCo:** `app/(opco)/`, `app/api/opco/`, `lib/opco/`, `components/opco/`
- **Partner:** `app/(partner)/`, `app/api/partner/`, `lib/partner/`, `components/partner/` — see [`HANDOFF_SHAHRUKH_PARTNER.md`](./HANDOFF_SHAHRUKH_PARTNER.md)
- `prisma/schema.prisma` — **Shahrukh block only** (ERD rules — never change without Hussnain approval)

### NOT your scope
- **UC-6B Consolidation** — Dizlee (Haseeb). You only upload reports that consolidation reads.
- **Shared login / NextAuth** — Hussnain built this; see **Auth (already done)** below
- Admin, Dizlee portals — never touch

### Auth (already done)

**Hussnain built:** `/login`, NextAuth (`app/api/auth/`), `middleware.ts`, seed users.  
**You build:** `lib/opco/auth.ts` only — read session via `getServerSession(authOptions)`, verify `role === "opco"` + `opcoId`.  
**Do not rebuild** login or NextAuth. Details: [`AUTH_SESSION.md`](./AUTH_SESSION.md)

| Dev login | Password |
|-----------|----------|
| `zain-jordan@dizlee.com` (OpCo) | `Password123!` |
| `spotify@dizlee.com` (Partner) | `Password123!` |

See `docs/SEED_DATA.md` for full slug-based logins.

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
| Phase | OpCo UCs | Partner UCs |
|-------|----------|-------------|
| Nav + auth | UC-01-OPCO | UC-01-PARTNER — [`HANDOFF_SHAHRUKH_PARTNER.md`](./HANDOFF_SHAHRUKH_PARTNER.md) |
| Dashboard + reports | UC-02–06-OPCO, Replace upload | UC-02–05-PARTNER, Replace upload |
| Invoices | UC-07–08-OPCO (view/ack only) | UC-06–07-PARTNER (upload + lifecycle) |
| Notifications | OpCo inbox | Partner inbox |

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
