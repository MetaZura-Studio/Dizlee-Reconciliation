# Dizlee Reconciliation — changes after last pull (Aug 12, 2026)

**Base commit:** `f7a3782` — *Merge pull request #70: Reconciliation Changes*  
**Branch:** `hussnain/vulnerabilities-Fixed`  
**Status:** Local uncommitted work (not yet pushed at time of writing)

---

## Git summary (for commit / PR)

**Suggested PR title:**

> Post–PR #70: security hardening, OpCo upload gates, Admin notifications, RS dashboard UI, recon UX, service maps per OpCo

**Suggested commit message (single commit):**

```
Harden auth/API security, OpCo file-based partner rules, Admin inbox, and Dizlee UX.

- Auth: rate limits (prod), API role gate in middleware, active-user checks, safe callbacks, cookie helpers
- OpCo: block save when file names unlinked/unknown partners; Notify Admin link-request flow
- Admin: notifications inbox + bell; OpCo partner link requests visible on OpCo partners
- Schema: service_partner_maps scoped by opco_id (migration + seed/scripts)
- Recon: soft-delete fix on run; auto-nav to results; Alert/Re-run while IN_PROGRESS
- RS: multi-OpCo dashboard UI (mock data); nav renamed to RS Reports; export formatting
- Hide Consolidation from Dizlee nav (pages redirect)
- Report UX: Excel preview headers, OpCo empty-amount rows skipped, partner upload preview fix
- Sample packs: Bahrain/Jordan/KSA Aug26 partner files + generator scripts
- Tests + docs (AUTH_SESSION, ERROR_CODES, ERD_PENDING_UPDATES)
```

**Optional split into 2–3 commits:**

1. `feat(security): auth rate limits, API middleware gate, active user, security headers`
2. `feat(opco): unlinked partner gate, Admin link requests, service maps per OpCo`
3. `feat(dizlee): recon results UX, RS dashboard UI, hide consolidation, sample packs`

**Before push:** run `npm run lint` and `npm test`; ensure migration `20260818120000_service_partner_maps_opco_id` is applied on the target DB.

---

## 1. Security & authentication

| Area | What changed |
|------|----------------|
| **API middleware gate** | All `/api/*` routes require JWT unless explicitly public (`lib/auth/api-access.ts`, `middleware.ts`). Role must match prefix (`/api/admin`, `/api/dizlee`, `/api/opco`, `/api/partner`). Fail closed on unknown paths. |
| **Active user** | Inactive/deleted users blocked at login and API (`lib/auth/active-user.ts`, session error `InactiveUser`). |
| **Rate limiting** | Login, forgot/set/change password throttled in **production**; **disabled in `next dev`** so local OpCo/Partner/Admin switching works (`lib/auth/rate-limit.ts`). |
| **Safe redirects** | Post-login callback URLs validated (`lib/auth/safe-callback-url.ts`). |
| **Cookies / session** | Hardened cookie handling docs + helpers (`lib/auth/cookies.ts`, `docs/AUTH_SESSION.md`). |
| **Security headers** | CSP and related headers in `next.config.ts`. |
| **Tests** | `auth-rate-limit`, `auth-cookies`, `active-user`, `api-access`, `safe-callback-url`. |

---

## 2. OpCo file vs Admin links (core business rule)

**Problem:** The system treated every Admin OpCo↔Partner link as “must upload this month.” Real OpCo files often include only a subset of linked partners.

**New rules:**

- **Partner portal:** unchanged — still link-based (only linked OpCos).
- **OpCo upload:** File is the source of truth for which partners appear this month.
- **Linked but not in file:** OK — no block; recon can show OpCo **0** vs Partner values; RS **excludes** them (`revenueShareReadinessFromPartnerRows` in `lib/dizlee/revenue-share.ts`).
- **In file but not linked:** **Upload blocked** — OpCo sees names, can **Notify Admin** or Cancel (`lib/opco/unlinked-partners-in-file.shared.ts`, `lib/platform/partner-link-request.ts`, OpCo upload form/API).

**Admin flow:**

- Link requests stored as in-app notifications (no new DB table).
- Admin **Notifications** inbox + header bell (`app/(admin)/admin/(portal)/notifications/`, `components/admin/notifications-*`, `lib/admin/notifications.ts`).
- OpCo partners view shows recent link requests (`components/admin/opco-partners-view.tsx`).

**API:** `POST /api/opco/reports/request-partner-link`

---

## 3. Service partner maps — per OpCo

**Migration:** `prisma/migrations/20260818120000_service_partner_maps_opco_id/`

- `service_partner_maps.opco_id` added (required FK to `opcos`).
- Unique key: `(opco_id, service_key)` — same service name can map to different partners on different OpCos (e.g. Zain KSA via service lookup, not Excel Partner column).

**Scripts:**

- `scripts/replace-service-partner-maps-from-excel.ts`
- `scripts/replace-opco-partner-links-from-excel.ts`
- Admin import/template routes updated.

