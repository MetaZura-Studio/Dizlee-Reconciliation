# Production audit

**Date:** 2026-09-02  
**Overall status:** **CONDITIONALLY READY** (code HIGH remediations applied on `Production-check`; infra still required)  
**Note:** Findings below were identified pre-fix. See **Remediation status** and [`PRODUCTION-READINESS-REPORT.md`](PRODUCTION-READINESS-REPORT.md) for what was fixed vs what remains at deploy time.

**Related:** [`docs/PRE_PRODUCTION_SECURITY_CHECKLIST.md`](docs/PRE_PRODUCTION_SECURITY_CHECKLIST.md) · [`docs/CD_VERCEL_TIDB.md`](docs/CD_VERCEL_TIDB.md) · [`SECURITY-AUDIT.md`](SECURITY-AUDIT.md) · [`API-INVENTORY.md`](API-INVENTORY.md) · [`PRODUCTION-CHECKLIST.md`](PRODUCTION-CHECKLIST.md)  
**Future host:** Contabo VPS (Phase 2) — [`docs/CD_CONTABO_VPS.md`](docs/CD_CONTABO_VPS.md)

---

## Remediation status (post-hardening)

| ID | Status |
|----|--------|
| SEC-EXCEL-001 | **Fixed in code** — ZIP central-directory uncompressed size/entry caps before exceljs |
| REL-CRON-001 | **Fixed in code** — `cron_job_runs` ledger + unique claim per step/day |
| SEC-RATE-001 | **Fixed in code** — DB-backed `auth_rate_limit_buckets` (memory in tests/dev override) |
| SEC-AUTH-001 | **Fixed in code** — dummy bcrypt on missing/inactive login |
| SEC-UPLOAD-001 | **Fixed in code** — magic bytes on parse-preview + notification attachments |
| REL-PRISMA-001 | **Fixed in code** — `RevenueShareReport` added to soft-delete extension |
| OPS-HEALTH-001 | **Fixed in code** — `GET /api/health/ready` (DB + Blob-on-Vercel) |
| OPS-DB-001 | **Docs / deploy** — set Prisma `connection_limit` (and pooler if used) |
| OPS-MIGRATE-001 | **Docs / deploy** — avoid shared preview DB + concurrent migrate |
| SEC-DEPS-001 | **Accepted risk** — triage; no blind exceljs downgrade |
| OPS-OBS-001 | **Remaining** — wire APM/error tracking in prod |
| SEC-SEED-001 | **Ops** — never ship seed passwords to production |

---

## Executive summary

The app is **not production-ready** while **HIGH** residual risks remain around Excel parse DoS, cron non-idempotency, and in-memory rate limits (plus undocumented TiDB/Prisma pooling for serverless).

**Auth / IDOR posture is generally solid:** fail-closed middleware, role-prefixed API gates, OpCo/Partner tenant scoping, private Blob, bcrypt (12 rounds), hashed password-reset tokens, CSP + HSTS, no `NEXT_PUBLIC_*` secrets in the tree.

| Area | Verdict |
|------|---------|
| Authentication / sessions | Strong baseline; login timing oracle (MED/HIGH) |
| Authorization / IDOR | Strong for OpCo/Partner; Dizlee intentionally cross-tenant |
| Uploads / Excel | HIGH DoS via exceljs; magic-byte gaps on preview + notification attachments |
| Rate limiting | HIGH on multi-instance (Vercel); auth-only today |
| Cron / reminders | HIGH duplicate-send risk |
| Ops (DB pool, migrate, health, APM) | Gaps for serverless production |
| Dependencies | 15 npm audit findings — triage, do not blind-upgrade |

---

## Findings

### SEC-EXCEL-001 — Excel zip bomb / memory DoS

| Field | Value |
|-------|--------|
| **Category** | Security / Availability |
| **Severity** | HIGH |
| **File** | `lib/platform/excel/parse-report.ts` (and callers via exceljs `workbook.xlsx.load`) |
| **Problem** | Uploads allow up to **20 MB** (`MAX_EXCEL_UPLOAD_BYTES` in `lib/platform/excel-upload.ts`). exceljs fully expands ZIP/XML into memory with no row/cell/inflate caps in the parse path. |
| **Why dangerous** | A crafted `.xlsx` can expand far beyond 20 MB and OOM or stall a serverless function / instance. |
| **Scenario** | Authenticated OpCo/Partner (or Dizlee path that parses) uploads a zip-bomb workbook to upload or parse-preview; instance dies or times out under load. |
| **Recommended fix** | Cap inflate/rows/cells; stream or reject pathological workbooks; consider lower size limit + CPU time budget; fail closed on parse timeout. |
| **Must-fix-before-prod** | **Y** |

### REL-CRON-001 — No cron idempotency

