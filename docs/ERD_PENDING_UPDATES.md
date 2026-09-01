# ERD pending updates (copy into ERD / `04_DATABASE_SCHEMA_FOR_CURSOR.md`)

**Source of truth:** `prisma/schema.prisma` + `prisma/migrations/`  
**Security hardening (S1–S16):** no database / ERD changes — app/auth/API only.

Use this checklist when refreshing the ERD. Items below are **already applied** in migrations.

---

## 1. Columns added to existing tables

### `opcos`
| Column | Type | Notes |
|--------|------|--------|
| `vat_percent` | `DECIMAL(5,2) NOT NULL DEFAULT 0` | OpCo VAT % for Dizlee→OpCo invoices |

Migration: `20260807120000_opco_vat_percent`

### `app_settings`
| Column | Type | Notes |
|--------|------|--------|
| `notification_schedules_json` | `TEXT NULL` | Admin Reminder Settings schedule JSON (no separate schedule table) |

Migration: `20260720120000_app_settings_notification_schedules_json`

### `notifications`
| Column | Type | Notes |
|--------|------|--------|
| `metadata_json` | `TEXT NULL` | Structured CTA / OpCo report-upload consolidation payload |
| `delivery_channel` | `VARCHAR(16) NOT NULL DEFAULT 'SYSTEM'` | `SYSTEM` \| `EMAIL` \| `BOTH` — how the notification was delivered |

Migration: `20260824153000_notification_metadata_json`  
Migration: `20260831140000_notification_delivery_channel`

### `invoices`
| Column | Type | Notes |
|--------|------|--------|
| `bank_details_json` | `TEXT NULL` | Snapshot of bank + signatories on digital Dizlee→OpCo invoices |

Migration: `20260720100000_invoice_bank_details_json`

Also (same table — uniqueness / nullability):
- `opco_id` is **nullable** (Partner→Dizlee invoices have no OpCo)
- Dropped old `uq_invoices_business_key`
- Added `uq_partner_period_invoices` (`partner_id`, `month`, `year`, `invoice_type_id`)
- Added `uq_client_period_invoices` (`opco_id`, `month`, `year`, `invoice_type_id`)
- Index `invoices_opco_id_idx` on `opco_id`

Migration: `20260721120000_invoice_nullable_opco_split_uniques`

### `notification_templates`
| Column | Type | Notes |
|--------|------|--------|
| `category` | `VARCHAR(32) NOT NULL DEFAULT 'OTHER'` | Index `idx_notification_templates_category` |

**Allowed values (app convention):** `INTIMATION` \| `REMINDER` \| `OTHER`  
(Not the old `REPORTS` / `INVOICES` labels.)

Migrations:
- `20260715100000_email_template_category`
- `20260716170000_email_template_category_intimation_reminder`

Seed codes:
- Intimation: `REPORT_SUBMISSION`, `INVOICE_SUBMISSION`
- Reminder: `REPORT_REMINDER`, `INVOICE_REMINDER`
- Other: `PASSWORD_INVITE`, `PASSWORD_FORGOT`

### `report_line_items`
| Column | Type | Notes |
|--------|------|--------|
| `revenue_share_percent` | `DECIMAL(18,4) NULL` | Optional % from OpCo Excel when mapped |

Migration: `20260811120000_report_line_revenue_share_percent`

---

## 2. New tables

### `service_partner_maps`
Per-OpCo Service/Application name → Partner (used when OpCo mapping `partner_mode = SERVICE_PARTNER_MAP`).

| Column | Type |
|--------|------|
| `id` | `BIGINT` PK |
| `opco_id` | `BIGINT NOT NULL` → `opcos.id` |
| `service_name` | `VARCHAR(255) NOT NULL` |
| `service_key` | `VARCHAR(255) NOT NULL` |
| `partner_id` | `BIGINT NOT NULL` → `partners.id` |
| audit soft-delete columns | standard pattern (`created_*`, `updated_*`, `is_deleted`, …) |

