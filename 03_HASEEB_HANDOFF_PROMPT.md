# Cursor prompt — Haseeb (Dizlee Portal: Reconciliation, Invoicing, Dashboards, Notifications)

## Before opening Cursor

```bash
git clone <REPO_URL_FROM_HUSSNAIN>
cd dizlee-reconciliation-platform
git checkout develop
git pull origin develop
git checkout -b feature/haseeb-dizlee-setup
cp .env.example .env.local
docker compose up -d
npm install
npx prisma migrate dev
npm run dev
```

Confirm the app runs at `http://localhost:3000` before continuing. Your local MySQL (from `docker compose up -d`) is yours alone — it is not shared with Hussnain or Shahrukh. You do not need anyone else's local database or any cloud database to start working.

## Then paste everything below into Cursor's chat (Composer/Agent mode), opened in this repo

---

I am Haseeb, one of three developers on the Dizlee Reconciliation Platform. The repo has already been bootstrapped by Hussnain with Next.js, Prisma, NextAuth, Tailwind/shadcn, CI/CD, and his own Admin/Partner portal work. I am now building my own portal — **the Dizlee Portal** (reconciliation, invoicing, dashboards, and Dizlee-side notifications) — completely independently. I do not touch any code outside my own folders, I do not depend on Hussnain's or Shahrukh's auth/UI components, and I build my own scoped versions of everything I need.

