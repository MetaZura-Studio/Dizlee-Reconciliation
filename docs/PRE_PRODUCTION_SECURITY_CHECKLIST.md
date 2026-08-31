# Pre-production security checklist

Use this before deploying to staging/production or handing off to QA/security review.

**Related docs:** [`AUTH_SESSION.md`](AUTH_SESSION.md) · [`CD_VERCEL_TIDB.md`](CD_VERCEL_TIDB.md) · [`ERROR_CODES.md`](ERROR_CODES.md)

**Architecture baseline:** Frontend (React) → Middle (`app/api/*` + `lib/*`) → Backend (Prisma + MySQL + object storage). The browser must never talk to Prisma directly.

---

## Quick verdict

| Layer | Status | Notes |
|-------|--------|-------|
| Frontend | OK | No DB access; session in HttpOnly cookies; client validation is UX only |
| Middle (API + `lib`) | OK | Middleware role gate + per-route guards + tenant scoping |
| Backend | OK | Prisma, private storage, path traversal checks, audit logs |

**Known gaps to track (not blockers if items below are done):** in-memory rate limits on multi-instance hosts (N/A for single-server/TDM); no MFA on Admin. Portal Excel/PDF magic-byte checks and CSP nonces are implemented.

---

## 1. Must-do before production

### Environment & secrets

- [ ] `NEXTAUTH_SECRET` set to a strong random value (`openssl rand -base64 32`), not committed to git
- [ ] `NEXTAUTH_URL` set to the production `https://…` origin (enables Secure cookies)
- [ ] `CRON_SECRET` set and matches Vercel Cron `Authorization: Bearer …` header
- [ ] Database URL uses TLS in production (`DATABASE_URL` / TiDB Cloud)
- [ ] SMTP credentials in env only (`SMTP_USER`, `SMTP_PASSWORD`); host/port/sender may live in Admin → Email Settings
- [ ] `BLOB_READ_WRITE_TOKEN` set on Vercel when using Blob storage (local dev may use `.uploads/`)
- [ ] `.env` / `.env.local` not committed; `.env.example` has placeholders only
- [ ] `SMTP_REDIRECT_TO` **not** set in production (ignored there, but remove to avoid confusion)

### Auth & session smoke tests

- [ ] Admin can sign in only at `/admin/login` → lands on `/admin`
- [ ] OpCo / Partner / Dizlee sign in only at `/login` → correct portal home
- [ ] Admin credentials on `/login` → rejected
- [ ] OpCo/Partner/Dizlee credentials on `/admin/login` → rejected
- [ ] Inactive or soft-deleted user cannot use API (401 / redirect)
- [ ] After suspend/delete, existing session stops working within ~30s (JWT revalidation)
- [ ] `callbackUrl=https://evil.com` after login → ignored; user lands on safe home path
- [ ] Change password works while logged in; `/api/auth/change-password` returns 401 when logged out

### API middleware gate (S14)

- [ ] Unauthenticated `GET /api/dizlee/dashboard` → 401 JSON (not HTML redirect)
- [ ] Partner JWT cannot call `GET /api/admin/users` or `GET /api/opco/reports`
- [ ] OpCo JWT cannot call `GET /api/partner/reports`
- [ ] Unknown path `GET /api/mystery` → 401 (fail closed)
- [ ] `GET /api/health` → 200 without auth (liveness only)
- [ ] `GET /api/admin/cron/submission-reminders` without Bearer secret → 401
- [ ] Cron with correct `Authorization: Bearer $CRON_SECRET` → 200

### Tenant isolation (IDOR)

Run while logged in as **OpCo A** (e.g. Zain Bahrain) and **Partner A** (e.g. DigitalVirgo). Replace IDs with real rows from your DB.

- [ ] OpCo A: `GET /api/opco/reports/{id}` for OpCo B’s report → 404 or empty (not B’s data)
- [ ] OpCo A: `GET /api/opco/reports/{id}/preview` for another OpCo’s report → 404
- [ ] Partner A: upload with `opcoId` of an **unlinked** OpCo → 403
- [ ] Partner A: `GET /api/partner/reports/{id}` for another partner’s report → 404
- [ ] Partner A: `GET /api/partner/invoices/{id}` for another partner’s invoice → 404

Dizlee (`client`) is **intentionally cross-tenant** — verify only trusted Dizlee accounts exist in prod.

### File uploads

- [ ] OpCo report: non-`.xlsx` rejected; empty file rejected; >10 MB rejected
- [ ] Partner report: same Excel rules
- [ ] Partner invoice: non-`.pdf` rejected; >10 MB rejected
- [ ] Uploaded report preview/download does not execute HTML/SVG inline (PDF/Excel served with safe disposition)
- [x] **Recommended (code):** add `assertExcelBufferMagic` to OpCo/Partner upload routes (admin imports already use it — see §4)

### Invite / reset links (production)

- [ ] Create user in Admin → invite email sent (or fails clearly if SMTP off)
- [ ] Create-user API response does **not** include `devPreviewUrl` in production
- [ ] Set-password and reset-password tokens are single-use and expire (1h invite / 24h reset)

### Security headers

- [ ] Response includes `Content-Security-Policy` (nonce-based via middleware), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
- [ ] Production responses include `Strict-Transport-Security` (HTTPS deploy only)

---

## 2. Production operations

### Rate limiting

- [ ] Confirm `NODE_ENV=production` so auth rate limits are **active** (disabled in `next dev`)
- [ ] If running **multiple app instances**, plan a shared store (Redis/Upstash) — current limits use in-memory buckets (`lib/auth/rate-limit.ts`)
- [ ] **Recommended:** add light rate limits on upload POSTs and notification broadcast POSTs

