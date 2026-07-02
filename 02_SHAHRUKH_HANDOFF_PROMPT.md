# Cursor prompt — Shahrukh (OpCo Portal)

**Repo:** https://github.com/MetaZura-Studio/Dizlee-Reconciliation

---

## Before opening Cursor — run this in your terminal

```bash
git clone https://github.com/MetaZura-Studio/Dizlee-Reconciliation.git
cd Dizlee-Reconciliation
git checkout develop
git pull origin develop
git checkout -b feature/shahrukh-opco-setup
cp .env.example .env.local
cp .env.example .env
# Edit both files — set DATABASE_URL with your local MySQL password
# URL-encode special chars in password (e.g. @ becomes %40)
npm install
npx prisma migrate dev
npm run dev
```

Confirm the app runs at `http://localhost:3000/opco` before continuing.

**Local database:** Each developer runs their **own** local MySQL on their Mac (no Docker, no shared cloud DB). See `docs/LOCAL_DATABASE_SETUP.md` for MySQL install steps.

---

## Then paste everything below into Cursor's chat (Agent mode), opened in this repo

---

I am Shahrukh, one of three developers on the **Dizlee Reconciliation Platform**. The repo has been bootstrapped by Hussnain with Next.js, Prisma, Tailwind, CI/CD, the full database schema, and placeholder portals. I am building **the OpCo Portal** only. I do not touch code outside my own folders.

## Database / ERD rules (CRITICAL — read before writing any code)

The **single source of truth** for the database is:

```
04_DATABASE_SCHEMA_FOR_CURSOR.md
```

**All 27 tables are already defined and migrated** — including my tables (`reports`, `report_line_items`, `report_change_requests`, `consolidations`, `consolidation_items`). The Prisma models already exist in `prisma/schema.prisma`.

### What I must NEVER do without explicit approval from Hussnain

- Change any column name, type, constraint, or index defined in the ERD
- Modify tables in Hussnain's block (`lookup_types`, `users`, `opcos`, `partners`, etc.)
- Modify tables in Haseeb's block (`reconciliations`, `invoices`, etc.)
- Revert any **[FIX APPLIED]** items documented in `04_DATABASE_SCHEMA_FOR_CURSOR.md`
- Add new tables or columns on my own — **ask Hussnain explicitly first**
- Run `prisma migrate` that alters anything outside my comment block without approval

### What I CAN do

- **Read** Hussnain's and Haseeb's tables via Prisma queries (read-only)
- **Edit** only inside my Prisma block: `// ===== SHAHRUKH: OpCo Portal models =====` — and only if Hussnain has explicitly approved a change
- **Build** screens, API routes, and business logic in my own folders against the existing schema
- Write **new migrations** only for changes inside my block that Hussnain has approved

If Cursor suggests changing the database schema, **stop and ask Hussnain before applying**. Do not improvise schema changes.

---

## My ownership boundary (do not cross these)

| Folder / file | I own it? |
|---------------|-----------|
| `app/(opco)/` | Yes — all my screens |
| `app/api/opco/` | Yes — all my API routes |
| `lib/opco/` | Yes — my auth check, validation, utilities |
| `components/opco/` | Yes — my own UI components |
| `prisma/schema.prisma` — Shahrukh block only | Yes — read/write only with ERD rules above |
| `app/(admin)/`, `app/(partner)/`, `app/(dizlee)/` | **No — never touch** |
| `lib/admin/`, `lib/partner/`, `lib/dizlee/` | **No — never touch** |
| `components/admin/`, `components/partner/`, `components/dizlee/` | **No — never touch** |
| Hussnain's or Haseeb's Prisma blocks | **No — never touch** |

Do NOT import from `components/admin/`, `components/partner/`, or `lib/admin/`. Build my own minimal scoped versions.

I never wait on Hussnain or Haseeb to finish. If I need their tables, I query them read-only.

---

## Tech stack (already set up — do not reinitialize)