## My ownership boundary (do not cross these)
- `app/(dizlee)/` — all my screens
- `app/api/dizlee/` — all my API routes (create this folder if it doesn't exist)
- `lib/dizlee/` — my own auth/session check, validation schemas, utilities
- `components/dizlee/` — my own data table, modal, file upload, lifecycle stepper component (do NOT import from `components/admin/` or `components/partner/` — build my own minimal versions scoped to what my screens need)
- `prisma/schema.prisma` — I ONLY add/edit models inside the `// ===== HASEEB: Dizlee Portal models =====` comment block. I never touch the Hussnain or Shahrukh blocks.

I never wait on Hussnain or Shahrukh to finish anything. If I need to reference a table they own (read-only — e.g. `reports` owned by Shahrukh, `users`/`app_settings` owned by Hussnain), I query it directly — that's a read, not a build dependency.

## Tech stack (already set up by Hussnain, just use it — do not reinitialize)
Next.js 14+ App Router, TypeScript strict, Prisma + MySQL (TiDB-compatible — keep schema vanilla-MySQL, no proprietary features), NextAuth.js (Credentials, JWT), Tailwind + shadcn/ui, React Hook Form + Zod, TanStack Table + TanStack Query, ExcelJS, Vitest + RTL + Playwright.

## 1. My own auth check

In `lib/dizlee/auth.ts`, write my own lightweight session/role check scoped to the CLIENT (Dizlee) role only. Reference the existing `users` table (Hussnain's Prisma block — do not redefine it). Verify session has `role: 'CLIENT'`; redirect to login otherwise.

## 2. My Prisma models

Add to my comment block in `prisma/schema.prisma`: `reconciliations`, `reconciliation_items`, `invoices`, `invoice_items`, `invoice_activity_logs`. Cross-reference the ERD (ask me for it if you don't have it) for exact columns, and apply these fixes we already identified:
- `reconciliation_items.confirmed_value`: make this column nullable, or default it to `opco_amount` on insert — do not leave it as a hard `NOT NULL` with no default, since the confirmed value isn't known until Dizlee runs reconciliation
- `invoices` table: the unique constraint must be a real business key, not `UNIQUE(opco_id, DATETIME)` (that was a typo in an earlier ERD draft) — use `UNIQUE(opco_id, partner_id, month, year, invoice_type_id)`
- FK columns should match the type of the PK they reference (BIGINT, not VARCHAR)
- Every table gets the shared soft-delete pattern (`is_deleted`, `deleted_at`, `deleted_by_user_id`)

Run: `npx prisma migrate dev --name dizlee_portal_schema`

## 3. Build these use cases, in this order

### Phase 1 — Auth + navigation
- UC-01-CLIENT: Access Side Navigation Bar (7 items: Dashboard, Reports history, Invoices, Reconciliation, Consolidation, Notifications, Reporting)
- Login/role redirect using my own auth check from step 1

### Phase 2 — Reconciliation
- UC-06: Perform Reconciliation of Reports — Compare Reports tab (period/OpCo/Partner selectors, lane list with state MISSING/READY/RECONCILED), Run reconciliation (compares parsed line items in USD, applies admin tolerance % — read `reconciliation_negligible_percent` from `app_settings`, Hussnain's block, read-only), stores DRAFT result with confirmed rows, History tab
- Reconciliation tolerance comparison logic: relative difference within tolerance % → MATCHED, else MISMATCHED; one-sided rows → MISSING_IN_PARTNER / MISSING_IN_OPCO; on mismatch the OpCo value becomes the confirmed value

### Phase 3 — Invoicing
- View Invoices (Dizlee) — All invoices tab, filters (period/OpCo/Partner/payment status), Dizlee creates Dizlee→OpCo invoices, Partner→Dizlee invoices appear here too (uploaded by Shahrukh's OpCo-linked partners — read those rows, don't rebuild Shahrukh's upload screen)
- UC-05: Update Invoice Status — auto-acknowledge Partner→Dizlee invoices when Dizlee opens the detail screen (status → ACKNOWLEDGED, activity log, audit event INVOICE_STATUS_UPDATED)
- UC-5B: Confirm invoice payment status — "Mark payment done" action for both Partner→Dizlee and Dizlee→OpCo invoices, only allowed after acknowledgement, sets payment status PAID, activity log PAYMENT_MARKED_PAID, audit event INVOICE_PAYMENT_RECORDED
- Lifecycle tab — four-stage stepper (Created → Sent → Acknowledged → Payment done) with activity log per invoice

### Phase 4 — Dizlee-side notifications (distinct from Hussnain's notification settings/templates)
- UC-07: Send in-app notification to OpCos — compose screen, recipient multi-select (OpCo sub-tab), template pre-fill (read templates from `notification_templates`, Hussnain's block, read-only), attachments (PDF/CSV/JPEG/PNG, max 5 files/10MB each/25MB total), Preview + Send
- UC-08: Send in-app notification to Partners — same as above, Partners sub-tab
- UC-09: Report reminders (Dizlee-side manual send) — Reminders tab: period selector, auto-loaded missing-lane panels (OpCo reports missing / Partner reports missing), bulk or per-row Send Reminder
- UC-9A: View Notification History — separate paginated page from the compose screen, filters (search/date range/recipient/status), detail modal, dismiss-from-own-view action

### Phase 5 — Dashboards & Reporting
- UC-02: View Dashboard (Dizlee) — period selector, billing/revenue panel (KPIs, donut charts, paid/missing by OpCo/Partner), reports & reconciliation panel (stat cards, donuts, reconciliation overview list), upload activity feed — this reads across my own tables plus Shahrukh's `reports` and Hussnain's `users`/`app_settings` (all read-only)
- UC-03: View Reports (Dizlee) — Dizlee-side read view of all OpCo/Partner reports (reads Shahrukh's `reports` table, read-only — don't rebuild upload logic, just the view/filter/detail screen)
- UC-04: View Invoices (Dizlee) — same grid pattern as the Invoicing phase above, just confirm filters match SRS (period/OpCo/Partner/payment status)
- UC-6B: Consolidation — Dizlee-side Generate/History tabs (Shahrukh builds the OpCo-side aggregation logic; I build the Dizlee-facing trigger screen, History list, view/download actions) — coordinate naming only, no blocking dependency since this reads Shahrukh's `consolidations` table once it exists; build my screen against the schema now and it'll just show empty state until his data exists
- Reporting page (period-based reporting, cross-OpCo/Partner view)

### Phase 6 — Self-QA
- Unit tests for reconciliation tolerance comparison logic and invoice lifecycle state transitions
- At least one integration test per API route I built
- Manually walk through every use case above against its Main/Alternate/Exception courses from the SRS

## 4. Git workflow

- One branch per use case or logical chunk: `feature/haseeb-<short-desc>`, branched from `develop`
- PRs target `develop`, never `main`
- I am never the sole approver of my own PR — tag Hussnain or Shahrukh as reviewer
- Don't touch `app/(admin)/`, `app/(partner)/`, `app/(opco)/`, or anyone else's `lib/`/`components/` subfolder without flagging it first

## 5. When I'm done with my own Phase 0–6

Stop and wait for Hussnain to coordinate the joint Phase 6 (QA) — merging all three portals, end-to-end QA, UAT with the manager. I don't need to merge with Shahrukh's work myself; that's handled in the joint integration phase.