### Accounts & access

- [ ] Change default seed passwords (`Password123!`) before real users access the system
- [ ] Limit Admin accounts; Dizlee `client` accounts are high privilege
- [ ] OpCo/Partner users scoped to correct `opcoId` / `partnerId` in DB

### Cron & reminders

- [ ] Vercel Cron (or scheduler) hits `/api/admin/cron/submission-reminders` with Bearer secret
- [ ] Reminder schedule configured in Admin → Reminder Settings
- [ ] `email_enabled` and SMTP tested via Admin → Email Settings → Send test

### Storage

- [ ] Production uses Vercel Blob (private) or secured disk — not world-readable `.uploads/` on a public host
- [ ] Backup/retention policy defined for reports, invoices, attachments

### Monitoring

- [ ] Failed login spikes visible (logs / APM)
- [ ] 401/403 rate on `/api/*` monitored
- [ ] Audit log export tested (`/admin/audit-logs` → export)

---

## 3. Layer-by-layer review

### Frontend

| Check | Pass? |
|-------|-------|
| No `@/lib/prisma` (or server-only DB) imported in `components/` | |
| No secrets in client bundle (`process.env` only in server code) | |
| Upload forms do not skip server validation | |
| User-generated content in UI escaped / not rendered as raw HTML | |

### Middle (`app/api/*`, `lib/*`)

| Check | Pass? |
|-------|-------|
| Every portal route calls `require*Session` or equivalent | |
| OpCo routes filter by `session.opcoId` | |
| Partner routes filter by `session.partnerId` | |
| Admin routes use `requireAdminApiSession` | |
| Mutations validated with Zod (or equivalent) | |
| Errors return structured JSON, not stack traces, in production | |

### Backend

| Check | Pass? |
|-------|-------|
| Migrations applied on target DB | |
| Soft-delete respected in queries (`isDeleted: false` where required) | |
| File `storageKey` path traversal blocked (`lib/platform/storage/object-storage.ts`) | |
| Password hashes use bcrypt (rounds 12) | |

---

## 4. Recommended code hardening (backlog)

| Item | Priority | Status / notes |
|------|----------|----------------|
| Magic-byte check on OpCo/Partner report upload | High | **Done** — `assertExcelBufferMagic` on upload + reupload routes |
| PDF magic-byte check (`%PDF-`) on partner invoice upload | Medium | **Done** — `assertPdfBufferMagic` in partner invoice upload |
| CSP nonces (reduce `unsafe-inline` for scripts) | Low | **Done** — per-request nonce in `middleware.ts` + `lib/platform/csp.ts`; CSP removed from static `next.config.ts` |
| Shared rate-limit store (Redis) | High | Future — only needed for multi-instance hosts (`lib/auth/rate-limit.ts`) |
| Rate limits on upload + broadcast endpoints | Medium | Future — monthly one-report uniqueness already limits report uploads |
| Add `/change-password` to middleware matcher | Low | Future — page already guards session; API is gated |
| Admin MFA or IP allowlist | Low | Future — process / infra decision |
| IDOR integration tests in CI | Medium | Future — OpCo/Partner preview + detail by foreign ID |
| APM / failed-login monitoring | Medium | Future — ops (logs / APM), not app feature |
| Backup/retention policy for Blob + DB | Medium | Future — ops runbook |
| Soft-delete extension edge cases (`findUnique` / RS reports) | Low | Future — consistency hardening |

---

## 5. Manual cross-role API matrix

Use browser devtools or curl with session cookie / JWT. Expect **401** for every wrong-role cell.

| Endpoint | Admin | Dizlee | OpCo | Partner |
|----------|-------|--------|------|---------|
| `GET /api/admin/users` | 200 | 401 | 401 | 401 |
| `GET /api/dizlee/dashboard` | 401 | 200 | 401 | 401 |
| `GET /api/opco/reports` | 401 | 401 | 200 | 401 |
| `GET /api/partner/reports` | 401 | 401 | 401 | 200 |

---

## 6. Environment variable reference

| Variable | Required prod | Purpose |
|----------|---------------|---------|
| `NEXTAUTH_SECRET` | Yes | JWT signing |
| `NEXTAUTH_URL` | Yes | Cookie Secure flag + callbacks |
| `DATABASE_URL` | Yes | TiDB/MySQL |
| `CRON_SECRET` | Yes (if cron used) | Scheduled reminders |
| `SMTP_*` | Yes (if email on) | Outbound mail |
| `BLOB_READ_WRITE_TOKEN` | Yes on Vercel | Private file storage |
| `SMTP_REDIRECT_TO` | Dev only | Test mail redirect |

Full deploy notes: [`CD_VERCEL_TIDB.md`](CD_VERCEL_TIDB.md).

---

## 7. Automated tests (run before release)

```bash
npm run lint
npm test
```

Security-related unit tests today:

- `tests/unit/api-access.test.ts` — public paths + role → API prefix
- `tests/unit/auth-cookies.test.ts` — HttpOnly / SameSite
- `tests/unit/auth-rate-limit.test.ts` — limiter behavior
- `tests/unit/active-user.test.ts` — suspended user handling
- `tests/unit/safe-callback-url.test.ts` — redirect safety
- `tests/unit/excel-upload.test.ts` — upload validation + magic bytes

---

## 8. Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Developer | | | |
| QA | | | |
| DevOps / Release | | | |

**Release blocked if:** §1 must-do items fail, cross-role API matrix fails, or default seed passwords still in use for real tenants.

---

*Last updated: Aug 2026 — aligned with post–PR #70 security hardening (`middleware.ts`, `lib/auth/*`, `next.config.ts`).*
