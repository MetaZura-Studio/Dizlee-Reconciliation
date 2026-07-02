# Cursor prompt — Shahrukh (OpCo Portal)

## Before opening Cursor

```bash
git clone <REPO_URL_FROM_HUSSNAIN>
cd dizlee-reconciliation-platform
git checkout develop
git pull origin develop
git checkout -b feature/shahrukh-opco-setup
cp .env.example .env.local
docker compose up -d
npm install
npx prisma migrate dev
npm run dev
```

Confirm the app runs at `http://localhost:3000` before continuing. Your local MySQL (from `docker compose up -d`) is yours alone — it is not shared with Hussnain or Haseeb. You do not need anyone else's local database or any cloud database to start working.

## Then paste everything below into Cursor's chat (Composer/Agent mode), opened in this repo

---

I am Shahrukh, one of three developers on the Dizlee Reconciliation Platform. The repo has already been bootstrapped by Hussnain with Next.js, Prisma, NextAuth, Tailwind/shadcn, CI/CD, and his own Admin/Partner portal work. I am now building my own portal — **the OpCo Portal** — completely independently. I do not touch any code outside my own folders, I do not depend on Hussnain's or Haseeb's auth/UI components, and I build my own scoped versions of everything I need.

## My ownership boundary (do not cross these)
- `app/(opco)/` — all my screens
- `app/api/opco/` — all my API routes (create this folder if it doesn't exist)
- `lib/opco/` — my own auth/session check, validation schemas, utilities
- `components/opco/` — my own data table, modal, file upload component (do NOT import from `components/admin/` or `components/partner/` — build my own minimal versions scoped to what my screens need)
- `prisma/schema.prisma` — I ONLY add/edit models inside the `// ===== SHAHRUKH: OpCo Portal models =====` comment block. I never touch the Hussnain or Haseeb blocks.

I never wait on Hussnain or Haseeb to finish anything. If I need to reference a table they own (read-only), I query it directly — that's a read, not a build dependency.

## Tech stack (already set up by Hussnain, just use it — do not reinitialize)
Next.js 14+ App Router, TypeScript strict, Prisma + MySQL (TiDB-compatible — keep schema vanilla-MySQL, no proprietary features), NextAuth.js (Credentials, JWT), Tailwind + shadcn/ui, React Hook Form + Zod, TanStack Table + TanStack Query, ExcelJS for report parsing/export, Vitest + RTL + Playwright.

## 1. My own auth check

In `lib/opco/auth.ts`, write my own lightweight session/role check scoped to the OPCO role only. Read the existing `users` table (already modeled by Hussnain in his Prisma block — do not redefine it, just reference it). Verify session has `role: 'OPCO'` and `opcoId` set; redirect to login otherwise.

## 2. My Prisma models

Add to my comment block in `prisma/schema.prisma`: `reports`, `report_line_items`, `report_change_requests`, `consolidations`, `consolidation_items`. Cross-reference the ERD (ask me for it if you don't have it) for exact columns. Apply these fixes we already identified project-wide: FK columns should match the type of the PK they reference (use BIGINT, not VARCHAR), and every table gets the shared soft-delete pattern (`is_deleted`, `deleted_at`, `deleted_by_user_id`).

Run: `npx prisma migrate dev --name opco_portal_schema`

## 3. Build these use cases, in this order

### Phase 1 — Auth + navigation
- UC-01-OPCO: Access Side Navigation Bar (5 items: Dashboard, Upload Report, Reports history, Invoices, Notifications; footer Settings)
- Login/role redirect using my own auth check from step 1

### Phase 2 — Reports
- UC-02-OPCO: View Dashboard (OpCo) — period selector, summary cards (partners to report for / submitted / missing), reports table per linked partner, Dizlee→OpCo invoice section
- UC-03-OPCO: Upload Report (OpCo) — Excel upload (.xlsx/.xls), period + partner selection (partner dropdown limited to admin-linked partners only — query `opco_partner_links`, owned by Hussnain's block, read-only), parse via ExcelJS, one report per period+partner+OpCo (reject duplicates), FX conversion using `currency_monthly_rates` (Hussnain's block, read-only)
- UC-04-OPCO: Request Report Upload (OpCo) — creates a `report_change_requests` row with status PENDING, notifies Dizlee (stub the notification call for now if Haseeb's notification module isn't ready yet — do not block on it, just leave a TODO comment and a no-op function)
- UC-05-OPCO: View Reports (OpCo) — paginated grid, period filter, sort by Uploaded/Period/Filename
- UC-06-OPCO: Find reports in Reports history (same screen as above, this is the filter/sort behavior — implement together with UC-05)

### Phase 3 — Invoices (view + acknowledge only — OpCo does not upload invoices)
- UC-08-OPCO: View and respond to invoices (OpCo) — list Dizlee-issued invoices scoped to this OpCo, auto-acknowledge on detail open, show payment status read-only (Dizlee marks payment, not OpCo)
- UC-07-OPCO: Print Invoice (OpCo) — browser print/Save-as-PDF using a print-friendly layout of the invoice detail screen

### Phase 4 — Consolidation
- UC-6B: Consolidation (OpCo monthly) — this one is actually triggered by Dizlee per the SRS, but the OpCo-side data (linked partner reports) must be ready for it to run. Build the aggregation logic and Excel export here since it reads OpCo-side data I own: validate every partner linked to the OpCo has uploaded a report for the period before allowing generation, aggregate by partner+service+description+unit, store in `consolidations`/`consolidation_items`, Excel export with filename pattern `opco_consolidated_{opcoId}_{period}.xlsx`

### Phase 5 — Self-QA
- Write unit tests for the report upload validation logic and the consolidation aggregation logic
- Write at least one integration test per API route I built
- Manually walk through every use case above against its Main/Alternate/Exception courses from the SRS

## 4. Git workflow

- One branch per use case or logical chunk: `feature/shahrukh-<short-desc>`, branched from `develop`
- PRs target `develop`, never `main`
- I am never the sole approver of my own PR — tag Hussnain or Haseeb as reviewer
- Don't touch `app/(admin)/`, `app/(partner)/`, `app/(dizlee)/`, or anyone else's `lib/`/`components/` subfolder without flagging it first

## 5. When I'm done with my own Phase 0–5

Stop and wait for Hussnain to coordinate the joint Phase 6 (QA) — merging all three portals, end-to-end QA, UAT with the manager. I don't need to merge with Haseeb's work myself; that's handled in the joint integration phase.
