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
npm run seed
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

**All 27 tables are already defined and migrated.** The Prisma models already exist in `prisma/schema.prisma`. I build application code against this schema — I do not redesign it.

### What I must NEVER do without explicit approval from Hussnain

- Change any column name, type, constraint, or index defined in the ERD
- Modify tables in Hussnain's block (`lookup_types`, `users`, `opcos`, `partners`, `notifications`, etc.)
- Modify tables in Haseeb's block (`reconciliations`, `invoices`, etc.)
- Modify `consolidations` / `consolidation_items` model definitions (owned by Haseeb for implementation per SRS — see `docs/USE_CASE_OWNERSHIP.md`)
- Revert any **[FIX APPLIED]** items documented in `04_DATABASE_SCHEMA_FOR_CURSOR.md`
- Add new tables or columns on my own — **ask Hussnain explicitly first**
- Run `prisma migrate` that alters anything outside my comment block without approval

**If Cursor suggests changing the ERD or Prisma schema, stop and ask Hussnain before applying. Do not improvise schema changes.**

### What I CAN do

- **Read** Hussnain's and Haseeb's tables via Prisma queries (read-only)
- **Edit** only inside my Prisma block: `// ===== SHAHRUKH: OpCo Portal models =====` — and only if Hussnain has explicitly approved a change
- **Build** screens, API routes, and business logic in my own folders against the existing schema
- Write **new migrations** only for changes inside my block that Hussnain has approved

---

## Work independently (do not wait on other developers)

| Principle | What it means for me |
|-----------|----------------------|
| **No blocking** | I never wait for Hussnain or Haseeb to finish their portals |
| **Read-only cross-team data** | I query `users`, `opcos`, `partners`, `opco_partner_links`, `lookups`, `notifications`, etc. read-only |
| **Local seed data** | Run `npm run seed` after migrate — seed provides OpCos, partners, links, and lookup values for local dev |
| **Mock when needed** | If another portal's UI is not built yet, I can insert test rows via seed or Prisma Studio in my local DB |
| **Consolidation is NOT mine** | UC-6B is a **Dizlee** feature (Haseeb). I only ensure OpCo report upload produces complete `report_line_items` |

Full SRS → developer mapping: `docs/USE_CASE_OWNERSHIP.md`

---

## My ownership boundary (do not cross these)

| Folder / file | I own it? |
|---------------|-----------|
| `app/(opco)/` | Yes — all my screens |
| `app/api/opco/` | Yes — all my API routes |
| `lib/opco/` | Yes — my auth check, validation, utilities |
| `components/opco/` | Yes — my own UI components |
| `prisma/schema.prisma` — Shahrukh block only | Yes — read/write model definitions only with ERD rules above |
| `app/(admin)/`, `app/(partner)/`, `app/(dizlee)/`, `app/(auth)/` | **No — never touch** |
| `lib/admin/`, `lib/partner/`, `lib/dizlee/` | **No — never touch** |
| `components/admin/`, `components/partner/`, `components/dizlee/` | **No — never touch** |
| Hussnain's or Haseeb's Prisma blocks | **No — never touch** |

Do NOT import from `components/admin/`, `components/partner/`, or `lib/admin/`. Build my own minimal scoped versions.

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

---

## 1. My own auth check

In `lib/opco/auth.ts`, write my own session/role check scoped to the OPCO role. Reference the existing `users` table (do not redefine it). Verify session has OPCO role and `opcoId` set; redirect to login otherwise.

---

## 2. Database — use existing schema, do not recreate

My Prisma models **already exist** in `prisma/schema.prisma` under the Shahrukh block:

- `reports`
- `report_line_items`
- `report_change_requests`

Match `04_DATABASE_SCHEMA_FOR_CURSOR.md` exactly. **Do not run a new init migration.** Only run `npx prisma migrate dev` if Hussnain approved a change to my block.

**Note:** `consolidations` and `consolidation_items` also live in my Prisma block for FK reasons (they reference `reports`), but **Haseeb implements UC-6B** in the Dizlee portal. I do not build consolidation screens or aggregation logic.

---

## 3. Build these use cases, in this order

Reference SRS: `SRS_Reconciliation_Professional.docx`. Full ownership map: `docs/USE_CASE_OWNERSHIP.md`.

### Phase 1 — Auth + navigation
- UC-01-OPCO: Access Side Navigation Bar (Dashboard, Upload Report, Reports history, Invoices, Notifications; footer Settings)
- Shared login at `/login` is already implemented — see [`docs/AUTH_SESSION.md`](../docs/AUTH_SESSION.md)
- Implement `lib/opco/auth.ts` using `getServerSession(authOptions)`; verify OPCO role + `opcoId`

### Phase 2 — Dashboard + Reports
- UC-02-OPCO: View Dashboard (OpCo) — period-scoped partner submission summary
- UC-03-OPCO: Upload Report (OpCo) — Excel upload, partner dropdown from `opco_partner_links` (read-only)
- UC-04-OPCO: Request Report Upload (OpCo) — submit reupload request into `report_change_requests`; notify Dizlee via `notifications` (read Hussnain's tables)
- UC-05-OPCO: View Reports (OpCo) — paginated grid, filters, detail modal
- UC-06-OPCO: Find reports in Reports history — period/sort filters
- **Replace upload (follow-on to UC-04):** After Dizlee approves a reupload request, show **Reupload corrected file** action on the report row; replace file + line items once; mark request COMPLETED

### Phase 3 — Invoices (view + acknowledge only — OpCo does NOT upload invoices)
- UC-08-OPCO: View and respond to invoices (OpCo) — list Dizlee → OpCo invoices; auto-acknowledge on detail open
- UC-07-OPCO: Print Invoice (OpCo)

### Phase 4 — Notifications inbox
- OpCo Notifications inbox (SRS: OpCo nav + header bell → Inbox tab)
- List notifications where current user is a recipient (`notification_recipients`, `notification_reads` — read Hussnain's tables)
- View detail (subject, body, attachments), mark read, dismiss/remove from inbox
- **I do NOT compose/send notifications** — that is Dizlee (Haseeb)

### Phase 5 — Self-QA
- Unit tests for report upload validation, Excel parsing, and reupload request rules
- Integration test per API route I built

---

## 4. When I'm done

Stop and coordinate with Hussnain for joint QA / UAT. Do not merge `develop` → `main` myself.
