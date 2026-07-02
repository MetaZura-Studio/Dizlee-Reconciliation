# Dizlee Reconciliation Platform — Database Schema Reference for Cursor

This document is the **single source of truth** for the database schema.
Cursor must implement Prisma models that produce exactly this schema — no deviation.

## Rules before you start

1. Database engine: **MySQL 8.0** locally (Docker). Production: **TiDB Cloud** (MySQL-wire-compatible). Keep every DDL strictly vanilla-MySQL — no stored procedures, no FULLTEXT indexes, no SPATIAL types, no MySQL-proprietary syntax that TiDB does not support.
2. ORM: **Prisma**. Every table below maps 1:1 to a Prisma model.
3. All timestamps use `DATETIME DEFAULT CURRENT_TIMESTAMP` / `ON UPDATE CURRENT_TIMESTAMP`. Prisma equivalent: `@default(now())` / `@updatedAt`.
4. Soft delete pattern appears on every table: `is_deleted TINYINT(1) NOT NULL DEFAULT 0`, `deleted_at DATETIME NULL`, `deleted_by_user_id BIGINT NULL`. Add a Prisma middleware that automatically appends `WHERE is_deleted = 0` to all `findMany` / `findFirst` queries.
5. **Schema is split into three owner blocks** in `prisma/schema.prisma`. Each developer only edits their own block. Respect these ownership boundaries exactly.
6. Where a fix was applied to the original ERD, it is marked **[FIX APPLIED]** with a plain-English reason. Do not revert these fixes.

---

## Owner blocks

```
// ===== HUSSNAIN: Admin/Platform/Auth/Partner models =====
lookup_types, lookups, users, app_settings, currencies, currency_monthly_rates,
opco_partner_links, audit_logs, notifications, notification_recipients,
notification_reads, notification_attachments, notification_templates,
email_template_versions, files, opcos, partners

// ===== SHAHRUKH: OpCo Portal models =====
reports, report_line_items, report_change_requests,
consolidations, consolidation_items

// ===== HASEEB: Dizlee Portal models =====
reconciliations, reconciliation_items,
invoices, invoice_items, invoice_activity_logs
```

---

## Table definitions

### 1. lookup_types
**Owner: Hussnain**

Generic category table for all status/enum lookups used across the platform.

```sql
CREATE TABLE lookup_types (
  id                  INT            NOT NULL AUTO_INCREMENT,
  code                VARCHAR(64)    NOT NULL,
  name                VARCHAR(255)   NOT NULL,
  description         VARCHAR(500)   NULL,
  created_by_user_id  BIGINT         NULL,
  updated_by_user_id  BIGINT         NULL,
  created_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted          TINYINT(1)     NOT NULL DEFAULT 0,
  deleted_by_user_id  BIGINT         NULL,
  deleted_at          DATETIME       NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_lookup_types_code (code)
);
```

> **Note:** `created_by_user_id` and `updated_by_user_id` are self-referential (reference `users.id`). Add FK constraints after `users` is created. In Prisma, model these as optional relations.

---

### 2. lookups
**Owner: Hussnain**

Generic status/enum value table. All `status_id`, `role_id`, `action_id`, `entity_type_id`, `match_status_id`, `invoice_status_id`, `payment_status_id`, `recipient_type_id` columns across every table reference `lookups.id`.

```sql
CREATE TABLE lookups (
  id                  INT            NOT NULL AUTO_INCREMENT,
  lookup_type_id      INT            NOT NULL,
  code                VARCHAR(64)    NOT NULL,
  label               VARCHAR(255)   NOT NULL,
  sort_order          INT            NOT NULL DEFAULT 0,
  is_active           TINYINT(1)     NOT NULL DEFAULT 1,
  created_by_user_id  BIGINT         NULL,
  updated_by_user_id  BIGINT         NULL,
  created_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted          TINYINT(1)     NOT NULL DEFAULT 0,
  deleted_by_user_id  BIGINT         NULL,
  deleted_at          DATETIME       NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_lookups_type_code (lookup_type_id, code),
  CONSTRAINT fk_lookups_type    FOREIGN KEY (lookup_type_id)      REFERENCES lookup_types(id)
);
```

**Seed these lookup_types and lookup codes at migration time:**

