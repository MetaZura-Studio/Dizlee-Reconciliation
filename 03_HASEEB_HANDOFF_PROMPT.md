# Cursor prompt — Haseeb (Dizlee Portal)

**Repo:** https://github.com/MetaZura-Studio/Dizlee-Reconciliation

---

## Before opening Cursor — run this in your terminal

```bash
git clone https://github.com/MetaZura-Studio/Dizlee-Reconciliation.git
cd Dizlee-Reconciliation
git checkout develop
git pull origin develop
git checkout -b feature/haseeb-dizlee-setup
cp .env.example .env.local
cp .env.example .env
# Edit both files — set DATABASE_URL with your local MySQL password
# URL-encode special chars in password (e.g. @ becomes %40)
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

Confirm the app runs at `http://localhost:3000/dizlee` before continuing.

**Local database:** Each developer runs their **own** local MySQL on their Mac (no Docker, no shared cloud DB). See `docs/LOCAL_DATABASE_SETUP.md` for MySQL install steps.

---

## Then paste everything below into Cursor's chat (Agent mode), opened in this repo

---

I am Haseeb, one of three developers on the **Dizlee Reconciliation Platform**. The repo has been bootstrapped by Hussnain with Next.js, Prisma, Tailwind, CI/CD, the full database schema, and placeholder portals. I am building **the Dizlee Portal** only. I do not touch code outside my own folders.

## Database / ERD rules (CRITICAL — read before writing any code)

The **single source of truth** for the database is:

```
04_DATABASE_SCHEMA_FOR_CURSOR.md
```

**All 27 tables are already defined and migrated.** The Prisma models already exist in `prisma/schema.prisma`. I build application code against this schema — I do not redesign it.

### What I must NEVER do without explicit approval from Hussnain

- Change any column name, type, constraint, or index defined in the ERD
- Modify tables in Hussnain's block (`lookup_types`, `users`, `opcos`, `app_settings`, etc.) — **model definitions**
- Modify tables in Shahrukh's block (`reports`, `report_line_items`, `report_change_requests`) — **model definitions**
- Revert any **[FIX APPLIED]** items documented in `04_DATABASE_SCHEMA_FOR_CURSOR.md`
- Add new tables or columns on my own — **ask Hussnain explicitly first**
- Run `prisma migrate` that alters anything outside my comment block without approval

**If Cursor suggests changing the ERD or Prisma schema, stop and ask Hussnain before applying. Do not improvise schema changes.**

### What I CAN do

- **Read** Hussnain's and Shahrukh's tables via Prisma queries (read-only for their owned write paths)
- **Write at runtime** to `consolidations` / `consolidation_items` from my Dizlee API routes (UC-6B) — tables are in Shahrukh's Prisma block for FK reasons, but SRS actor is Dizlee; I do not edit those model definitions
- **Write at runtime** to `report_change_requests` for approve/reject (reupload workflow) — read Shahrukh's `reports` for context
- **Edit** only inside my Prisma block: `// ===== HASEEB: Dizlee Portal models =====` — and only if Hussnain has explicitly approved a change
- **Build** screens, API routes, and business logic in my own folders against the existing schema
- Write **new migrations** only for changes inside my block that Hussnain has approved

---

## Work independently (do not wait on other developers)

| Principle | What it means for me |
|-----------|----------------------|
| **No blocking** | I never wait for Hussnain or Shahrukh to finish their portals |
| **Read-only cross-team data** | I query `reports`, `report_line_items`, `opco_partner_links`, `app_settings`, etc. read-only where they own the write path |
| **Local seed data** | Run `npm run seed` after migrate — provides OpCos, partners, links, settings, and lookups |
| **Mock reports for consolidation/reconciliation** | Insert test `reports` + `report_line_items` via seed or Prisma Studio in my local DB until Shahrukh's upload UI exists |
| **Notifications** | I compose/send via Hussnain's `notifications` tables — I build Dizlee UI + API in my folders, writing to shared notification tables at runtime |

Full SRS → developer mapping: `docs/USE_CASE_OWNERSHIP.md`

---

## My ownership boundary (do not cross these)

| Folder / file | I own it? |
|---------------|-----------|
| `app/(dizlee)/` | Yes — all my screens |
| `app/api/dizlee/` | Yes — all my API routes |
| `lib/dizlee/` | Yes — my auth check, validation, utilities |
| `components/dizlee/` | Yes — my own UI components |
| `prisma/schema.prisma` — Haseeb block only | Yes — read/write model definitions only with ERD rules above |
| `app/(admin)/`, `app/(partner)/`, `app/(opco)/`, `app/(auth)/` | **No — never touch** |
| `lib/admin/`, `lib/partner/`, `lib/opco/` | **No — never touch** |
| `components/admin/`, `components/partner/`, `components/opco/` | **No — never touch** |
| Hussnain's or Shahrukh's Prisma blocks | **No — never edit model definitions** |

