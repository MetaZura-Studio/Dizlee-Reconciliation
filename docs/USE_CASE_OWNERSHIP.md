# Use Case Ownership — SRS to Developer Mapping

**Source of truth for product requirements:** `SRS_Reconciliation_Professional.docx`  
**Source of truth for database:** `04_DATABASE_SCHEMA_FOR_CURSOR.md`  

This document resolves who **builds** each feature. Schema table placement in Prisma blocks may differ from UI actor (see Consolidation note below).

**Rule:** No developer changes the ERD without **explicit Hussnain approval**. Cursor must ask before any schema change.

---

## Parallel development

All three developers start from `develop` on day one. No one waits for another portal to be finished.

| How | Detail |
|-----|--------|
| **Local DB** | Each dev runs own MySQL + `npm run seed` |
| **Cross-team reads** | Query other blocks' tables **read-only** via Prisma |
| **Cross-team writes** | Only where this doc assigns runtime writes (e.g. Haseeb → `consolidations`, all portals → `notifications`) |
| **Mocks** | Use seed data or Prisma Studio to insert test reports/invoices locally |

---

## Hussnain — Auth, Admin, Partner

| UC ID | Name | Portal |
|-------|------|--------|
| UC-01-COMMON | User Login | `(auth)` |
| UC-02-COMMON | Change Password | `(auth)` |
| UC-03-COMMON | Forgot Password | `(auth)` |
| UC-01-ADMIN | Admin side navigation | `(admin)` |
| UC-02 | Create User | `(admin)` |
| UC-03 | Edit User | `(admin)` |
| UC-04 | Delete User | `(admin)` |
| UC-05 | Email Notification Settings | `(admin)` |
| UC-06 | Reminder Settings | `(admin)` |
| UC-07 | Automatic Submission Reminders (stub) | `(admin)` |
| UC-08 | View/export audit logs | `(admin)` |
| UC-09 | Configure OpCo–Partner links | `(admin)` |
| UC-10 | Reconciliation tolerance | `(admin)` |
| UC-11 | Currencies + monthly USD rates | `(admin)` |
| UC-12 | Email templates | `(admin)` |
| UC-13 | Invoice bank details | `(admin)` |
| UC-01-PARTNER | Partner side navigation | `(partner)` |
| UC-02-PARTNER | Partner Dashboard | `(partner)` |
| UC-03-PARTNER | Upload Report (Partner) | `(partner)` |
| UC-04-PARTNER | View Reports (Partner) | `(partner)` |
| UC-05-PARTNER | Request Report Upload (Partner) | `(partner)` |
| UC-06-PARTNER | Upload Invoice (Partner) | `(partner)` |
| UC-07-PARTNER | View Invoices (Partner) | `(partner)` |
| — | Partner Notifications **inbox** (read/dismiss) | `(partner)` |
| — | Partner **Replace upload** after Dizlee approval | `(partner)` |

**Prisma block:** Hussnain (`users`, `lookups`, `notifications`, `opco_partner_links`, `app_settings`, etc.)

---

## Shahrukh — OpCo Portal

| UC ID | Name | Portal |
|-------|------|--------|
| UC-01-OPCO | OpCo side navigation | `(opco)` |
| UC-02-OPCO | OpCo Dashboard | `(opco)` |
| UC-03-OPCO | Upload Report (OpCo) | `(opco)` |
| UC-04-OPCO | Request Report Upload (OpCo) | `(opco)` |
| UC-05-OPCO | View Reports (OpCo) | `(opco)` |
| UC-06-OPCO | Find reports in history | `(opco)` |
| UC-07-OPCO | Print Invoice | `(opco)` |
| UC-08-OPCO | View/respond to invoices (ack only) | `(opco)` |
| — | OpCo Notifications **inbox** (read/dismiss) | `(opco)` |
| — | OpCo **Replace upload** after Dizlee approval | `(opco)` |

**Not Shahrukh's scope:** UC-6B Consolidation — SRS actor is **Dizlee** (Haseeb).

**Prisma block:** Shahrukh (`reports`, `report_line_items`, `report_change_requests`)

**Schema note:** `consolidations` / `consolidation_items` models sit in Shahrukh's Prisma block for FK to `reports`. **Haseeb implements UC-6B** and writes those tables at runtime from Dizlee API routes. Shahrukh does not build consolidation UI or logic.

---

## Haseeb — Dizlee Portal

| UC ID | Name | Portal |
|-------|------|--------|
| UC-01-CLIENT | Dizlee side navigation | `(dizlee)` |
| UC-02 | Dizlee Dashboard | `(dizlee)` |
| UC-03 | View Reports (+ Reupload requests + Reports monitoring tabs) | `(dizlee)` |
| UC-04 | View Invoices (+ Lifecycle + Invoice monitoring tabs) | `(dizlee)` |
| — | **Create Client → OpCo invoice** (SRS §4.3, §5.3) | `(dizlee)` |
| UC-05 | Update Invoice Status (auto-ack Partner invoices) | `(dizlee)` |
| UC-5B | Confirm invoice payment status | `(dizlee)` |
| UC-06 | Perform Reconciliation | `(dizlee)` |
| UC-6B | **Consolidation** (Generate + History + Excel export) | `(dizlee)` |
| UC-07 | Send notification to OpCos | `(dizlee)` |
| UC-08 | Send notification to Partners | `(dizlee)` |
| UC-09 | Report reminders | `(dizlee)` |
| UC-9A | Notification History | `(dizlee)` |
| — | Dizlee Notifications **inbox** | `(dizlee)` |
| — | **Reporting page** (period overview) | `(dizlee)` |

**Prisma block:** Haseeb (`reconciliations`, `reconciliation_items`, `invoices`, `invoice_items`, `invoice_activity_logs`)

**Runtime writes outside Haseeb block (allowed, no schema edits):**
- `consolidations`, `consolidation_items` — UC-6B
- `report_change_requests` — approve/reject reupload (status updates)
- `notifications`, `notification_recipients`, `notification_reads`, `notification_attachments` — compose/send (tables owned by Hussnain)

---

## Shared tables — who writes what

| Table(s) | Schema owner | Who writes at runtime |
|----------|--------------|----------------------|
| `users`, `lookups`, `app_settings` | Hussnain | Hussnain (Admin) |
| `notifications` + related | Hussnain | Hussnain (infra), Haseeb (compose/send), all portals (read/mark read) |
| `reports`, `report_line_items` | Shahrukh | Shahrukh (OpCo), Hussnain (Partner) |
| `report_change_requests` | Shahrukh | Shahrukh/Hussnain (create request), Haseeb (approve/reject), Shahrukh/Hussnain (complete replace) |
| `consolidations`, `consolidation_items` | Shahrukh (FK) | **Haseeb** (UC-6B) |
| `reconciliations`, `invoices` | Haseeb | Haseeb |

---

## Handoff documents

| Developer | Full Cursor prompt |
|-----------|-------------------|
| Hussnain | `05_HUSSNAIN_PHASE2_PROMPT.md` |
| Shahrukh | `02_SHAHRUKH_HANDOFF_PROMPT.md` |
| Haseeb | `03_HASEEB_HANDOFF_PROMPT.md` |

Quick references: `docs/HANDOFF_HUSSNAIN.md`, `docs/HANDOFF_SHAHRUKH.md`, `docs/HANDOFF_HASEEB.md`