Unique: `uq_service_partner_maps_opco_service_key` (`opco_id`, `service_key`)  
Index: `idx_service_partner_maps_opco_id`  
FK: `opco_id` → `opcos`, `partner_id` → `partners`  
Migrations:
- `20260810120000_service_partner_maps`
- `20260818120000_service_partner_maps_opco_id` (scope unique to OpCo; listing is OpCo + Partner + Service)

**Lookups to document:**
- `AUDIT_ENTITY_TYPE`: `SERVICE_PARTNER_MAP`
- `AUDIT_ACTION`: `SERVICE_PARTNER_MAP_CREATED`, `_UPDATED`, `_DELETED`, `_IMPORTED`

### `opco_report_mappings`
One row per OpCo — Admin “Report map” (Excel column mapping).

| Column | Type | Notes |
|--------|------|--------|
| `id` | `BIGINT` PK | |
| `opco_id` | `BIGINT NOT NULL` **UNIQUE** | 1:1 with `opcos` |
| `sample_file_id` | `BIGINT NULL` → `files.id` | Uploaded sample workbook |
| `headers_json` | `TEXT NULL` | Sample sheet headers JSON |
| `service_column` | `VARCHAR(255) NULL` | |
| `partner_mode` | `VARCHAR(32) NOT NULL` | `EXCEL_COLUMN` \| `SERVICE_PARTNER_MAP` \| `UPLOAD_PICKER` |
| `partner_column` | `VARCHAR(255) NULL` | When mode = Excel column |
| `revenue_column` | `VARCHAR(255) NULL` | |
| `revenue_share_column` | `VARCHAR(255) NULL` | Optional |
| `row_filter_column` | `VARCHAR(255) NULL` | Optional row keep-filter |
| `row_filter_value` | `VARCHAR(255) NULL` | |
| `aggregate_daily_rows` | `BOOLEAN NOT NULL DEFAULT false` | e.g. Sudan daily → monthly |
| soft-delete / audit | standard | |

Migrations:
- `20260810140000_opco_report_mappings`
- `20260811153000_opco_report_row_filter` (filter columns)

Relationships:
- `opcos` 1 —— 0..1 `opco_report_mappings`
- `files` 0..1 —— * sample for mapping

### `revenue_share_reports`
One generated Dizlee Revenue Share Excel per OpCo + period (file + row snapshot).

| Column | Type | Notes |
|--------|------|--------|
| `id` | `INT` PK | |
| `opco_id` | `BIGINT NOT NULL` → `opcos.id` | |
| `month` | `INT NOT NULL` | |
| `year` | `INT NOT NULL` | |
| `file_id` | `BIGINT NOT NULL` → `files.id` | Stored `.xlsx` |
| `generated_at` | `DATETIME(3) NOT NULL` | |
| `generated_by_user_id` | `BIGINT NOT NULL` → `users.id` | |
| soft-delete / audit | standard | |

Unique: `uq_revenue_share_reports` (`opco_id`, `year`, `month`)  
Index: `idx_revenue_share_reports_period` (`year`, `month`)  
Migration: `20260824120000_revenue_share_reports`  
Object storage folder: `revenue-share` (local path `.uploads/revenue-share/...`)

Relationships:
- `opcos` 1 —— * `revenue_share_reports`
- `files` 1 —— * `revenue_share_reports`
- `users` 1 —— * generated-by
- `revenue_share_reports` 1 —— * `revenue_share_report_items`

### `revenue_share_report_items`
Snapshot of each RS Excel row. No audit/soft-delete. On regenerate: hard-delete + recreate.