| lookup_type code    | lookup codes (examples)                                                        |
|---------------------|--------------------------------------------------------------------------------|
| USER_ROLE           | ADMIN, CLIENT, OPCO, PARTNER                                                   |
| USER_STATUS         | ACTIVE, INACTIVE, SUSPENDED                                                    |
| REPORT_STATUS       | PENDING, SUBMITTED, CHANGE_REQUESTED, RESUBMITTED, APPROVED                   |
| RECONCILIATION_STATUS | PENDING, IN_PROGRESS, COMPLETED, FAILED                                      |
| MATCH_STATUS        | MATCHED, MISMATCHED, MISSING_IN_PARTNER, MISSING_IN_OPCO                       |
| INVOICE_STATUS      | DRAFT, SENT, ACKNOWLEDGED, SETTLED                                             |
| PAYMENT_STATUS      | UNPAID, PAID, OVERDUE                                                          |
| INVOICE_TYPE        | CLIENT_TO_OPCO, PARTNER_TO_CLIENT                                              |
| CONSOLIDATION_STATUS| PENDING, COMPLETED                                                             |
| NOTIFICATION_STATUS | DRAFT, SENT, SCHEDULED                                                         |
| RECIPIENT_TYPE      | OPCO, PARTNER, USER                                                            |
| AUDIT_ACTION        | USER_CREATED, USER_UPDATED, USER_DELETED, REPORT_UPLOADED, REPORT_CHANGE_REQUESTED, INVOICE_STATUS_UPDATED, INVOICE_PAYMENT_RECORDED, RECONCILIATION_RUN, CONSOLIDATION_GENERATED, SETTINGS_EMAIL_UPDATED, SETTINGS_REMINDERS_UPDATED, SETTINGS_TOLERANCE_UPDATED, SETTINGS_BANK_DETAILS_UPDATED, SETTINGS_OPCO_PARTNER_LINK_UPDATED, EMAIL_TEST_SENT, EMAIL_TEMPLATE_UPDATED |
| AUDIT_ENTITY_TYPE   | USER, REPORT, INVOICE, RECONCILIATION, CONSOLIDATION, SETTINGS, NOTIFICATION  |

---

### 3. users
**Owner: Hussnain**

```sql
CREATE TABLE users (
  id                  BIGINT         NOT NULL AUTO_INCREMENT,
  email               VARCHAR(255)   NOT NULL,
  password_hash       VARCHAR(255)   NULL,
  name                VARCHAR(255)   NULL,
  role_id             INT            NOT NULL,
  status_id           INT            NOT NULL,
  opco_id             BIGINT         NULL,
  partner_id          BIGINT         NULL,
  last_login_at       DATETIME       NULL,
  created_by_user_id  BIGINT         NULL,
  updated_by_user_id  BIGINT         NULL,
  created_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted          TINYINT(1)     NOT NULL DEFAULT 0,
  deleted_by_user_id  BIGINT         NULL,
  deleted_at          DATETIME       NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT fk_users_role      FOREIGN KEY (role_id)      REFERENCES lookups(id),
  CONSTRAINT fk_users_status    FOREIGN KEY (status_id)    REFERENCES lookups(id),
  CONSTRAINT fk_users_opco      FOREIGN KEY (opco_id)      REFERENCES opcos(id),
  CONSTRAINT fk_users_partner   FOREIGN KEY (partner_id)   REFERENCES partners(id)
);
```

**[FIX APPLIED]** `opco_id` and `partner_id` changed from `VARCHAR(64)` to `BIGINT` to match the PK type of `opcos.id` and `partners.id` (both `BIGINT AUTO_INCREMENT`). VARCHAR FK on a BIGINT PK causes implicit type coercion and prevents index use.

> Also add a `password_reset_token VARCHAR(255) NULL` and `password_reset_expires_at DATETIME NULL` to support UC-03 Forgot Password (single-use reset link with 24hr expiry). These are NOT in the original ERD but are required by the SRS use case.

---

### 4. opcos
**Owner: Hussnain**

```sql
CREATE TABLE opcos (
  id                    BIGINT       NOT NULL AUTO_INCREMENT,
  name                  VARCHAR(255) NOT NULL,
  default_currency_id   BIGINT       NOT NULL,
  status_id             INT          NOT NULL,
  created_by_user_id    BIGINT       NULL,
  updated_by_user_id    BIGINT       NULL,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted            TINYINT(1)   NOT NULL DEFAULT 0,
  deleted_by_user_id    BIGINT       NULL,
  deleted_at            DATETIME     NULL,

  PRIMARY KEY (id),
  CONSTRAINT fk_opcos_currency FOREIGN KEY (default_currency_id) REFERENCES currencies(id),
  CONSTRAINT fk_opcos_status   FOREIGN KEY (status_id)           REFERENCES lookups(id)
);
```

**[FIX APPLIED]** `default_currency_id` changed from `VARCHAR(64)` to `BIGINT` to match `currencies.id` (BIGINT AUTO_INCREMENT).

---

### 5. partners
**Owner: Hussnain**

```sql
CREATE TABLE partners (
  id                  BIGINT       NOT NULL AUTO_INCREMENT,
  name                VARCHAR(255) NOT NULL,
  status_id           INT          NOT NULL,
  created_by_user_id  BIGINT       NULL,
  updated_by_user_id  BIGINT       NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted          TINYINT(1)   NOT NULL DEFAULT 0,
  deleted_by_user_id  BIGINT       NULL,
  deleted_at          DATETIME     NULL,

  PRIMARY KEY (id),
  CONSTRAINT fk_partners_status FOREIGN KEY (status_id) REFERENCES lookups(id)
);
```

---

### 6. currencies
**Owner: Hussnain**

```sql
CREATE TABLE currencies (
  id                  BIGINT       NOT NULL AUTO_INCREMENT,
  iso_code            VARCHAR(8)   NOT NULL,
  symbol              VARCHAR(16)  NULL,
  decimal_precision   INT          NOT NULL DEFAULT 2,
  created_by_user_id  BIGINT       NULL,
  updated_by_user_id  BIGINT       NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted          TINYINT(1)   NOT NULL DEFAULT 0,
  deleted_by_user_id  BIGINT       NULL,
  deleted_at          DATETIME     NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_currencies_iso_code (iso_code)
);
```