Do NOT import from other developers' `components/` or `lib/` folders. Build my own minimal scoped versions.

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
| `feature/haseeb-*` | My work branches — **always branch from `develop`** |

### Every task — step by step

```bash
git checkout develop && git pull origin develop
git checkout -b feature/haseeb-reconciliation
# ... work, commit, push ...
# Open PR → develop, wait for CI green, merge on GitHub
```

### Rules

- **Never** push directly to `develop` or `main`
- **Never** force push
- One branch per use case: `feature/haseeb-<short-description>`
- PRs always target **`develop`**
- When others' PRs merge, run `npx prisma migrate dev` locally

---

## 1. My own auth check

In `lib/dizlee/auth.ts`, write my own session/role check scoped to the CLIENT (Dizlee) role. Reference the existing `users` table (do not redefine it). Verify session has CLIENT role; redirect to login otherwise.

---

## 2. Database — use existing schema, do not recreate

My Prisma models **already exist** in `prisma/schema.prisma` under the Haseeb block:

- `reconciliations`
- `reconciliation_items`
- `invoices`
- `invoice_items`
- `invoice_activity_logs`

Match `04_DATABASE_SCHEMA_FOR_CURSOR.md` exactly — including:
- `reconciliation_items.confirmed_value` is **nullable** (set after reconciliation runs)
- `invoices` unique key is `UNIQUE(opco_id, partner_id, month, year, invoice_type_id)`
- All FK columns are **BIGINT** matching referenced PKs

**Consolidation tables** (`consolidations`, `consolidation_items`) are defined in Shahrukh's Prisma block but **I implement UC-6B entirely** in the Dizlee portal.

**Do not run a new init migration.** Only run `npx prisma migrate dev` if Hussnain approved a change to my block.

---

## 3. Build these use cases, in this order

Reference SRS: `SRS_Reconciliation_Professional.docx`. Full ownership map: `docs/USE_CASE_OWNERSHIP.md`.

### Phase 1 — Auth + navigation
- UC-01-CLIENT: Access Side Navigation Bar (Dashboard, Reports history, Invoices, Reconciliation, Consolidation, Notifications, Reporting)
- Shared login at `/login` is already implemented — see [`docs/AUTH_SESSION.md`](../docs/AUTH_SESSION.md)
- Implement `lib/dizlee/auth.ts` using `getServerSession(authOptions)`; verify CLIENT role
- Header notifications bell → Notifications inbox tab

### Phase 2 — Dashboard
- UC-02: View Dashboard (Dizlee) — billing KPIs, report monitoring cards, reconciliation overview, recent uploads

### Phase 3 — Reports (read + approve)
- UC-03: View Reports (Dizlee) — Reports tab: filter, sort, paginate, view detail
- **Reupload requests tab** — list pending `report_change_requests`; approve/reject; notify OpCo/Partner via `notifications`
- **Reports monitoring tab** — missing OpCo/Partner report lanes per period (uses `opco_partner_links` + `reports`)

### Phase 4 — Reconciliation
- UC-06: Perform Reconciliation of Reports — Compare Reports + History tabs; tolerance from `app_settings` (read-only)

### Phase 5 — Invoicing
- UC-04: View Invoices (Dizlee) — All invoices tab
- **Create Client → OpCo invoice** (SRS §4.3 / §5.3 — digital invoice to OpCo; bank details from `app_settings`)
- UC-05: Update Invoice Status — auto-acknowledge Partner → Dizlee on detail open
- UC-5B: Confirm invoice payment status — Mark payment done
- **Lifecycle tracker tab** — stepper + activity log per invoice
- **Invoice monitoring tab** — missing invoice lanes per period

### Phase 6 — Consolidation (full ownership — SRS actor is Dizlee)
- UC-6B: Consolidation (OpCo monthly)
  - Generate tab: period + OpCo selection, readiness validation, aggregation from `report_line_items` (read Shahrukh's data)
  - Write to `consolidations` / `consolidation_items`; audit `CONSOLIDATION_GENERATED`
  - History tab: view past consolidations, Download Excel (`opco_consolidated_{opcoId}_{period}.xlsx`)
  - Regenerate replaces prior rows (one record per OpCo + period)

### Phase 7 — Notifications (compose + send)
- UC-07: Send in-app notification to OpCos (Intimations tab)
- UC-08: Send in-app notification to Partners
- UC-09: Report reminders (Reminders tab)
- UC-9A: View Notification History
- Dizlee inbox tab (notifications received by Dizlee users)

### Phase 8 — Reporting
- **Reporting page** — period-based invoice/report overview (SRS §5.5)

### Phase 9 — Self-QA
- Unit tests for reconciliation tolerance logic, consolidation aggregation, and invoice lifecycle
- Integration test per API route I built

---

## 4. When I'm done

Stop and coordinate with Hussnain for joint QA / UAT. Do not merge `develop` → `main` myself.
