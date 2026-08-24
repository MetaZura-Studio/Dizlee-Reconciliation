# Database constraints guide

Use this document to review what the database already enforces, what is still only enforced in application code, and what should be added through future Prisma SQL migrations.

**Source of truth:** `prisma/schema.prisma` and `prisma/migrations/`

**Related docs:** [`ERD_PENDING_UPDATES.md`](ERD_PENDING_UPDATES.md) · [`CD_VERCEL_TIDB.md`](CD_VERCEL_TIDB.md) · [`AUTH_SESSION.md`](AUTH_SESSION.md)

---

## 1. Goal

Application validation in `app/api/*` and `lib/*` is necessary, but it is not sufficient on its own. Database constraints protect the system when:

- a bug bypasses the normal API path
- two concurrent requests race each other
- a script writes directly to the database
- a future developer forgets to keep one API validation rule in sync

For this project, the right approach is:

1. Keep **authorization and tenant access** in the middle layer
2. Keep **complex workflow rules** in app code and transactions
3. Move **stable single-table integrity rules** into the database

---

## 2. Current state summary

### What is already enforced well

- Primary keys on all core tables
- Foreign keys across most parent/child relationships
- Composite uniqueness on several business keys
- `NOT NULL` on core required columns
- A few targeted indexes

### What is still light

- Almost no `CHECK` constraints
- Several business enums are stored as plain `VARCHAR`
- Some rules depend only on app-side Zod validation
- Soft-delete behavior is not always aligned with unique keys

### Platform note

This app uses **Prisma + MySQL-compatible TiDB**. In practice that means:

- `UNIQUE`, `NOT NULL`, and `FOREIGN KEY` are easy to express in Prisma
- `CHECK` constraints should usually be added via **raw SQL migrations**
- Triggers are possible, but should be used sparingly because they are harder to reason about and maintain alongside Prisma

---

## 3. Constraints already in the schema

The schema already has important protections. These should be preserved and documented, not replaced.

### Identity and reference integrity

| Table | Current constraint |
|------|--------------------|
| `lookup_types` | unique `code` |
| `lookups` | unique `(lookup_type_id, code)` |
| `currencies` | unique `iso_code` |
| `users` | unique `email` |
| `opco_partner_links` | composite PK `(opco_id, partner_id)` |
| `opco_report_mappings` | unique `opco_id` |
| `currency_monthly_rates` | unique `(currency_id, year, month)` |
| `notification_reads` | unique `(notification_id, user_id)` |
| `email_template_versions` | unique `(notification_template_id, version)` |

### Business-key uniqueness

| Table | Current constraint | Purpose |
|------|--------------------|---------|
| `service_partner_maps` | unique `(opco_id, service_key)` | same service can map differently per OpCo |
| `reports` | unique `(opco_id, partner_id, year, month, version)` | one OpCo-side report and one Partner-side report per lane/period |
| `consolidations` | unique `(opco_id, year, month)` | one consolidation per OpCo/month |
| `consolidation_items` | unique `(consolidation_id, partner_name, service_code)` | no duplicate grouped rows |
| `reconciliations` | unique `(opco_id, partner_id, year, month, opco_report_id, partner_report_id)` | one run result per report pair |
| `reconciliation_items` | unique `(reconciliation_id, service_code)` | one result row per service per run |
| `invoices` | unique `(partner_id, month, year, invoice_type_id)` | partner invoice lane |
| `invoices` | unique `(opco_id, month, year, invoice_type_id)` | Dizlee-to-OpCo invoice lane |

### Foreign keys

The schema already protects most parent-child relationships:

- `reports` → `opcos`, `partners`, `files`, `currencies`, `lookups`
- `report_line_items` → `reports`
- `reconciliations` → `opcos`, `partners`, `reports`, `users`, `lookups`
- `invoices` → `opcos`, `partners`, `files`, `currencies`, `lookups`
- `service_partner_maps` → `opcos`, `partners`
- `opco_report_mappings` → `opcos`, `files`
- `notification_*` tables → their parents

This is already a good baseline.

---

## 4. Rules currently enforced only in application code

These are the most important gaps. They are real business rules today, but many of them are not yet protected by the database.

### Period sanity

The app validates these in Zod and service code:

- `month` must be `1..12`
- `year` must be within a reasonable range
- some user flows additionally block future periods

**Current gap:** the database does not reject `month = 99` or `year = 0`.

### Percent / numeric bounds

Examples already validated in code or implied by the domain:

- `opcos.vat_percent` should be `0..100`
- `app_settings.reconciliation_negligible_percent` should be `0..100`
- item quantities and prices should not be negative
- exchange rates should be positive

**Current gap:** DB types constrain shape, not semantics.