---

### 7. currency_monthly_rates
**Owner: Hussnain**

```sql
CREATE TABLE currency_monthly_rates (
  id                  INT            NOT NULL AUTO_INCREMENT,
  currency_id         BIGINT         NOT NULL,
  month               INT            NOT NULL,
  year                INT            NOT NULL,
  rate_to_usd         DECIMAL(18,8)  NOT NULL,
  created_by_user_id  BIGINT         NULL,
  updated_by_user_id  BIGINT         NULL,
  created_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted          TINYINT(1)     NOT NULL DEFAULT 0,
  deleted_by_user_id  BIGINT         NULL,
  deleted_at          DATETIME       NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_currency_monthly_rates (currency_id, year, month),
  CONSTRAINT fk_cmr_currency FOREIGN KEY (currency_id) REFERENCES currencies(id)
);
```

**[FIX APPLIED]** `currency_id` changed from `INT` to `BIGINT` to match `currencies.id` (BIGINT AUTO_INCREMENT).

---

### 8. opco_partner_links
**Owner: Hussnain**

Defines which Partners are linked to which OpCos. Drives report upload dropdowns and reconciliation lane availability.

```sql
CREATE TABLE opco_partner_links (
  opco_id             BIGINT       NOT NULL,
  partner_id          BIGINT       NOT NULL,
  created_by_user_id  BIGINT       NULL,
  updated_by_user_id  BIGINT       NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted          TINYINT(1)   NOT NULL DEFAULT 0,
  deleted_by_user_id  BIGINT       NULL,
  deleted_at          DATETIME     NULL,

  PRIMARY KEY (opco_id, partner_id),
  CONSTRAINT fk_opl_opco    FOREIGN KEY (opco_id)    REFERENCES opcos(id),
  CONSTRAINT fk_opl_partner FOREIGN KEY (partner_id) REFERENCES partners(id)
);
```

---

### 9. files
**Owner: Hussnain**

Central file metadata store. All uploaded files (reports, invoices, notification attachments) store their blob key here; the blob itself is stored in Vercel Blob / S3. DB only stores metadata.

```sql
CREATE TABLE files (
  id                    BIGINT         NOT NULL AUTO_INCREMENT,
  filename              VARCHAR(255)   NOT NULL,
  storage_key           VARCHAR(512)   NOT NULL,
  mime_type             VARCHAR(128)   NULL,
  size_bytes            BIGINT         NULL,
  checksum              VARCHAR(128)   NULL,
  uploaded_by_user_id   BIGINT         NULL,
  updated_by_user_id    BIGINT         NULL,
  created_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted            TINYINT(1)     NOT NULL DEFAULT 0,
  deleted_by_user_id    BIGINT         NULL,
  deleted_at            DATETIME       NULL,

  PRIMARY KEY (id),
  CONSTRAINT fk_files_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
);
```

**[FIX APPLIED]** `uploaded_by_user_id` and `updated_by_user_id` changed from `VARCHAR(64)` to `BIGINT` to match `users.id` (BIGINT AUTO_INCREMENT).

---

### 10. app_settings
**Owner: Hussnain**

**Singleton table — exactly ONE row with `id = 1` always.** Never insert a second row. Always use Prisma `upsert({ where: { id: 1 }, ... })`. Seed this row in the migration.

```sql
CREATE TABLE app_settings (
  id                                  INT            NOT NULL DEFAULT 1,
  email_enabled                       BOOLEAN        NOT NULL DEFAULT FALSE,
  smtp_host                           VARCHAR(255)   NULL,
  smtp_port                           INT            NULL,
  sender_address                      VARCHAR(255)   NULL,
  reminders_enabled                   BOOLEAN        NOT NULL DEFAULT FALSE,
  reminder_value                      INT            NULL,
  reminder_unit                       VARCHAR(16)    NULL,
  reconciliation_negligible_percent   DECIMAL(5,2)   NULL,
  opco_invoice_bank_details_json      TEXT           NULL,

  PRIMARY KEY (id)
);

-- Seed row (run immediately after CREATE TABLE in migration):
INSERT INTO app_settings (id) VALUES (1);
```

> `smtp_host`, `smtp_port`, `sender_address` are stored here for the admin settings UI. Actual SMTP credentials (username, password) are NEVER stored in the database — they live in server-side environment variables only (per SRS UC-05 BR-1).
>
> `reminder_unit` is explicitly TBD in the SRS — store whatever string value the admin sets. Do NOT hardcode 'days' in any business logic.

---

### 11. audit_logs
**Owner: Hussnain**

Immutable append-only log. Never update or soft-delete rows. No `updated_at`, no soft-delete columns.

```sql
CREATE TABLE audit_logs (
  id                BIGINT     NOT NULL AUTO_INCREMENT,
  actor_user_id     BIGINT     NOT NULL,
  action_id         INT        NOT NULL,
  entity_type_id    INT        NOT NULL,
  entity_id         BIGINT     NOT NULL,
  message           TEXT       NULL,
  metadata          JSON       NULL,
  created_at        DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_audit_actor       FOREIGN KEY (actor_user_id)  REFERENCES users(id),
  CONSTRAINT fk_audit_action      FOREIGN KEY (action_id)      REFERENCES lookups(id),
  CONSTRAINT fk_audit_entity_type FOREIGN KEY (entity_type_id) REFERENCES lookups(id)
);
```

