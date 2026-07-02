# Handoff: Haseeb — Dizlee Portal

**Full Cursor prompt:** [`03_HASEEB_HANDOFF_PROMPT.md`](../03_HASEEB_HANDOFF_PROMPT.md) — paste the section below the `---` line into Cursor Agent mode.

**Repo:** https://github.com/MetaZura-Studio/Dizlee-Reconciliation

---

## Quick reference

### Your scope
- `app/(dizlee)/`, `app/api/dizlee/`, `lib/dizlee/`, `components/dizlee/`
- `prisma/schema.prisma` — **Haseeb block only** (ERD rules — never change without Hussnain approval)

### Full Dizlee ownership includes
- **UC-6B Consolidation** (Generate, History, Excel) — SRS actor is Dizlee, not OpCo
- Reupload approve/reject, monitoring tabs, create OpCo invoice, Reporting page

### Database (CRITICAL)
- **Source of truth:** [`04_DATABASE_SCHEMA_FOR_CURSOR.md`](../04_DATABASE_SCHEMA_FOR_CURSOR.md)
- All tables **already migrated** — build against existing schema
- **Never change the ERD** without explicit approval from Hussnain
- You may **write at runtime** to `consolidations` / `consolidation_items` (UC-6B) without editing their Prisma model definitions

### Work independently
- Run `npm run seed` after migrate
- Mock `reports` locally until Shahrukh's upload UI exists
- See [`USE_CASE_OWNERSHIP.md`](./USE_CASE_OWNERSHIP.md)

### Your use cases (summary)
| Phase | UCs |
|-------|-----|
| Nav + dashboard | UC-01-CLIENT, UC-02 |
| Reports | UC-03 + Reupload requests + Reports monitoring |
| Reconciliation | UC-06 |
| Invoices | UC-04, Create OpCo invoice, UC-05, UC-5B, Lifecycle, Invoice monitoring |
| Consolidation | **UC-6B (full)** |
| Notifications | UC-07, UC-08, UC-09, UC-9A, inbox |
| Reporting | Reporting page |

### Git workflow
1. `git checkout develop` → `git pull`
2. `git checkout -b feature/haseeb-<task>`
3. Work → commit → `git push -u origin feature/haseeb-<task>`
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