### String-backed enums

The app treats these columns as enums even though they are plain strings:

- `opco_report_mappings.partner_mode`
- `notification_templates.category`
- `invoice_activity_logs.status_field`
- some text status snapshots in activity/audit tables

**Current gap:** invalid values can be inserted if app code is bypassed.

### Report side version

The app defines:

```ts
OPCO_REPORT_VERSION = 1
PARTNER_REPORT_VERSION = 2
```

in `lib/platform/reports/sides.ts`.

**Current gap:** the DB does not stop `version = 3`.

### User role/org assignment shape

Admin validation currently enforces rules like:

- `opco` user must have `opco_id`
- `partner` user must have `partner_id`
- `client` user should not be tied to an OpCo or Partner

**Current gap:** the DB sees only `role_id`, `opco_id`, `partner_id` columns and cannot easily enforce lookup-driven role semantics without triggers or denormalization.

### Link-dependent lane rules

The app enforces:

- Partner uploads only for linked OpCos
- OpCo reports should only exist for linked OpCo/Partner lanes

**Current gap:** some of these are not expressed as composite FKs yet.

---

## 5. Recommended future constraints

This section is the full recommendation set, not just Phase 1.

## 5.1 High-confidence `CHECK` constraints

These are the safest additions because they are single-table, stable, and already match app behavior.

### Period bounds

Apply to:

- `reports`
- `invoices`
- `reconciliations`
- `consolidations`
- `currency_monthly_rates`

Recommended checks:

```sql
CHECK (`month` BETWEEN 1 AND 12)
CHECK (`year` BETWEEN 2000 AND 2100)
```

Notes:

- The DB should enforce broad validity, not "not in the future". Future-period rules can remain app-side because they depend on runtime date.

### Percent bounds

Apply to:

- `opcos.vat_percent`
- `app_settings.reconciliation_negligible_percent`
- optionally `report_line_items.revenue_share_percent`

Recommended checks:

```sql
CHECK (`vat_percent` >= 0 AND `vat_percent` <= 100)
CHECK (
  `reconciliation_negligible_percent` IS NULL
  OR (
    `reconciliation_negligible_percent` >= 0
    AND `reconciliation_negligible_percent` <= 100
  )
)
CHECK (
  `revenue_share_percent` IS NULL
  OR (`revenue_share_percent` >= 0 AND `revenue_share_percent` <= 100)
)
```

### Positive / non-negative monetary values

Candidates:

- `currency_monthly_rates.rate_to_usd > 0`
- `invoice_items.quantity >= 0`
- `invoice_items.unit_price >= 0`
- `invoice_items.discount >= 0`
- `invoice_items.tax >= 0`
- `invoice_items.line_total >= 0`
- `consolidation_items.usage_amount >= 0`
- optional money columns in `report_line_items`

Recommended posture:

- Require strictly positive where zero is not meaningful, e.g. exchange rate
- Require non-negative where zero is legitimate

### App settings singleton

`app_settings` is modeled as a singleton row with `id = 1`.

Recommended check:

```sql
CHECK (`id` = 1)
```

This prevents accidental second-row inserts if some external script bypasses the intended pattern.

### Report version enum

Recommended check:

```sql
CHECK (`version` IN (1, 2))
```

This aligns the DB with `lib/platform/reports/sides.ts`.

### String-backed enum checks

Recommended checks:

```sql
CHECK (`partner_mode` IN ('UPLOAD_PICKER', 'EXCEL_COLUMN', 'SERVICE_PARTNER_MAP'))
CHECK (`category` IN ('INTIMATION', 'REMINDER', 'OTHER'))
```

These are strong candidates because they already behave as enums in the application.

---

## 5.2 Composite foreign keys to encode lane validity

These add meaningful integrity but need careful review because of soft-delete behavior.

### `reports (opco_id, partner_id)` → `opco_partner_links`

Recommended idea:

```sql
ALTER TABLE `reports`
  ADD CONSTRAINT `fk_reports_opco_partner_link`
  FOREIGN KEY (`opco_id`, `partner_id`)
  REFERENCES `opco_partner_links` (`opco_id`, `partner_id`);
```

### Benefits

- DB refuses report rows for non-linked lanes
- Backs up app-side checks in OpCo and Partner upload paths

### Caveat

`opco_partner_links` uses soft-delete columns (`is_deleted`, `deleted_at`) but the primary key row still exists. So:

- if "unlink" only sets `is_deleted = true`, the FK still sees the link as valid
- if the product expects unlinked lanes to be invalid immediately at DB level, unlinking must hard-delete the link row or use a different design

### Recommendation

Adopt this FK **only after** the team agrees on the lifecycle of `opco_partner_links`.

---