**[FIX APPLIED]** `actor_user_id` changed from `INT` to `BIGINT` to match `users.id`.
**[FIX APPLIED]** `entity_id` changed from `INT` to `BIGINT` since entities like `reports`, `invoices`, `reconciliations` all use BIGINT PKs.

---

### 12. notifications
**Owner: Hussnain**

```sql
CREATE TABLE notifications (
  id                  BIGINT       NOT NULL AUTO_INCREMENT,
  subject             VARCHAR(255) NOT NULL,
  body                TEXT         NOT NULL,
  status_id           INT          NOT NULL,
  priority            VARCHAR(32)  NULL,
  expires_at          DATETIME     NULL,
  sent_at             DATETIME     NULL,
  created_by_user_id  BIGINT       NULL,
  updated_by_user_id  BIGINT       NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted          TINYINT(1)   NOT NULL DEFAULT 0,
  deleted_by_user_id  BIGINT       NULL,
  deleted_at          DATETIME     NULL,

  PRIMARY KEY (id),
  CONSTRAINT fk_notif_status    FOREIGN KEY (status_id)           REFERENCES lookups(id),
  CONSTRAINT fk_notif_creator   FOREIGN KEY (created_by_user_id)  REFERENCES users(id)
);
```

**[FIX APPLIED]** `created_by_user_id` and `updated_by_user_id` changed from `VARCHAR(64)` to `BIGINT`.

---

### 13. notification_recipients
**Owner: Hussnain**

```sql
CREATE TABLE notification_recipients (
  id                  BIGINT       NOT NULL AUTO_INCREMENT,
  notification_id     BIGINT       NOT NULL,
  recipient_type_id   INT          NOT NULL,
  recipient_id        BIGINT       NOT NULL,
  from_user_id        BIGINT       NOT NULL,
  created_by_user_id  BIGINT       NULL,
  updated_by_user_id  BIGINT       NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted          TINYINT(1)   NOT NULL DEFAULT 0,
  deleted_by_user_id  BIGINT       NULL,
  deleted_at          DATETIME     NULL,

  PRIMARY KEY (id),
  CONSTRAINT fk_nr_notification     FOREIGN KEY (notification_id)   REFERENCES notifications(id),
  CONSTRAINT fk_nr_recipient_type   FOREIGN KEY (recipient_type_id) REFERENCES lookups(id),
  CONSTRAINT fk_nr_from_user        FOREIGN KEY (from_user_id)      REFERENCES users(id)
);
```

**[FIX APPLIED]** Removed the **duplicate `created_at` column** that appeared twice in the ERD. One `created_at` kept.
**[FIX APPLIED]** `notification_id`, `recipient_id`, `from_user_id`, `created_by_user_id`, `updated_by_user_id` changed from `VARCHAR(64)` to `BIGINT`.

---

### 14. notification_reads
**Owner: Hussnain**

```sql
CREATE TABLE notification_reads (
  id              BIGINT     NOT NULL AUTO_INCREMENT,
  notification_id BIGINT     NOT NULL,
  user_id         BIGINT     NOT NULL,
  read_at         DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_notification_reads (notification_id, user_id),
  CONSTRAINT fk_nread_notification FOREIGN KEY (notification_id) REFERENCES notifications(id),
  CONSTRAINT fk_nread_user         FOREIGN KEY (user_id)         REFERENCES users(id)
);
```

**[FIX APPLIED]** `notification_id` and `user_id` changed from `VARCHAR(64)` to `BIGINT`.

---

### 15. notification_attachments
**Owner: Hussnain**

```sql
CREATE TABLE notification_attachments (
  id                  BIGINT     NOT NULL AUTO_INCREMENT,
  notification_id     BIGINT     NOT NULL,
  file_id             BIGINT     NOT NULL,
  created_by_user_id  BIGINT     NULL,
  updated_by_user_id  BIGINT     NULL,
  created_at          DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted          TINYINT(1) NOT NULL DEFAULT 0,
  deleted_by_user_id  BIGINT     NULL,
  deleted_at          DATETIME   NULL,

  PRIMARY KEY (id),
  CONSTRAINT fk_na_notification FOREIGN KEY (notification_id) REFERENCES notifications(id),
  CONSTRAINT fk_na_file         FOREIGN KEY (file_id)         REFERENCES files(id)
);
```

**[FIX APPLIED]** `notification_id`, `file_id`, `created_by_user_id`, `updated_by_user_id` changed from `VARCHAR(64)` to `BIGINT`.

---

### 16. notification_templates
**Owner: Hussnain**

Stores the current active template per template type code. Version history is in `email_template_versions`.

```sql
CREATE TABLE notification_templates (
  id                  INT          NOT NULL AUTO_INCREMENT,
  code                VARCHAR(64)  NOT NULL,
  name                VARCHAR(255) NOT NULL,
  subject             VARCHAR(255) NOT NULL,
  body                TEXT         NOT NULL,
  status_id           INT          NOT NULL,
  created_by_user_id  BIGINT       NULL,
  updated_by_user_id  BIGINT       NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted          TINYINT(1)   NOT NULL DEFAULT 0,
  deleted_by_user_id  BIGINT       NULL,
  deleted_at          DATETIME     NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_notification_templates_code (code),
  CONSTRAINT fk_nt_status FOREIGN KEY (status_id) REFERENCES lookups(id)
);
```