**Docs:** `docs/ERD_PENDING_UPDATES.md` (main ERD not rewritten until explicitly requested).

---

## 4. Reconciliation

| Change | Detail |
|--------|--------|
| **Soft-delete bug fix** | `runReconciliation` loads line items with `isDeleted: false` so reupload does not double-count old + new Partner lines (`lib/dizlee/reconciliation.ts`). |
| **Results UX** | After run from Compare → navigate straight to `/dizlee/reconciliation/{id}` (no success dialog). |
| **Alert gate** | Alert OpCo/Partner only while `IN_PROGRESS` (`canConfirm`); disabled after Confirm. |
| **Re-run** | Beside Confirm while in progress; POST run again for same OpCo/Partner/period. |
| **Local testing** | `npm run db:clear-transactional` wipes reports/recon/invoices for fresh runs. |

---

## 5. Revenue Share (RS Reports)

| Change | Detail |
|--------|--------|
| **Readiness gate** | Only partners **in OpCo file** need Partner uploads (not every link). |
| **Export** | OpCo USD + Partner USD columns; regulatory fee from OpCo `vatPercent` (Zain KSA **19.5%**); formatting via `lib/dizlee/revenue-share/export-format.ts`. |
| **OpCo parse** | Rows with empty/missing OpCo amount skipped (`lib/opco/excel/parse-mapped-opco-report.ts`). |
| **UI redesign** | Multi-OpCo dashboard: Month/Year only, summary cards, OpCo readiness table (no `5/7` counts — Received/Missing + “Partners report missing”), icon actions, View Details drawer. **Mock data** until backend is wired. |
| **Nav** | Dizlee nav: **RS Reports** (was “Revenue Share”). |
| **Not done yet** | `RevenueShareReport` Prisma model / saved RS history (planned, not implemented). |

---

## 6. Consolidation — hidden

- Removed from `DIZLEE_NAV_ITEMS` (commented restore line in `lib/dizlee/navigation.ts`).
- `/dizlee/consolidation` and detail pages **redirect to `/dizlee`**.
- APIs and libs kept for future re-enable.

---

## 7. Report upload & preview UX

- **Partner/OpCo upload preview:** First Excel row treated as headers (not Col1/Col2) (`components/shared/report-upload-review-modal.tsx`).
- Shared line items table and report detail modals updated.
- Excel upload validation helper (`lib/platform/excel-upload.ts`).
- FX display for OpCo parsed amounts (`lib/platform/report-fx.ts`).

---

## 8. Seed data & sample files

**Partners / links:**

- Restored **GameBar** (Jordan); new partners e.g. Karti, Shofha, Docomo Digital, Zain SD CP, Klikomics (`prisma/seed-data/partners.ts`, `opco-partner-links.ts`).

**Sample packs (Aug 2026, mostly USD):**

- Bahrain: `*-aug26.xlsx` (from DB generator script).
- Jordan: ArpuPlus, DigitalVirgo, GameBar, Karti.
- KSA: remaining partner samples for RS testing.

**Scripts:** `generate-bahrain-partner-samples-from-db.ts`, `generate-jordan-partner-samples-from-db.ts`, `generate-ksa-remaining-partner-samples.ts`, updated `generate-bahrain-partner-pack.ts`.

---

## 9. Other platform / API

- Notification attachment allowlist + shared types.
- Dizlee API body validation (`lib/dizlee/validation/api-bodies.ts`).
- Many API routes touched for consistent auth/error responses.
- `.env.example` updates.

---

## 10. Tests added/updated

**New:** `unlinked-partners-in-file`, `partner-link-request`, `opco-partner-roster`, `report-fx`, `excel-upload`, `notification-attachment-allowlist`, `object-storage-path`, `dizlee-api-bodies`, plus auth tests listed in section 1.

**Updated:** `revenue-share`, `reconciliation-compare`, `service-partner-map`, `service-partner-maps-excel`, `seed-data`, `app-errors`, and others.

---

## 11. Intentionally deferred (not in this push)

- Persisted RS report storage (`RevenueShareReport` table).
- Live multi-OpCo RS dashboard API (UI uses mock rows).
- Full ERD doc refresh (`04_DATABASE_SCHEMA_FOR_CURSOR.md`).

---

## 12. Suggested test plan before push

1. Login: OpCo, Partner, Dizlee, Admin (local dev — no rate limit).
2. OpCo upload with **unlinked** name in file → blocked + Notify Admin.
3. Admin adds link → OpCo can upload.
4. Reconcile lane → lands on results → Alert / Re-run / Confirm behavior.
5. RS page: all OpCos visible; icon actions; drawer for missing partners.
6. Zain KSA upload with service-map mode after migration + seed maps.
7. `npm run lint` + `npm test`.

---

## Scale of local diff (reference)

- ~191 changed/untracked paths vs `f7a3782`
- ~131 tracked files: **+3,452 / −1,563** lines (approximate at time of writing)