## 5.3 Soft-delete-aware uniqueness

This is the biggest design topic beyond simple checks.

### Current behavior

Many unique constraints ignore `is_deleted`, for example:

- `users.email`
- `service_partner_maps (opco_id, service_key)`
- `reports (opco_id, partner_id, year, month, version)`

That means soft-deleted rows still reserve their unique key.

### Why this matters

Sometimes this is correct:

- preserving `users.email` forever may be acceptable
- preserving one lane per report side may be desired

Sometimes it becomes painful:

- recreating a previously deleted user with the same email
- recreating a deleted map instead of restoring it

### Design options

#### Option A: keep current unique constraints

Pros:

- simple and strong
- no schema trickery

Cons:

- soft-deleted records still block reuse

#### Option B: generated-column active-only unique

MySQL/TiDB-friendly pattern:

```sql
active_email = CASE WHEN is_deleted THEN NULL ELSE email END
UNIQUE(active_email)
```

or for composites:

```sql
active_service_key = CASE WHEN is_deleted THEN NULL ELSE service_key END
UNIQUE(opco_id, active_service_key)
```

Pros:

- only active rows participate in uniqueness

Cons:

- more complex migrations
- more columns/indexes to maintain

#### Option C: keep DB simple, solve in app

Pros:

- no migration complexity

Cons:

- less expressive data integrity
- more room for edge-case bugs

### Recommendation by table

| Table | Recommendation |
|------|----------------|
| `users` | decide intentionally whether deleted emails are reusable |
| `service_partner_maps` | active-only uniqueness is reasonable if admins need delete/recreate workflows |
| `reports` | current unique likely fine because reupload updates the same business lane rather than inserting new versions forever |
| `invoices` | current unique likely fine; deleting and recreating same billing lane should be a conscious business action |

---

## 5.4 Role-shape constraints for users

Today the app enforces role/org assignments in `lib/admin/validation/users.ts`.

Desired rules:

- `admin` user: no `opco_id`, no `partner_id`
- `client` user: no `opco_id`, no `partner_id`
- `opco` user: `opco_id` required, `partner_id` null
- `partner` user: `partner_id` required, `opco_id` null

### Why this is hard at DB level

`users.role_id` points to `lookups.id`, not a native enum. A `CHECK` constraint cannot join to `lookups.code`.

### Possible approaches

#### Option A: keep this in app validation only

Simplest and currently acceptable.

#### Option B: denormalize role code onto `users`

Store `role_code` directly on `users` and keep lookup for display/admin purposes.

Then a DB check becomes easy:

```sql
CHECK (
  (role_code = 'admin' AND opco_id IS NULL AND partner_id IS NULL)
  OR (role_code = 'client' AND opco_id IS NULL AND partner_id IS NULL)
  OR (role_code = 'opco' AND opco_id IS NOT NULL AND partner_id IS NULL)
  OR (role_code = 'partner' AND partner_id IS NOT NULL AND opco_id IS NULL)
)
```

#### Option C: trigger-based enforcement

Possible, but heavier operationally and harder to maintain with Prisma.

### Recommendation

Keep this app-side for now unless user-role corruption becomes a recurring issue.

---

## 5.5 Reconciliation consistency constraints

There are several important logical rules in reconciliation:

- `reconciliations.opco_id` should match the linked OpCo on `opco_report_id`
- `reconciliations.partner_id` should match the linked Partner on `partner_report_id`
- period on reconciliation should match period on both reports
- report versions should match expected sides: OpCo report version `1`, Partner report version `2`

### Why these are difficult in pure constraints

These are cross-row and cross-table consistency rules. Standard FKs do not compare non-key business columns.

### Options

- enforce in application transactions only
- add triggers
- redesign so reconciliation references a lane table with stricter invariants

### Recommendation

Keep these in app code for now. Do not rush trigger-based enforcement unless reconciliation data corruption is an observed issue.

---

## 5.6 Notification and template constraints

Good additional candidates:

- `notifications.priority` check if the app treats it as a fixed set
- `notification_templates.category` check as above
- optional uniqueness for notification attachment rows if duplicate attachment links should be forbidden

Candidate:

```sql
UNIQUE(notification_id, file_id)
```

for `notification_attachments` if the same file should not be attached twice to the same notification.

---

## 5.7 Invoice-side business constraints

Invoices currently encode two different flows in one table:

- Partner → Dizlee
- Dizlee → OpCo

The table already has split unique constraints, but additional shape rules are possible.

### Desired rules

- Partner invoice should require `partner_id` and normally allow `opco_id` to be null
- Dizlee→OpCo invoice should require `opco_id`
- depending on invoice type, some combinations should be rejected

### Difficulty