**Seed these template codes:** `PASSWORD_RESET`, `TEST_EMAIL`, `NOTIFICATION_EMAIL`, `INVOICE_SENT`, `REPORT_REMINDER`, `INVOICE_REMINDER`

---

### 17. email_template_versions
**Owner: Hussnain**

**Not in original ERD — added from SRS UC-12.** Stores every saved version of each template to support version history + revert.

```sql
CREATE TABLE email_template_versions (
  id                    BIGINT       NOT NULL AUTO_INCREMENT,
  notification_template_id INT       NOT NULL,
  version               INT          NOT NULL,
  subject               VARCHAR(255) NOT NULL,
  body                  TEXT         NOT NULL,
  is_enabled            TINYINT(1)   NOT NULL DEFAULT 1,
  change_note           VARCHAR(500) NULL,
  created_by_user_id    BIGINT       NULL,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_etv_template_version (notification_template_id, version),
  CONSTRAINT fk_etv_template FOREIGN KEY (notification_template_id) REFERENCES notification_templates(id)
);
```

> Revert = insert a new version row copied from the target old version. Never mutate past version rows.

---

### 18. reports
**Owner: Shahrukh**

```sql
CREATE TABLE reports (
  id                    BIGINT         NOT NULL AUTO_INCREMENT,
  month                 INT            NOT NULL,
  year                  INT            NOT NULL,
  opco_id               BIGINT         NOT NULL,
  partner_id            BIGINT         NOT NULL,
  file_id               BIGINT         NULL,
  currency_id           BIGINT         NOT NULL,
  status_id             INT            NOT NULL,
  version               INT            NOT NULL DEFAULT 1,
  created_by_user_id    BIGINT         NULL,
  uploaded_by_user_id   BIGINT         NULL,
  updated_by_user_id    BIGINT         NULL,
  created_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted            TINYINT(1)     NOT NULL DEFAULT 0,
  deleted_by_user_id    BIGINT         NULL,
  deleted_at            DATETIME       NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_reports (opco_id, partner_id, year, month, version),
  CONSTRAINT fk_reports_opco     FOREIGN KEY (opco_id)             REFERENCES opcos(id),
  CONSTRAINT fk_reports_partner  FOREIGN KEY (partner_id)          REFERENCES partners(id),
  CONSTRAINT fk_reports_file     FOREIGN KEY (file_id)             REFERENCES files(id),
  CONSTRAINT fk_reports_currency FOREIGN KEY (currency_id)         REFERENCES currencies(id),
  CONSTRAINT fk_reports_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id),
  CONSTRAINT fk_reports_status   FOREIGN KEY (status_id)           REFERENCES lookups(id)
);
```

**[FIX APPLIED]** `opco_id`, `partner_id`, `file_id`, `currency_id`, `uploaded_by_user_id`, `updated_by_user_id` changed from `VARCHAR(64)` to `BIGINT`.

---

### 19. report_line_items
**Owner: Shahrukh**

One row per parsed line in the uploaded Excel report.

```sql
CREATE TABLE report_line_items (
  id                      BIGINT         NOT NULL AUTO_INCREMENT,
  report_id               BIGINT         NOT NULL,
  line_number             INT            NOT NULL,
  description             VARCHAR(255)   NULL,
  usage_amount            DECIMAL(18,4)  NULL,
  usage_usd               DECIMAL(18,4)  NULL,
  amount                  DECIMAL(18,4)  NULL,
  exchange_rate           DECIMAL(18,4)  NULL,
  usage_unit              VARCHAR(32)    NULL,
  source_columns          JSON           NULL,
  reconciliation_basis    VARCHAR(64)    NULL,
  is_deleted              TINYINT(1)     NOT NULL DEFAULT 0,
  deleted_by_user_id      BIGINT         NULL,
  deleted_at              DATETIME       NULL,

  PRIMARY KEY (id),
  CONSTRAINT fk_rli_report FOREIGN KEY (report_id) REFERENCES reports(id)
);
```

---

### 20. report_change_requests
**Owner: Shahrukh**

```sql
CREATE TABLE report_change_requests (
  id                    BIGINT       NOT NULL AUTO_INCREMENT,
  report_id             BIGINT       NOT NULL,
  requested_by_user_id  BIGINT       NOT NULL,
  status_id             INT          NOT NULL,
  reason                TEXT         NULL,
  decision_note         TEXT         NULL,
  decided_by_user_id    BIGINT       NULL,
  decided_at            DATETIME     NULL,
  completed_at          DATETIME     NULL,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_rcr_report     FOREIGN KEY (report_id)            REFERENCES reports(id),
  CONSTRAINT fk_rcr_requester  FOREIGN KEY (requested_by_user_id) REFERENCES users(id),
  CONSTRAINT fk_rcr_decider    FOREIGN KEY (decided_by_user_id)   REFERENCES users(id),
  CONSTRAINT fk_rcr_status     FOREIGN KEY (status_id)            REFERENCES lookups(id)
);
```