| Field | Value |
|-------|--------|
| **Category** | Reliability |
| **Severity** | HIGH |
| **File** | `lib/admin/automatic-submission-reminders.ts` (+ `app/api/admin/cron/submission-reminders/route.ts`) |
| **Problem** | Cron run fires due schedule steps and broadcasts with **no durable “already sent for (step, period, day)” lock**. Retries / overlapping invocations can re-send. |
| **Why dangerous** | Duplicate intimations/reminders to OpCo/Partner audiences; operational noise and possible email provider throttling. |
| **Scenario** | Vercel retries a slow cron, or two deploys overlap; same due steps send twice. |
| **Recommended fix** | Persist send ledger / claim rows (unique key on schedule step + period + run date) before broadcast; make handler idempotent. |
| **Must-fix-before-prod** | **Y** |

### SEC-RATE-001 — In-memory rate limits

| Field | Value |
|-------|--------|
| **Category** | Security |
| **Severity** | HIGH (on multi-instance / serverless) |
| **File** | `lib/auth/rate-limit.ts` |
| **Problem** | Sliding-window buckets live in a process `Map`. Vercel runs many instances; limits do not share state. Most non-auth APIs have **no** rate limit (see `API-INVENTORY.md`). |
| **Why dangerous** | Auth brute-force and abuse budgets reset per instance; upload/broadcast endpoints unprotected. |
| **Scenario** | Attacker fans out login attempts across edges; each instance allows a full quota. |
| **Recommended fix** | Shared store (e.g. Upstash Redis) for auth limits; add light limits on upload + notification broadcast POSTs. |
| **Must-fix-before-prod** | **Y** (for multi-instance prod) |

### SEC-AUTH-001 — Login timing enumeration

| Field | Value |
|-------|--------|
| **Category** | Security |
| **Severity** | MED / HIGH |
| **File** | `lib/auth/options.ts` (`authorize`) |
| **Problem** | Missing / inactive users return `null` **before** `verifyPassword` (bcrypt). Existing users always pay bcrypt cost. |
| **Why dangerous** | Response-time oracle can distinguish valid emails from invalid ones. |
| **Scenario** | Attacker times `/api/auth/*` or `/api/admin-auth/*` logins to harvest account existence. |
| **Recommended fix** | Always run bcrypt against a dummy hash when user is missing/inactive; unify error path timing. |
| **Must-fix-before-prod** | **Y** (recommended; especially Admin) |

### SEC-UPLOAD-001 — Magic bytes missing on parse-preview + notification attachments

| Field | Value |
|-------|--------|
| **Category** | Security |
| **Severity** | MED |
| **File** | `app/api/opco/reports/parse-preview/route.ts`, `app/api/partner/reports/parse-preview/route.ts`, `app/api/dizlee/notifications/attachments/route.ts` |
| **Problem** | Final OpCo/Partner upload/reupload paths call `assertExcelBufferMagic` / PDF magic. Parse-preview relies on extension/MIME validation only. Notification attachments allowlist by name/MIME — **no content magic**. |
| **Why dangerous** | Polyglot / mislabeled files reach parsers or storage; weaker defense-in-depth than upload routes. |
| **Scenario** | User posts non-ZIP bytes as `.xlsx` to parse-preview (error/DoS path) or attaches a mislabeled file to broadcasts. |
| **Recommended fix** | Reuse `assertExcelBufferMagic` on parse-preview; add magic checks for allowlisted notification types where feasible. |
| **Must-fix-before-prod** | **N** (should fix soon; uploads already hardened) |

### OPS-DB-001 — TiDB / Prisma connection pooling undocumented for serverless

| Field | Value |
|-------|--------|
| **Category** | Operations |
| **Severity** | HIGH |
| **File** | `docs/CD_VERCEL_TIDB.md`, `.env.example`, Prisma `DATABASE_URL` usage |
| **Problem** | No documented `connection_limit` / pooler guidance for Vercel ↔ TiDB Serverless. Each function instance may open connections. |
| **Why dangerous** | Connection exhaustion, intermittent 500s under concurrency. |
| **Scenario** | Traffic spike or many concurrent cron/API invocations opens too many MySQL connections. |
| **Recommended fix** | Document and set URL params (e.g. `connection_limit=1` or TiDB/Prisma pooler pattern); validate under load. |
| **Must-fix-before-prod** | **Y** |

### OPS-MIGRATE-001 — `build:vercel` migrates on every build

| Field | Value |
|-------|--------|
| **Category** | Operations |
| **Severity** | MED |
| **File** | `package.json` (`build:vercel`: `prisma migrate deploy && next build`) |
| **Problem** | Every Vercel build applies migrations against the env’s DB. Preview/prod misconfiguration or concurrent builds can race. |
| **Why dangerous** | Accidental migrate against wrong DB; build flakiness; longer/fragile deploys. |
| **Scenario** | Preview env points at production `DATABASE_URL`, or two builds migrate concurrently. |
| **Recommended fix** | Gate migrate to production/staging only; prefer explicit migrate job; never share prod DB with Preview. |
| **Must-fix-before-prod** | **N** (process control required before prod) |

### OPS-HEALTH-001 — `/api/health` is liveness only

