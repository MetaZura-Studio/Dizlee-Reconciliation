# Production checklist (Vercel + TiDB)

Actionable **Phase 1** deploy gate. Code HIGH remediations are applied; go-live is **CONDITIONALLY READY** until this checklist is completed on real staging/prod.

**Future (Phase 2):** After Vercel is stable, migrate host to Contabo using [`docs/CD_CONTABO_VPS.md`](docs/CD_CONTABO_VPS.md). Do **not** skip Phase 1 for Contabo.

See also: [`PRODUCTION-READINESS-REPORT.md`](PRODUCTION-READINESS-REPORT.md) · [`docs/CD_VERCEL_TIDB.md`](docs/CD_VERCEL_TIDB.md) · [`docs/PRE_PRODUCTION_SECURITY_CHECKLIST.md`](docs/PRE_PRODUCTION_SECURITY_CHECKLIST.md) · [`SECURITY-AUDIT.md`](SECURITY-AUDIT.md) · [`API-INVENTORY.md`](API-INVENTORY.md)

---

## 0. Blockers before Vercel go-live

**Code (done):** SEC-EXCEL-001, REL-CRON-001, SEC-RATE-001, SEC-AUTH-001, SEC-UPLOAD-001, REL-PRISMA-001, OPS-HEALTH-001.

**Still required at deploy:**

- [ ] **OPS-DB-001** TiDB `DATABASE_URL` includes TLS (`sslaccept=strict`) and Prisma `connection_limit` (e.g. `5` on Vercel serverless)
- [ ] **SEC-SEED-001** No seed / `Password123!` accounts in production
- [ ] **OPS-MIGRATE-001** Staging and production DBs are **separate**; preview builds do not share prod DB; migrate strategy understood (`build:vercel` runs `migrate deploy`)
- [ ] Migration `20260902120000_auth_rate_limit_and_cron_ledger` applied (rate-limit + cron ledger tables)
- [ ] Secrets, Blob, SMTP, `CRON_SECRET`, backups, monitoring (sections below)

---

## 1. Secrets & environment (Vercel)

Set **separately** for Preview/Staging vs Production ([`docs/CD_VERCEL_TIDB.md`](docs/CD_VERCEL_TIDB.md)):

| Variable | Required | Check |
|----------|----------|--------|
| `DATABASE_URL` | Yes | TLS + `connection_limit` for serverless |
| `NEXTAUTH_SECRET` | Yes | Strong random; not in git |
| `NEXTAUTH_URL` | Yes | Exact `https://…` production origin |
| `CRON_SECRET` | Yes | Matches Vercel Cron `Authorization: Bearer …` |
| `BLOB_READ_WRITE_TOKEN` | **Yes on Vercel** | Private Blob — uploads fail without it |
| `SMTP_*` / Admin email settings | If email on | Credentials in env / Admin UI as designed |
| `SMTP_REDIRECT_TO` | No | **Unset** in production |
| `SYSTEM_USER_ID` | Recommended | Cron actor; avoid relying on seeded `admin@dizlee.com` |

- [ ] Preview/staging env never points at production DB  
- [ ] `.env` / `.env.local` not committed  
- [ ] Build command = `npm run build:vercel`  
- [ ] Node version compatible with repo (Node 22 preferred)  

---

## 2. Database & migrate strategy

- [ ] Staging and production TiDB databases are **separate**  
- [ ] First-time (or controlled job): `npx prisma migrate deploy` against target  
- [ ] Confirm all pending migrations applied, including `20260902120000_auth_rate_limit_and_cron_ledger`  
- [ ] Understand `npm run build:vercel` = `prisma migrate deploy && next build` (runs on every Vercel build)  
- [ ] **Do not** run `prisma db seed` on production  
- [ ] Spot-check: `auth_rate_limit_buckets` and `cron_job_runs` tables exist  

---

## 3. Storage, email, cron

- [ ] Private Vercel Blob store created and linked (Prod + Preview as needed)  
- [ ] SMTP test from Admin → Email Settings succeeds in staging  
- [ ] Reminder schedules configured; `remindersEnabled` intentional  
- [ ] Vercel Cron (`vercel.json`: `0 8 * * *`) hits `/api/admin/cron/submission-reminders` with Bearer secret  
- [ ] Cron without secret → 401; with secret → 200  
- [ ] Second cron fire same day does **not** double-send (ledger)  

---

## 4. Accounts & seed hygiene

- [ ] No default `Password123!` users in prod  
- [ ] Admin and Dizlee (`client`) accounts minimized and named  
- [ ] OpCo/Partner users have correct `opcoId` / `partnerId`  
- [ ] Invite/reset emails work; no `devPreviewUrl` in API responses in production  

---

## 5. Backups (infra-owned)

App code does not own DR. Define with TiDB Cloud + Vercel Blob owners:

| Item | Owner | Target |
|------|-------|--------|
| DB backup / PITR | Infra | RPO / RTO written down |
| Blob retention | Infra | Reports, invoices, attachments policy |
| Restore drill | Infra | Tested at least once before go-live |

- [ ] RPO/RTO documented and accepted  

---

## 6. Monitoring

- [ ] Log drain or platform logs retained  
- [ ] Alerts on 5xx rate and elevated latency  
- [ ] Failed-login / 401 spike visibility ([OPS-OBS-001](PRODUCTION-AUDIT.md) — APM recommended)  
- [ ] Audit log export smoke-tested (`/admin/audit-logs`)  

---

## 7. Smoke tests

Run the suites in [`docs/PRE_PRODUCTION_SECURITY_CHECKLIST.md`](docs/PRE_PRODUCTION_SECURITY_CHECKLIST.md):

- [ ] Auth & session (Admin vs portal login separation, inactive user, safe `callbackUrl`)  
- [ ] API middleware gate: unauthenticated/wrong-role → 401; `/api/health` public; `/api/health/ready` public; cron secret required  
- [ ] Tenant IDOR: OpCo A / Partner A cannot read foreign IDs  
- [ ] Uploads: extension/size/magic on Excel & PDF  
- [ ] Security headers: CSP, framing, nosniff, HSTS on HTTPS  
- [ ] Cross-role API matrix (Admin / Dizlee / OpCo / Partner)  
- [ ] `npm run lint` && `npm test` (CI green)  

---

## 8. Post-deploy verification (Vercel)

- [ ] `/api/health` → 200 (liveness)  
- [ ] `/api/health/ready` → 200 (DB + Blob configured on Vercel)  
- [ ] One OpCo report upload + one Partner report upload end-to-end  
- [ ] One Dizlee reconciliation / invoice path in staging mirror  
- [ ] Cron observed once without duplicate sends  
- [ ] Re-check HIGH findings closed or explicitly waived in writing  

---

## 9. Phase 2 — Contabo (later)

After Phase 1 is signed off and production is stable on Vercel:

- [ ] Assign Contabo owner / SSH access  
- [ ] Follow handover: **[`docs/CD_CONTABO_VPS.md`](docs/CD_CONTABO_VPS.md)**  
- [ ] Decide: keep TiDB vs MySQL on Contabo  
- [ ] Plan Blob → local disk copy + DNS cutover + disable Vercel cron  

Do **not** start Contabo cutover until sections 0–8 are complete.

---

## Sign-off (Phase 1 — Vercel)

| Role | Name | Date | Verdict |
|------|------|------|---------|
| Engineering | | | NOT READY / READY |
| Ops / infra | | | |
| Product owner | | | |

Default until checklist complete: **NOT READY** for production. After Phase 1 READY, Contabo remains a **planned migration**, not automatic.