**[FIX APPLIED]** `report_id`, `requested_by_user_id`, `decided_by_user_id` changed from `VARCHAR(64)` to `BIGINT`.

---

### 21. consolidations
**Owner: Shahrukh**

One row per OpCo+period combination. Generated by Dizlee, but the aggregation logic and data ownership sit with Shahrukh since it reads reports he owns.

```sql
CREATE TABLE consolidations (
  id                  INT            NOT NULL AUTO_INCREMENT,
  opco_id             BIGINT         NOT NULL,
  month               INT            NOT NULL,
  year                INT            NOT NULL,
  status_id           INT            NOT NULL,
  total_amount_usd    DECIMAL(18,4)  NULL,
  generated_at        DATETIME       NOT NULL,
  run_by_user_id      BIGINT         NOT NULL,
  created_by_user_id  BIGINT         NULL,
  updated_by_user_id  BIGINT         NULL,
  created_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted          TINYINT(1)     NOT NULL DEFAULT 0,
  deleted_by_user_id  BIGINT         NULL,
  deleted_at          DATETIME       NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_consolidations (opco_id, year, month),
  CONSTRAINT fk_consol_opco    FOREIGN KEY (opco_id)        REFERENCES opcos(id),
  CONSTRAINT fk_consol_runner  FOREIGN KEY (run_by_user_id) REFERENCES users(id),
  CONSTRAINT fk_consol_status  FOREIGN KEY (status_id)      REFERENCES lookups(id)
);
```

**[FIX APPLIED]** `opco_id`, `run_by_user_id` changed from `INT` to `BIGINT` to match PKs.

---

### 22. consolidation_items
**Owner: Shahrukh**

One row per partner+service+description+unit within a consolidation.

```sql
CREATE TABLE consolidation_items (
  id                  BIGINT         NOT NULL AUTO_INCREMENT,
  consolidation_id    INT            NOT NULL,
  partner_id          BIGINT         NULL,
  partner_name        VARCHAR(255)   NOT NULL,
  service_code        VARCHAR(128)   NULL,
  description         VARCHAR(255)   NOT NULL,
  usage_amount        DECIMAL(18,4)  NOT NULL,
  usage_usd           DECIMAL(18,4)  NULL,
  exchange_rate       DECIMAL(18,4)  NULL,
  usage_unit          VARCHAR(32)    NULL,
  revenue_basis       VARCHAR(64)    NULL,
  created_by_user_id  BIGINT         NULL,
  updated_by_user_id  BIGINT         NULL,
  created_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted          TINYINT(1)     NOT NULL DEFAULT 0,
  deleted_by_user_id  BIGINT         NULL,
  deleted_at          DATETIME       NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_consolidation_items (consolidation_id, partner_name, service_code),
  CONSTRAINT fk_ci_consolidation FOREIGN KEY (consolidation_id) REFERENCES consolidations(id),
  CONSTRAINT fk_ci_partner       FOREIGN KEY (partner_id)       REFERENCES partners(id)
);
```

---

### 23. reconciliations
**Owner: Haseeb**

One row per OpCo+Partner+period reconciliation run.

```sql
CREATE TABLE reconciliations (
  id                    INT            NOT NULL AUTO_INCREMENT,
  opco_id               BIGINT         NOT NULL,
  partner_id            BIGINT         NOT NULL,
  month                 INT            NOT NULL,
  year                  INT            NOT NULL,
  opco_report_id        BIGINT         NOT NULL,
  partner_report_id     BIGINT         NOT NULL,
  status_id             INT            NOT NULL,
  total_variance        DECIMAL(18,4)  NULL,
  matched_count         INT            NULL,
  unmatched_count       INT            NULL,
  run_by_user_id        BIGINT         NOT NULL,
  run_at                DATETIME       NOT NULL,
  created_by_user_id    BIGINT         NULL,
  updated_by_user_id    BIGINT         NULL,
  created_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted            TINYINT(1)     NOT NULL DEFAULT 0,
  deleted_by_user_id    BIGINT         NULL,
  deleted_at            DATETIME       NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_reconciliations (opco_id, partner_id, year, month, opco_report_id, partner_report_id),
  CONSTRAINT fk_recon_opco           FOREIGN KEY (opco_id)           REFERENCES opcos(id),
  CONSTRAINT fk_recon_partner        FOREIGN KEY (partner_id)        REFERENCES partners(id),
  CONSTRAINT fk_recon_opco_report    FOREIGN KEY (opco_report_id)    REFERENCES reports(id),
  CONSTRAINT fk_recon_partner_report FOREIGN KEY (partner_report_id) REFERENCES reports(id),
  CONSTRAINT fk_recon_status         FOREIGN KEY (status_id)         REFERENCES lookups(id),
  CONSTRAINT fk_recon_runner         FOREIGN KEY (run_by_user_id)    REFERENCES users(id)
);
```

**[FIX APPLIED]** `opco_id`, `partner_id`, `opco_report_id`, `partner_report_id`, `run_by_user_id` changed from `INT` to `BIGINT`.

---

### 24. reconciliation_items
**Owner: Haseeb**

One row per service code within a reconciliation run.