| Field | Value |
|-------|--------|
| **Category** | Operations |
| **Severity** | MED |
| **File** | `app/api/health/route.ts` |
| **Problem** | Returns static `{ status: "ok" }` — no DB, Blob, or SMTP probe. |
| **Why dangerous** | Load balancer “healthy” while app cannot serve real traffic. |
| **Scenario** | TiDB outage; health still 200; users get API failures. |
| **Recommended fix** | Optional authenticated or internal readiness check (DB ping); keep public liveness shallow. |
| **Must-fix-before-prod** | **N** |

### REL-PRISMA-001 — Soft-delete auto-filter gaps

| Field | Value |
|-------|--------|
| **Category** | Reliability / Consistency |
| **Severity** | MED |
| **File** | `lib/prisma.ts` (`SOFT_DELETE_MODELS`) |
| **Problem** | `RevenueShareReport` (and similar models with `isDeleted` columns) are **not** in the soft-delete extension set. Routine `findMany`/`findFirst` may return deleted rows unless callers filter manually. |
| **Why dangerous** | Soft-deleted RS reports (or peers) can reappear in lists/downloads. |
| **Scenario** | Report soft-deleted after regenerate/invalidation still returned by an unfiltered query. |
| **Recommended fix** | Add `RevenueShareReport` (and other soft-delete models) to `SOFT_DELETE_MODELS`; audit `findUnique` paths. |
| **Must-fix-before-prod** | **N** (fix if soft-delete is used in prod flows) |

### SEC-DEPS-001 — npm audit: 15 vulnerabilities

| Field | Value |
|-------|--------|
| **Category** | Security / Supply chain |
| **Severity** | MED |
| **File** | `package-lock.json` / transitive deps |
| **Problem** | `npm audit` reports **15** issues (3 moderate, 11 high, 1 critical), including **sharp**, **undici**, **exceljs→uuid**, plus others (nodemailer, postcss, etc.). |
| **Why dangerous** | Some findings are reachable via upload/image/mail stacks; blind `npm audit fix --force` can break Next/Prisma/exceljs. |
| **Scenario** | Force-upgrade pulls exceljs@3.x or next@16 outside intended range. |
| **Recommended fix** | Triage by reachability; upgrade carefully with regression tests; **do not blind-upgrade**. |
| **Must-fix-before-prod** | **N** (triage HIGH/critical reachable ones before prod) |

### OPS-OBS-001 — No APM

| Field | Value |
|-------|--------|
| **Category** | Operations |
| **Severity** | MED |
| **File** | (ops gap — not instrumented in app) |
| **Problem** | No application performance monitoring / structured prod alerting wired in-repo. |
| **Why dangerous** | Slow queries, 5xx spikes, and auth abuse are hard to see until users report. |
| **Scenario** | Excel DoS or DB pool exhaustion goes unnoticed. |
| **Recommended fix** | Add APM/logs (e.g. Vercel + OpenTelemetry/Sentry) and alert on 5xx / latency / login failures. |
| **Must-fix-before-prod** | **N** (strongly recommended) |

### SEC-SEED-001 — Seed default password

| Field | Value |
|-------|--------|
| **Category** | Security |
| **Severity** | LOW / MED |
| **File** | `prisma/seed.ts` (`Password123!`) |
| **Problem** | Dev/seed users share a well-known password documented in handoff/sample READMEs. |
| **Why dangerous** | If seed runs (or leftovers) in a reachable environment, accounts are trivial to take over. |
| **Scenario** | Staging seeded and exposed; attacker logs in as `admin@dizlee.com` / OpCo samples. |
| **Recommended fix** | Never seed production; rotate/disable seed users; enforce password change. |
| **Must-fix-before-prod** | **Y** (process: no seed defaults in prod) |

---

## Positive controls (INFO)

| Control | Evidence |
|---------|----------|
| CSP (nonce) + HSTS | `middleware.ts`, `lib/platform/csp.ts`, `next.config.ts` |
| No `NEXT_PUBLIC_*` secrets | No `NEXT_PUBLIC_` usage found in app source |
| Fail-closed API middleware | `lib/auth/api-access.ts` — unknown `/api/*` denied |
| Tenant IDOR defenses | OpCo/Partner routes scoped by session org IDs |
| Private Blob | `lib/platform/storage/object-storage.ts` `access: "private"` |
| bcrypt rounds 12 | `lib/auth/password.ts` |
| Hashed reset tokens | `lib/auth/password-reset.ts` (SHA-256 of token) |
| Auth rate limits present (single-instance) | `lib/auth/rate-limit.ts` on auth routes |
| Magic bytes on main Excel/PDF uploads | upload/reupload + admin import paths |

---

## Go-live gate

**Do not ship** until HIGH items marked **Must-fix-before-prod = Y** are addressed (or explicitly accepted with compensating controls): **SEC-EXCEL-001**, **REL-CRON-001**, **SEC-RATE-001**, **OPS-DB-001**, **SEC-SEED-001** (process), and preferably **SEC-AUTH-001**.

Track fixes on `Production-check`; re-run smoke tests from [`docs/PRE_PRODUCTION_SECURITY_CHECKLIST.md`](docs/PRE_PRODUCTION_SECURITY_CHECKLIST.md) after remediations.
