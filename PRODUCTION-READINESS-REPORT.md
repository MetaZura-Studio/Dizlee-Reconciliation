# Production readiness report

**Branch:** `Production-check`  
**Date:** 2026-09-02  
**Target (Phase 1):** Vercel + TiDB Cloud  
**Future host (Phase 2):** Contabo VPS — see [`docs/CD_CONTABO_VPS.md`](docs/CD_CONTABO_VPS.md) (after Phase 1 is stable; not the current go-live path)

---

## 1. Overall status

**CONDITIONALLY READY**

Application-code HIGH risks identified in the audit have been remediated in this branch. Go-live still depends on correct production configuration (secrets, TiDB pooling, Blob, SMTP, cron secret, backups, monitoring) and applying the new migration.

Do **not** treat as fully **PRODUCTION READY** until the deploy checklist in [`PRODUCTION-CHECKLIST.md`](PRODUCTION-CHECKLIST.md) is completed on real staging/prod.

---

## 2. Security score

**7.5 / 10** (evidence-based)

| Strength | Score impact |
|----------|----------------|
| Fail-closed API middleware + role prefixes | + |
| OpCo/Partner tenant scoping on file/report APIs | + |
| bcrypt(12), HttpOnly cookies, short JWT, hashed reset tokens | + |
| CSP, HSTS, private Blob, no `NEXT_PUBLIC_*` secrets | + |
| Post-fix: ZIP bomb guard, DB rate limits, cron ledger, login timing, magic bytes | + |
| Remaining: deps advisories, no MFA, no APM, upload still fully buffered, infra pooling | − |

Security cannot be proven absolute; this score reflects inspected code + applied fixes, not a penetration-test certificate.

---

## 3. Critical issues fixed

None classified as CRITICAL in the initial audit (no open unauthenticated tenant IDOR or plaintext secrets in source). Highest items were HIGH.

---

## 4. Critical issues remaining

None in application code from this pass. **Infrastructure misconfiguration** (public DB, missing Blob, weak `CRON_SECRET`, seeded passwords) could still create critical exposure — those are deploy-time.

---

## 5. High issues fixed

| ID | Fix |
|----|-----|
| SEC-EXCEL-001 | `assertSafeXlsxZip` — CD uncompressed size ≤ 100 MB, ≤ 10k entries; wired into magic check + parsers |
| REL-CRON-001 | `cron_job_runs` unique claim per job/day/step before send |
| SEC-RATE-001 | `auth_rate_limit_buckets` DB-backed limiter (async); memory store under Vitest |
| SEC-AUTH-001 | `runDummyPasswordCheck` on missing/inactive login |
| SEC-UPLOAD-001 | Magic bytes on OpCo/Partner parse-preview; attachment content checks |
| REL-PRISMA-001 | `RevenueShareReport` in soft-delete `findMany`/`findFirst` extension |
| OPS-HEALTH-001 | `GET /api/health/ready` — `SELECT 1` + Blob configured on Vercel |

Migration: `prisma/migrations/20260902120000_auth_rate_limit_and_cron_ledger`

---

## 6. High issues remaining

| ID | Owner |
|----|--------|
| OPS-DB-001 | Deploy: `connection_limit` / pooler on `DATABASE_URL` |
| OPS-MIGRATE-001 | Deploy process: avoid migrate races on shared preview DBs |
| SEC-DEPS-001 | Triage `npm audit` (sharp/undici/exceljs uuid) without blind force-upgrade |

---

## 7. Performance findings

- Report/Excel parse still buffers entire file in memory (capped at 20 MB) — concurrent large uploads scale with RAM × concurrency.
- Some reporting/dashboard queries load large period sets into memory — monitor as data grows.
- Cron fans out monitoring pages sequentially — large tenant counts may approach Vercel `maxDuration`.
- Auth rate limits now hit DB (one transaction per attempt) — acceptable for auth; not applied to all APIs.

---

## 8. File upload findings