```sql
CREATE TABLE reconciliation_items (
  id                    BIGINT         NOT NULL AUTO_INCREMENT,
  reconciliation_id     INT            NOT NULL,
  service_code          VARCHAR(128)   NOT NULL,
  description           VARCHAR(255)   NULL,
  opco_line_item_id     BIGINT         NULL,
  partner_line_item_id  BIGINT         NULL,
  opco_amount           DECIMAL(18,4)  NULL,
  partner_amount        DECIMAL(18,4)  NULL,
  variance_amount       DECIMAL(18,4)  NULL,
  confirmed_value       DECIMAL(18,4)  NULL,
  match_status_id       INT            NOT NULL,
  created_by_user_id    BIGINT         NULL,
  updated_by_user_id    BIGINT         NULL,
  created_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted            TINYINT(1)     NOT NULL DEFAULT 0,
  deleted_by_user_id    BIGINT         NULL,
  deleted_at            DATETIME       NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_reconciliation_items (reconciliation_id, service_code),
  CONSTRAINT fk_ri_reconciliation   FOREIGN KEY (reconciliation_id)   REFERENCES reconciliations(id),
  CONSTRAINT fk_ri_opco_line        FOREIGN KEY (opco_line_item_id)   REFERENCES report_line_items(id),
  CONSTRAINT fk_ri_partner_line     FOREIGN KEY (partner_line_item_id) REFERENCES report_line_items(id),
  CONSTRAINT fk_ri_match_status     FOREIGN KEY (match_status_id)     REFERENCES lookups(id)
);
```

**[FIX APPLIED]** `confirmed_value` changed from `NOT NULL` to `NULL`. The original ERD had it as `NOT NULL` with no default. Per SRS UC-06, the confirmed value is set only after Dizlee runs reconciliation — it is unknown at row-creation time. Rows are created during comparison before confirmation, so the column must be nullable.

---

### 25. invoices
**Owner: Haseeb**

Covers both invoice directions: `CLIENT_TO_OPCO` (Dizlee creates) and `PARTNER_TO_CLIENT` (Partner uploads).

```sql
CREATE TABLE invoices (
  id                    BIGINT       NOT NULL AUTO_INCREMENT,
  invoice_number        VARCHAR(64)  NULL,
  month                 INT          NOT NULL,
  year                  INT          NOT NULL,
  opco_id               BIGINT       NOT NULL,
  partner_id            BIGINT       NULL,
  invoice_type_id       INT          NOT NULL,
  file_id               BIGINT       NULL,
  currency_id           BIGINT       NOT NULL,
  uploaded_by_user_id   BIGINT       NULL,
  invoice_status_id     INT          NOT NULL,
  payment_status_id     INT          NULL,
  sent_at               DATETIME     NULL,
  acknowledged_at       DATETIME     NULL,
  paid_at               DATETIME     NULL,
  settled_at            DATETIME     NULL,
  created_by_user_id    BIGINT       NULL,
  updated_by_user_id    BIGINT       NULL,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted            TINYINT(1)   NOT NULL DEFAULT 0,
  deleted_by_user_id    BIGINT       NULL,
  deleted_at            DATETIME     NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_invoice_number (invoice_number),
  UNIQUE KEY uq_invoices_business_key (opco_id, partner_id, month, year, invoice_type_id),
  CONSTRAINT fk_inv_opco         FOREIGN KEY (opco_id)              REFERENCES opcos(id),
  CONSTRAINT fk_inv_partner      FOREIGN KEY (partner_id)           REFERENCES partners(id),
  CONSTRAINT fk_inv_file         FOREIGN KEY (file_id)              REFERENCES files(id),
  CONSTRAINT fk_inv_uploader     FOREIGN KEY (uploaded_by_user_id)  REFERENCES users(id),
  CONSTRAINT fk_inv_currency     FOREIGN KEY (currency_id)          REFERENCES currencies(id),
  CONSTRAINT fk_inv_type         FOREIGN KEY (invoice_type_id)      REFERENCES lookups(id),
  CONSTRAINT fk_inv_status       FOREIGN KEY (invoice_status_id)    REFERENCES lookups(id),
  CONSTRAINT fk_inv_payment      FOREIGN KEY (payment_status_id)    REFERENCES lookups(id)
);
```

**[FIX APPLIED]** `opco_id`, `partner_id`, `file_id`, `currency_id`, `uploaded_by_user_id` changed from `VARCHAR(64)` to `BIGINT`.
**[FIX APPLIED]** `UNIQUE (opco_id, DATETIME)` was a typo in the ERD (`DATETIME` is a type keyword, not a column). Replaced with the correct business key: `UNIQUE(opco_id, partner_id, month, year, invoice_type_id)`.

---

### 26. invoice_items
**Owner: Haseeb**

Line items on an invoice.

```sql
CREATE TABLE invoice_items (
  id                  BIGINT         NOT NULL AUTO_INCREMENT,
  invoice_id          BIGINT         NOT NULL,
  description         VARCHAR(255)   NOT NULL,
  quantity            DECIMAL(18,4)  NOT NULL,
  unit_price          DECIMAL(18,4)  NOT NULL,
  discount            DECIMAL(18,4)  NULL DEFAULT 0,
  tax                 DECIMAL(18,4)  NULL DEFAULT 0,
  line_total          DECIMAL(18,4)  NOT NULL,
  sort_order          INT            NOT NULL DEFAULT 0,
  created_by_user_id  BIGINT         NULL,
  updated_by_user_id  BIGINT         NULL,
  created_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted          TINYINT(1)     NOT NULL DEFAULT 0,
  deleted_by_user_id  BIGINT         NULL,
  deleted_at          DATETIME       NULL,

  PRIMARY KEY (id),
  CONSTRAINT fk_ii_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);
```

