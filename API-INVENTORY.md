# API inventory

**Source:** Generated inventory (`tmp-api-inventory.md` / `.txt`) + `app/api/**/route.ts` count.  
**Route files:** **126** `route.ts` under `app/api`.  
**Overall prod status:** **NOT READY** — see [`PRODUCTION-AUDIT.md`](PRODUCTION-AUDIT.md). Docs precede fixes (`Production-check`).

---

## Summary

| Auth class | Approx. routes | Notes |
|------------|----------------|-------|
| `dizlee` | ~43 | Intentionally **cross-tenant** (trusted Dizlee/`client` users) |
| `admin` | ~38 | Admin portal APIs |
| `opco` | ~20 | Tenant-scoped to session OpCo |
| `partner` | ~19 | Tenant-scoped to session Partner |
| `auth-public` | 4 | NextAuth + password flows (rate-limited) |
| `cron-secret` | 1 | `/api/admin/cron/submission-reminders` |
| `public` | 1 | `/api/health` |

**Access pattern:** `middleware.ts` role/path gate (`lib/auth/api-access.ts`) **plus** per-route `require*Session` / portal session helpers. Unknown `/api/*` paths fail closed.

**Public / special:**

- `/api/health` — unauthenticated liveness  
- `/api/auth/*`, `/api/admin-auth/*` — auth (change-password requires session)  
- `/api/admin/cron/*` — `Authorization: Bearer $CRON_SECRET` (not a user JWT)

**Rate limits:** Almost all non-auth routes are **N** (no app-level rate limit). Auth routes marked **Y**. One OpCo partner-link request route is rate-limited in inventory.

**Validation:** Mixed — some POSTs use Zod/`Y`; many GETs/`~` rely on ad-hoc checks.

---

## Inventory table

Paths normalized from `tmp-api-inventory.md` (`//api` → `/api`).