| Control | Status |
|---------|--------|
| Size caps (Excel 20 MB, attachments 10 MB) | Yes |
| Extension + MIME allowlists | Yes |
| Magic bytes (uploads, preview, attachments) | Yes (post-fix) |
| ZIP bomb declared-size guard | Yes (post-fix) |
| Streaming to storage | No — full buffer then put |
| Concurrent upload hard limit | Platform (Vercel) + Node memory only |
| Safe download disposition | Yes |

**Concurrent uploads:** Safe for modest parallelism if Blob is configured and function memory is adequate. A flood of max-size Excel parses can still exhaust memory/CPU — consider future platform rate limits on upload routes.

---

## 9. API security

- **126** `route.ts` handlers; middleware fails closed for unknown `/api/*`.
- Public: health, NextAuth, cron (Bearer secret).
- Protected routes use `require*Session` / `get*Session` in sampled handlers.
- Auth endpoints rate-limited (DB-backed in prod).
- Most business APIs still lack dedicated abuse rate limits.
- Errors via `jsonError` avoid stack traces in responses.

Inventory: [`API-INVENTORY.md`](API-INVENTORY.md).

---

## 10. Database

- Prisma parameterized queries; app runtime avoids raw SQL.
- Soft-delete extension covers main models including RevenueShareReport; `findUnique` still needs explicit `isDeleted` filters where used.
- New tables for rate limits + cron ledger.
- **Must configure** connection pooling limits for serverless × TiDB.

---

## 11. Secrets

- No production secrets in repo; `.env.example` placeholders only.
- No `NEXT_PUBLIC_*` secrets found.
- Seed password `Password123!` must not exist in production users.
- Confirm `.uploads/`, `.env` gitignored.

---

## 12. Backup & recovery

**Not implemented in-app.** TiDB Cloud backups + Blob retention are **infra-owned**. Define RPO/RTO, encrypt backups, and run a restore drill before calling DR ready.

---

## 13. Deployment requirements

1. Apply migration `20260902120000_auth_rate_limit_and_cron_ledger`
2. Set all secrets per [`PRODUCTION-CHECKLIST.md`](PRODUCTION-CHECKLIST.md)
3. `DATABASE_URL` with TLS + `connection_limit`
4. `BLOB_READ_WRITE_TOKEN` on Vercel
5. Strong `CRON_SECRET` + Vercel cron header
6. SMTP verified; `SMTP_REDIRECT_TO` unset in prod
7. Separate staging/prod DBs; no prod seed
8. Smoke: login scopes, IDOR, upload, cron dry-run, `/api/health` + `/api/health/ready`

---

## 14. Monitoring requirements

- Vercel function errors / duration / OOM
- TiDB connection usage and slow queries
- Cron success/failure logs (duplicate skips vs sends)
- SMTP send failure rates
- Auth `RATE_LIMITED` spikes (credential stuffing)
- Disk/Blob growth
- Recommend error tracking (Sentry/etc.) — not wired in-repo

---

## 15. Remaining risks (honest)

1. exceljs still expands XML after ZIP check — extreme crafted sheets can still be heavy.
2. No global API rate limit on recon/upload/consolidation.
3. npm audit findings remain (esp. sharp via Next, exceljs→uuid).
4. No MFA; Dizlee role is fully cross-tenant by design.
5. Email fan-out is sequential with limited retry/observability.
6. Backups/DR and APM are not product features.
7. Full e2e/load/pen-test against staging was not run in this pass.

---

## What was inspected

Architecture (Next.js App Router, Prisma/MySQL, Blob, cron), middleware/auth, ~126 API routes (inventory), uploads/parse/download, cron reminders, rate limiting, health, soft-delete, secrets/gitignore, `npm audit`, existing pre-prod checklist and CD docs.

## What was tested

- Unit: **442 passed** (ZIP guard, auth rate limit, API public paths, cron mocks, excel magic)
- `tsc --noEmit` — pass
- `next build` — pass (after decoupling `next.config` from Excel validation imports)

## Infra you must configure

See §13 and [`PRODUCTION-CHECKLIST.md`](PRODUCTION-CHECKLIST.md).

**Later (Phase 2):** When leaving Vercel for a Contabo VPS, follow the developer handover in [`docs/CD_CONTABO_VPS.md`](docs/CD_CONTABO_VPS.md) (stack, env, DNS cutover, cron, backups).