**[FIX APPLIED]** `invoice_id`, `created_by_user_id`, `updated_by_user_id` changed from `VARCHAR(64)` to `BIGINT`.

---

### 27. invoice_activity_logs
**Owner: Haseeb**

Append-only log per invoice status change. No soft delete.

```sql
CREATE TABLE invoice_activity_logs (
  id                BIGINT       NOT NULL AUTO_INCREMENT,
  invoice_id        BIGINT       NOT NULL,
  actor_user_id     BIGINT       NOT NULL,
  action_id         INT          NOT NULL,
  status_field      VARCHAR(32)  NULL,
  previous_status   VARCHAR(64)  NULL,
  new_status        VARCHAR(64)  NULL,
  metadata          JSON         NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_ial_invoice FOREIGN KEY (invoice_id)    REFERENCES invoices(id),
  CONSTRAINT fk_ial_actor   FOREIGN KEY (actor_user_id) REFERENCES users(id),
  CONSTRAINT fk_ial_action  FOREIGN KEY (action_id)     REFERENCES lookups(id)
);
```

**[FIX APPLIED]** `invoice_id` and `actor_user_id` changed from `VARCHAR(64)` to `BIGINT`.

---

## Summary of all fixes applied

| # | Table | What was wrong in ERD | What it is now |
|---|---|---|---|
| 1 | `users` | `opco_id`, `partner_id` typed `VARCHAR(64)` | `BIGINT` |
| 2 | `opcos` | `default_currency_id` typed `VARCHAR(64)` | `BIGINT` |
| 3 | `currency_monthly_rates` | `currency_id` typed `INT` | `BIGINT` |
| 4 | `files` | `uploaded_by_user_id`, `updated_by_user_id` typed `VARCHAR(64)` | `BIGINT` |
| 5 | `audit_logs` | `actor_user_id` typed `INT`, `entity_id` typed `INT` | `BIGINT` both |
| 6 | `notifications` | `created_by_user_id`, `updated_by_user_id` typed `VARCHAR(64)` | `BIGINT` |
| 7 | `notification_recipients` | Duplicate `created_at` column | Removed duplicate |
| 8 | `notification_recipients` | FK columns typed `VARCHAR(64)` | `BIGINT` |
| 9 | `notification_reads` | FK columns typed `VARCHAR(64)` | `BIGINT` |
| 10 | `notification_attachments` | FK columns typed `VARCHAR(64)` | `BIGINT` |
| 11 | `reports` | Multiple FK columns typed `VARCHAR(64)` | `BIGINT` |
| 12 | `report_change_requests` | FK columns typed `VARCHAR(64)` | `BIGINT` |
| 13 | `consolidations` | `opco_id`, `run_by_user_id` typed `INT` | `BIGINT` |
| 14 | `reconciliations` | Multiple FK columns typed `INT` | `BIGINT` |
| 15 | `reconciliation_items` | `confirmed_value NOT NULL` with no default | `NULL` (value set post-reconciliation) |
| 16 | `invoices` | Multiple FK columns typed `VARCHAR(64)` | `BIGINT` |
| 17 | `invoices` | `UNIQUE(opco_id, DATETIME)` — type keyword used as column name | `UNIQUE(opco_id, partner_id, month, year, invoice_type_id)` |
| 18 | `invoice_items` | FK columns typed `VARCHAR(64)` | `BIGINT` |
| 19 | `invoice_activity_logs` | FK columns typed `VARCHAR(64)` | `BIGINT` |
| 20 | — | `email_template_versions` not in ERD | Added from SRS UC-12 (version history + revert for email templates) |
| 21 | `users` | `password_reset_token`, `password_reset_expires_at` not in ERD | Added from SRS UC-03 Forgot Password requirement |

---

## Prisma soft-delete middleware (implement once in Hussnain's setup)

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async findMany({ args, query }) {
        args.where = { ...args.where, is_deleted: 0 }
        return query(args)
      },
      async findFirst({ args, query }) {
        args.where = { ...args.where, is_deleted: 0 }
        return query(args)
      },
    },
  },
})

export default prisma
```

> All three developers import from `lib/prisma.ts`, not directly from `@prisma/client`. This is the only shared lib file — it is infrastructure, not module code. Hussnain creates it during bootstrap.

---

## Migration order

Run migrations in this order (respects FK dependencies):

1. `lookup_types`, `lookups`
2. `currencies`, `opcos`, `partners`
3. `users`, `files`
4. `opco_partner_links`, `currency_monthly_rates`, `app_settings`, `audit_logs`
5. `notifications`, `notification_templates`, `email_template_versions`
6. `notification_recipients`, `notification_reads`, `notification_attachments`
7. `reports`, `report_line_items`, `report_change_requests`
8. `consolidations`, `consolidation_items`
9. `reconciliations`, `reconciliation_items`
10. `invoices`, `invoice_items`, `invoice_activity_logs`