| Method | Route | Auth | Rate limit | Zod/parse |
|--------|-------|------|------------|-----------|
| GET | `/api/admin/audit-logs/export` | admin | N | ~ |
| GET | `/api/admin/audit-logs` | admin | N | ~ |
| GET | `/api/admin/cron/submission-reminders` | cron-secret | N | ~ |
| GET | `/api/admin/currency-rates/periods` | admin | N | ~ |
| GET | `/api/admin/currency-rates/template` | admin | N | ~ |
| GET | `/api/admin/notifications/unread-count` | admin | N | ~ |
| GET | `/api/admin/notifications` | admin | N | ~ |
| GET | `/api/admin/opco-partner-link-requests` | admin | N | ~ |
| GET | `/api/admin/opcos/[id]/report-mapping/column-values` | admin | N | ~ |
| GET | `/api/admin/service-partner-maps/template` | admin | N | ~ |
| GET | `/api/dizlee/activity` | dizlee | N | ~ |
| GET | `/api/dizlee/consolidation/[id]/export` | dizlee | N | ~ |
| GET | `/api/dizlee/consolidation/[id]` | dizlee | N | ~ |
| GET | `/api/dizlee/consolidation/history` | dizlee | N | ~ |
| GET | `/api/dizlee/consolidation/readiness` | dizlee | N | ~ |
| GET | `/api/dizlee/dashboard` | dizlee | N | ~ |
| GET | `/api/dizlee/invoices/[id]/preview` | dizlee | N | ~ |
| GET | `/api/dizlee/invoices/[id]` | dizlee | N | ~ |
| GET | `/api/dizlee/invoices/lifecycle` | dizlee | N | ~ |
| GET | `/api/dizlee/invoices/monitoring` | dizlee | N | ~ |
| GET | `/api/dizlee/notifications/history/[id]` | dizlee | N | ~ |
| GET | `/api/dizlee/notifications/history` | dizlee | N | ~ |
| GET | `/api/dizlee/notifications/inbox/[id]` | dizlee | N | ~ |
| GET | `/api/dizlee/notifications/inbox` | dizlee | N | ~ |
| GET | `/api/dizlee/notifications/unread-count` | dizlee | N | ~ |
| GET | `/api/dizlee/reconciliation/[id]` | dizlee | N | ~ |
| GET | `/api/dizlee/reconciliation/history` | dizlee | N | ~ |
| GET | `/api/dizlee/reconciliation/lane-notifications` | dizlee | N | ~ |
| GET | `/api/dizlee/reconciliation/lanes` | dizlee | N | ~ |
| GET | `/api/dizlee/reporting` | dizlee | N | ~ |
| GET | `/api/dizlee/reports/[id]/preview` | dizlee | N | ~ |
| GET | `/api/dizlee/reports/[id]` | dizlee | N | ~ |
| GET | `/api/dizlee/reports/monitoring` | dizlee | N | ~ |
| GET | `/api/dizlee/reports` | dizlee | N | ~ |
| GET | `/api/dizlee/reupload-requests` | dizlee | N | ~ |
| GET | `/api/dizlee/revenue-share/[id]/download` | dizlee | N | ~ |
| GET | `/api/dizlee/revenue-share/[id]/preview` | dizlee | N | ~ |
| GET | `/api/dizlee/revenue-share/dashboard` | dizlee | N | ~ |
| GET | `/api/dizlee/revenue-share/export` | dizlee | N | ~ |
| GET | `/api/dizlee/revenue-share/readiness` | dizlee | N | ~ |
| GET | `/api/dizlee/submissions/[id]/preview` | dizlee | N | ~ |
| GET | `/api/health` | public | N | ~ |
| GET | `/api/opco/dashboard` | opco | N | ~ |
| GET | `/api/opco/invoices/[id]` | opco | N | ~ |
| GET | `/api/opco/invoices` | opco | N | ~ |
| GET | `/api/opco/notifications/[id]/attachments/[attachmentId]` | opco | N | ~ |
| GET | `/api/opco/notifications/unread-count` | opco | N | ~ |
| GET | `/api/opco/notifications` | opco | N | ~ |
| GET | `/api/opco/partners` | opco | N | ~ |
| GET | `/api/opco/reports/[id]/preview` | opco | N | ~ |
| GET | `/api/opco/reports/[id]` | opco | N | ~ |
| GET | `/api/opco/reports` | opco | N | ~ |
| GET | `/api/opco/submissions/[id]/preview` | opco | N | ~ |
| GET | `/api/partner/dashboard` | partner | N | ~ |
| GET | `/api/partner/invoices/[id]/lifecycle` | partner | N | ~ |
| GET | `/api/partner/invoices/[id]/preview` | partner | N | ~ |
| GET | `/api/partner/invoices/[id]` | partner | N | ~ |
| GET | `/api/partner/invoices` | partner | N | ~ |
| GET | `/api/partner/notifications/[id]/attachments/[attachmentId]` | partner | N | ~ |
| GET | `/api/partner/notifications/unread-count` | partner | N | ~ |
| GET | `/api/partner/notifications` | partner | N | ~ |
| GET | `/api/partner/opcos` | partner | N | ~ |
| GET | `/api/partner/reports/[id]/preview` | partner | N | ~ |
| GET | `/api/partner/reports/[id]` | partner | N | ~ |
| GET | `/api/partner/reports` | partner | N | ~ |
| GET/DELETE | `/api/admin/notifications/[id]` | admin | N | ~ |
| GET/DELETE | `/api/opco/notifications/[id]` | opco | N | ~ |
| GET/DELETE | `/api/partner/notifications/[id]` | partner | N | ~ |
| GET/PATCH | `/api/admin/currency-rates` | admin | N | ~ |
| GET/PATCH | `/api/admin/email-settings` | admin | N | ~ |
| GET/PATCH | `/api/admin/email-templates/[code]` | admin | N | ~ |
| GET/PATCH | `/api/admin/invoice-bank-details` | admin | N | ~ |
| GET/PATCH | `/api/admin/opco-partners` | admin | N | ~ |
| GET/PATCH | `/api/admin/opcos/[id]/report-mapping` | admin | N | ~ |
| GET/PATCH | `/api/admin/reconciliation-tolerance` | admin | N | ~ |
| GET/PATCH | `/api/admin/reminder-settings` | admin | N | ~ |
| GET/POST | `/api/admin-auth/[...nextauth]` | auth-public | Y | ~ |
| GET/POST | `/api/admin/currencies` | admin | N | ~ |
| GET/POST | `/api/admin/email-templates` | admin | N | ~ |
| GET/POST | `/api/admin/opcos` | admin | N | ~ |
| GET/POST | `/api/admin/partners` | admin | N | ~ |
| GET/POST | `/api/admin/service-partner-maps` | admin | N | ~ |
| GET/POST | `/api/admin/users` | admin | N | ~ |
| GET/POST | `/api/auth/[...nextauth]` | auth-public | Y | ~ |
| GET/POST | `/api/dizlee/invoices` | dizlee | N | Y |
| GET/POST | `/api/dizlee/notifications/intimations` | dizlee | N | Y |
| GET/POST | `/api/dizlee/notifications/reminders` | dizlee | N | Y |
| PATCH | `/api/dizlee/reconciliation/[id]/confirm` | dizlee | N | ~ |
| PATCH | `/api/dizlee/reupload-requests/[id]/approve` | dizlee | N | ~ |
| PATCH | `/api/dizlee/reupload-requests/[id]/reject` | dizlee | N | Y |
| PATCH/DELETE | `/api/admin/currencies/[id]` | admin | N | ~ |
| PATCH/DELETE | `/api/admin/opcos/[id]` | admin | N | ~ |
| PATCH/DELETE | `/api/admin/partners/[id]` | admin | N | ~ |
| PATCH/DELETE | `/api/admin/service-partner-maps/[id]` | admin | N | ~ |
| PATCH/DELETE | `/api/admin/users/[id]` | admin | N | ~ |
| POST | `/api/admin/currency-rates/import` | admin | N | ~ |
| POST | `/api/admin/email-settings/test` | admin | N | ~ |
| POST | `/api/admin/email-templates/[code]/revert` | admin | N | ~ |
| POST | `/api/admin/notifications/mark-all-read` | admin | N | ~ |
| POST | `/api/admin/opco-partner-link-requests/[id]/accept` | admin | N | ~ |
| POST | `/api/admin/opco-partner-link-requests/[id]/reject` | admin | N | ~ |
| POST | `/api/admin/opcos/[id]/report-mapping/sample` | admin | N | ~ |
| POST | `/api/admin/service-partner-maps/import` | admin | N | ~ |
| POST | `/api/auth/change-password` | auth-public | Y | ~ |
| POST | `/api/auth/forgot-password` | auth-public | Y | ~ |
| POST | `/api/auth/set-password` | auth-public | Y | ~ |
| POST | `/api/dizlee/consolidation/generate` | dizlee | N | Y |
| POST | `/api/dizlee/invoices/[id]/mark-payment` | dizlee | N | ~ |
| POST | `/api/dizlee/notifications/attachments` | dizlee | N | ~ |
| POST | `/api/dizlee/notifications/inbox/mark-all-read` | dizlee | N | ~ |
| POST | `/api/dizlee/reconciliation/run` | dizlee | N | Y |
| POST | `/api/dizlee/revenue-share/generate` | dizlee | N | ~ |
| POST | `/api/opco/notifications/mark-all-read` | opco | N | ~ |
| POST | `/api/opco/reports/[id]/reupload` | opco | N | ~ |
| POST | `/api/opco/reports/change-request` | opco | N | Y |
| POST | `/api/opco/reports/parse-preview` | opco | N | ~ |
| POST | `/api/opco/reports/request-partner-link` | opco | Y | Y |
| POST | `/api/opco/reports/upload` | opco | N | Y |
| POST | `/api/opco/submissions/[id]/reupload` | opco | N | ~ |
| POST | `/api/opco/submissions/change-request` | opco | N | Y |
| POST | `/api/partner/invoices/upload` | partner | N | Y |
| POST | `/api/partner/notifications/mark-all-read` | partner | N | ~ |
| POST | `/api/partner/reports/[id]/reupload` | partner | N | ~ |
| POST | `/api/partner/reports/change-request` | partner | N | Y |
| POST | `/api/partner/reports/parse-preview` | partner | N | ~ |
| POST | `/api/partner/reports/upload` | partner | N | Y |

---

## Implications for production

- Prefer shared rate limits before exposing auth and heavy POSTs (upload, broadcast, reconciliation, RS generate) on Vercel ([SEC-RATE-001](PRODUCTION-AUDIT.md)).  
- Cron route needs secret + **idempotent** handler ([REL-CRON-001](PRODUCTION-AUDIT.md)).  
- Excel-heavy POSTs inherit [SEC-EXCEL-001](PRODUCTION-AUDIT.md) risk.