As with user roles, `invoice_type_id` points to `lookups`, so DB-level semantic checks are awkward without denormalization or triggers.

### Recommendation

Keep invoice-type-dependent shape rules in app code for now. Add only generic numeric/range constraints in the DB.

---

## 6. Suggested implementation roadmap

This is the full recommended rollout, not just the first pass.

### Stage A: safe and immediate

Add SQL `CHECK` constraints for:

- month range
- year range
- report version
- VAT percent
- reconciliation tolerance percent
- template category
- partner mode
- positive exchange rates / non-negative invoice item math
- app settings singleton

### Stage B: data model strengthening

Review and possibly add:

- composite FK from `reports (opco_id, partner_id)` to `opco_partner_links`
- unique `(notification_id, file_id)` on `notification_attachments`
- active-only uniqueness for selected soft-delete tables if product needs it

### Stage C: heavier design decisions

Only if justified:

- denormalized role code / invoice type code for easier DB checks
- generated columns for active-only unique indexes
- triggers for reconciliation/user-shape invariants

---

## 7. Migration strategy

Do not add all constraints in one shot without checking existing data.

### Step 1: audit live data

Before adding a new constraint, run queries like:

```sql
SELECT * FROM reports WHERE month NOT BETWEEN 1 AND 12;
SELECT * FROM reports WHERE version NOT IN (1, 2);
SELECT * FROM opcos WHERE vat_percent < 0 OR vat_percent > 100;
SELECT * FROM notification_templates WHERE category NOT IN ('INTIMATION', 'REMINDER', 'OTHER');
SELECT * FROM opco_report_mappings WHERE partner_mode NOT IN ('UPLOAD_PICKER', 'EXCEL_COLUMN', 'SERVICE_PARTNER_MAP');
```

### Step 2: clean bad rows first

Fix or backfill bad data before deploying `ALTER TABLE ... ADD CONSTRAINT`.

### Step 3: add migrations in small batches

Recommended batching:

1. range and enum checks
2. numeric checks
3. optional uniqueness additions
4. any composite FK additions

### Step 4: keep error mapping friendly

When DB constraints reject a write, APIs should translate Prisma/driver errors into usable messages instead of generic 500s.

---

## 8. What should stay in application code

Not every rule belongs in the database.

Keep these primarily in the middle layer:

- authentication and role authorization
- tenant scoping by current session
- future-period blocking
- workflow state transitions
- reconciliation business logic
- approval / reupload lifecycle rules
- email/notification delivery rules
- "only this role can perform this action"

Database constraints support these rules, but they do not replace them.

---

## 9. Recommended manager-facing summary

Use this summary when discussing the plan:

> The database already enforces primary keys, foreign keys, and several core uniqueness rules for reports, invoices, links, and service maps. The main gap is that many semantic rules still live only in the application layer. We should add database `CHECK` constraints for stable single-table rules such as month/year bounds, percentage ranges, report side version, and string-backed enum values. After that, we can evaluate stronger composite constraints such as linking reports to valid OpCo-partner lanes and handling soft-delete-aware uniqueness where product workflows require reuse. More complex cross-table workflow rules should remain in application transactions unless we intentionally introduce triggers or denormalized columns.

---

## 10. Action checklist

### Ready now

- [ ] Add `CHECK` constraints for month/year on period-based tables
- [ ] Add `CHECK` for `reports.version IN (1, 2)`
- [ ] Add `CHECK` for `opcos.vat_percent`
- [ ] Add `CHECK` for `app_settings.reconciliation_negligible_percent`
- [ ] Add `CHECK` for `notification_templates.category`
- [ ] Add `CHECK` for `opco_report_mappings.partner_mode`
- [ ] Add numeric positivity/non-negative checks where domain-safe

### Needs design decision

- [ ] Decide whether deleted `users.email` should be reusable
- [ ] Decide whether deleted `service_partner_maps` should stop blocking same-key recreate
- [ ] Decide whether `opco_partner_links` unlink should hard-delete or soft-delete
- [ ] Based on that, decide whether to add composite FK from `reports` to `opco_partner_links`

### Later if needed

- [ ] Consider generated columns for active-only unique indexes
- [ ] Consider denormalized role/type code columns if DB-level semantic checks become important
- [ ] Consider triggers only for repeated real-world integrity issues

---

## 11. Current recommendation

The strongest immediate improvement is to add **database `CHECK` constraints for stable scalar rules** and document the intended behavior of **soft-delete + uniqueness**. That gives the best integrity gain with the lowest migration risk.

The next most valuable design decision is whether report rows should be backed by a **real DB-level OpCo/Partner lane FK** through `opco_partner_links`. That can be very strong, but only if the team is clear on link deletion semantics.