| Column | Type | Notes |
|--------|------|--------|
| `id` | `BIGINT` PK | |
| `revenue_share_report_id` | `INT NOT NULL` → `revenue_share_reports.id` | |
| `partner_id` | `BIGINT NULL` → `partners.id` | |
| `partner_name` | `VARCHAR(255) NOT NULL` | Excel: Partner Name |
| `service_name` | `VARCHAR(255) NOT NULL` | Excel: Service Name |
| `opco_amount_usd` | `DECIMAL(18,4) NULL` | |
| `partner_amount_usd` | `DECIMAL(18,4) NULL` | |
| `regulatory_fee_percent` | `DECIMAL(5,2) NOT NULL` | OpCo vat at generation |
| `regulatory_fee_amount` | `DECIMAL(18,4) NOT NULL` | Computed fee |
| `net_revenue` | `DECIMAL(18,4) NOT NULL` | |
| `revenue_share_percent` | `DECIMAL(18,4) NULL` | |
| `sort_order` | `INT NOT NULL` | Stable Excel order |

Indexes: `idx_rs_report_items_report_id`, `idx_rs_report_items_report_sort`  
Migration: `20260826120000_revenue_share_report_items`

### `opco_report_submissions`
One OpCo monthly raw Excel (all partners); partner `reports` link via `submission_id` after split.

| Column | Type | Notes |
|--------|------|--------|
| `id` | `BIGINT` PK | |
| `opco_id` | `BIGINT NOT NULL` → `opcos.id` | |
| `month` / `year` | `INT NOT NULL` | |
| `file_id` | `BIGINT NOT NULL` → `files.id` | Single raw workbook |
| `status_id` | `INT NOT NULL` → `lookups` | REPORT_STATUS (`SUBMITTED` / `CHANGE_REQUESTED` / `RESUBMITTED`) |
| soft-delete / audit | standard | |

Unique: `uq_opco_report_submissions` (`opco_id`, `year`, `month`)  
Migration: `20260825140000_opco_report_submissions`  
Child: `opco_submission_change_requests` (submission-scoped CR; Partner keeps `report_change_requests`)  
`reports.submission_id` nullable FK → this table

### `opco_partner_link_requests`
OpCo asks Admin to link partners so a report upload can proceed.

| Column | Type | Notes |
|--------|------|--------|
| `id` | `BIGINT` PK | |
| `opco_id` | `BIGINT NOT NULL` → `opcos.id` | |
| `requested_by_user_id` | `BIGINT NOT NULL` → `users.id` | |
| `month` / `year` | `INT NOT NULL` | Report period on the request |
| `message` | `TEXT NOT NULL` | OpCo note |
| `partner_names_json` | `TEXT NOT NULL` | JSON string array of partner names still pending |
| `status` | `VARCHAR(32) NOT NULL DEFAULT 'PENDING'` | `PENDING` \| `APPROVED` \| `REJECTED` |
| `decision_note` | `TEXT NULL` | |
| `decided_by_user_id` | `BIGINT NULL` → `users.id` | |
| `decided_at` | `DATETIME(3) NULL` | |
| `created_at` / `updated_at` | timestamps | |

Indexes: `idx_opco_partner_link_requests_status_created`, `idx_opco_partner_link_requests_opco_id`  
Migration: `20260827120000_opco_partner_link_requests`

---

## 3. Lookup / seed notes (not new tables)

| Lookup type | Add / confirm |
|-------------|----------------|
| `INVOICE_STATUS` | Include **`PAID`** (Settled → Paid lifecycle) |
| Password emails | DB templates under category **OTHER** (not hardcoded-only) |
| Reminder schedules | Live in `app_settings.notification_schedules_json` — **no** extra schedule table |

---

## 4. What **not** to put in the ERD from recent work

- Session length, rate limits, CSP, CSRF cookies, Zod API validation, soft-delete query filters, file allowlists — **application only**, no schema change.
- Sample Excel packs under `Reports/` — files only, not DB.

---

## Sync order (when you update the ERD doc)

1. Add/alter columns in §1  
2. Draw new entities + FKs in §2  
3. Refresh lookup inventories in §3  
4. Point “source of truth” notes at current `prisma/schema.prisma`