Next.js 16 App Router, TypeScript strict, Prisma + local MySQL (TiDB-compatible schema), Tailwind CSS, React Hook Form + Zod, TanStack Table + TanStack Query, ExcelJS, Vitest + Playwright.

---

## Git & GitHub workflow (follow exactly)

### Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — **never push here directly** |
| `develop` | Integration — **never push here directly** (protected) |
| `feature/shahrukh-*` | My work branches — **always branch from `develop`** |

### Every task — step by step

```bash
# 1. Start from latest develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/shahrukh-upload-report

# 3. Build, commit often
git add .
git commit -m "feat(opco): add report upload screen"

# 4. Push feature branch to GitHub
git push -u origin feature/shahrukh-upload-report

# 5. On GitHub: Open Pull Request → base: develop ← compare: feature/shahrukh-upload-report
# 6. Wait for CI to pass (Lint, Unit Tests, Build — all must be green)
# 7. Request review from Hussnain or Haseeb
# 8. Merge PR on GitHub (do not merge locally)
# 9. Delete feature branch after merge

# 10. Start next task from develop again
git checkout develop
git pull origin develop
git checkout -b feature/shahrukh-next-task
```

### Rules

- **Never** push directly to `develop` or `main`
- **Never** force push (`git push --force`)
- One branch per use case: `feature/shahrukh-<short-description>`
- PRs always target **`develop`**, never `main`
- Pull `develop` before starting each new branch
- If CI fails on my PR, fix on the same feature branch and push again — CI re-runs automatically
- When Hussnain's or Haseeb's PRs merge to `develop`, run `npx prisma migrate dev` locally to stay in sync

### Using GitHub Desktop (alternative to terminal)

1. **Current Branch** → select `develop` → **Pull origin**
2. **Branch** → **New Branch** → `feature/shahrukh-upload-report`
3. Make changes → commit with message → **Push origin**
4. GitHub website → **Compare & pull request** → base: `develop`
5. Wait for CI green → Merge → delete branch

---

## 1. My own auth check

In `lib/opco/auth.ts`, write my own session/role check scoped to the OPCO role. Reference the existing `users` table (do not redefine it). Verify session has OPCO role and `opcoId` set; redirect to login otherwise.

---

## 2. Database — use existing schema, do not recreate

My Prisma models **already exist** in `prisma/schema.prisma` under the Shahrukh block:

- `reports`
- `report_line_items`
- `report_change_requests`
- `consolidations`
- `consolidation_items`

Match `04_DATABASE_SCHEMA_FOR_CURSOR.md` exactly. **Do not run a new init migration.** Only run `npx prisma migrate dev` if Hussnain approved a change to my block.

---

## 3. Build these use cases, in this order

### Phase 1 — Auth + navigation
- UC-01-OPCO: Access Side Navigation Bar (Dashboard, Upload Report, Reports history, Invoices, Notifications; footer Settings)
- Login/role redirect using my own auth check

### Phase 2 — Reports
- UC-02-OPCO: View Dashboard (OpCo)
- UC-03-OPCO: Upload Report (OpCo) — Excel upload, partner dropdown from `opco_partner_links` (read-only)
- UC-04-OPCO: Request Report Upload (OpCo)
- UC-05-OPCO / UC-06-OPCO: View Reports (OpCo) — paginated grid, filters

### Phase 3 — Invoices (view + acknowledge only)
- UC-08-OPCO: View and respond to invoices (OpCo)
- UC-07-OPCO: Print Invoice (OpCo)

### Phase 4 — Consolidation
- UC-6B: Consolidation (OpCo monthly) — aggregation + Excel export into `consolidations`/`consolidation_items`

### Phase 5 — Self-QA
- Unit tests for report upload validation and consolidation aggregation
- Integration test per API route I built

---

## 4. When I'm done

Stop and coordinate with Hussnain for joint QA / UAT. Do not merge `develop` → `main` myself.
