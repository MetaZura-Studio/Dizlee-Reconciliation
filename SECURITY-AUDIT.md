# Security audit (OWASP-style)

**Status:** Supporting detail for [`PRODUCTION-AUDIT.md`](PRODUCTION-AUDIT.md). Overall production verdict remains **NOT READY** until HIGH fixes land (docs written before remediations; work tracked on `Production-check`).

**Related:** [`docs/PRE_PRODUCTION_SECURITY_CHECKLIST.md`](docs/PRE_PRODUCTION_SECURITY_CHECKLIST.md) · [`docs/CD_VERCEL_TIDB.md`](docs/CD_VERCEL_TIDB.md) · [`API-INVENTORY.md`](API-INVENTORY.md)

---

## 1. Authentication (AuthN)

| Topic | Assessment |
|-------|------------|
| Mechanism | NextAuth credentials for main portals (`/api/auth/*`) and Admin (`/api/admin-auth/*`); separate cookie namespaces (`lib/auth/cookies.ts`, `lib/auth/options.ts`). |
| Password storage | bcryptjs, **12 rounds** (`lib/auth/password.ts`). |
| Reset / invite | Tokens hashed (SHA-256) before store; TTL policy in `lib/auth/password-reset.ts`; set/forgot/change password routes. |
| Session cookies | HttpOnly, SameSite=Lax, Secure when HTTPS/`NEXTAUTH_URL` warrants (`lib/auth/cookies.ts`). |
| Rate limits | Applied on auth endpoints via in-memory buckets (`lib/auth/rate-limit.ts`) — **ineffective across Vercel instances** ([SEC-RATE-001](PRODUCTION-AUDIT.md)). |
| Timing | `authorize` returns early when user missing/inactive **before** bcrypt ([SEC-AUTH-001](PRODUCTION-AUDIT.md)). |
| Seed passwords | `Password123!` in `prisma/seed.ts` — must not exist in prod ([SEC-SEED-001](PRODUCTION-AUDIT.md)). |

**Verdict:** Solid baseline for a credentials app; fix timing oracle and shared rate limits before treating AuthN as production-hardened.

---

## 2. Authorization (AuthZ)

| Topic | Assessment |
|-------|------------|
| Edge gate | `middleware.ts` + `lib/auth/api-access.ts`: public allowlist only for `/api/health`, `/api/auth/*` (except change-password), `/api/admin-auth/*`, `/api/admin/cron/*`. **Unknown `/api/*` → deny (fail closed).** |
| Role → prefix | Admin → `/api/admin`; Dizlee (`client`) → `/api/dizlee`; OpCo → `/api/opco`; Partner → `/api/partner`. |
| Route guards | Portal handlers use `require*Session` / equivalent session helpers after middleware. |
| Tenant IDOR | OpCo/Partner queries scoped to session `opcoId` / `partnerId` (checklist + code paths). |
| Dizlee | **Intentionally cross-tenant** — high privilege; limit who gets `client` role in prod. |
| Cron | Bearer `CRON_SECRET` (not user JWT); misconfigured secret = open scheduler surface. |

**Verdict:** AuthZ/IDOR design is a strength. Residual risk is operational (Dizlee account hygiene, cron secret).

---

## 3. Uploads & file handling

| Topic | Assessment |
|-------|------------|
| Size / extension | Excel capped at **20 MB** (`lib/platform/excel-upload.ts`); notification attachments 10 MB + type allowlist. |
| Magic bytes | Present on OpCo/Partner upload & reupload, admin Excel imports, partner PDF invoices. |
| Gaps | Parse-preview routes and Dizlee notification attachments lack content magic ([SEC-UPLOAD-001](PRODUCTION-AUDIT.md)). |
| Parse DoS | exceljs full load without inflate/row caps ([SEC-EXCEL-001](PRODUCTION-AUDIT.md)) — **HIGH**. |
| Storage | Vercel Blob **private** (`access: "private"`); path traversal checks in object storage layer. |
| Serving | Download helpers aim for safe disposition (non-executable preview). |

**Verdict:** Upload authz and Blob privacy are good; Excel memory DoS blocks a clean go-live.

---

## 4. Headers / CORS / CSRF

| Topic | Assessment |
|-------|------------|
| CSP | Per-request nonce-based CSP in `middleware.ts` + `lib/platform/csp.ts`. |
| HSTS / framing / MIME | `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` (see `next.config.ts` / middleware). |
| CORS | Same-origin app; no broad public CORS API surface observed. |
| CSRF | NextAuth CSRF cookies (`__Host-` / `__Secure-` prefixes when secure); SameSite=Lax. Mutation APIs expect session cookies from same site. |

**Verdict:** Header posture is good (INFO positive in production audit).

---

## 5. Secrets & configuration

| Topic | Assessment |
|-------|------------|
| Server secrets | `NEXTAUTH_SECRET`, `DATABASE_URL`, `CRON_SECRET`, SMTP, `BLOB_READ_WRITE_TOKEN` — env-only (see CD doc). |
| Client bundle | **No `NEXT_PUBLIC_*` secrets** found in source. |
| Seed / docs | Known demo passwords in seed and sample READMEs — staging hygiene required. |
| Redirects | Safe callback URL handling covered by unit tests / checklist. |

**Verdict:** Secret handling pattern is correct; enforce prod env checklist ([`PRODUCTION-CHECKLIST.md`](PRODUCTION-CHECKLIST.md)).

---

## 6. Dependencies

| Topic | Assessment |
|-------|------------|
| Audit snapshot | **15** npm vulnerabilities (3 moderate, 11 high, 1 critical) — sharp, undici, exceljs→uuid, nodemailer, postcss, etc. ([SEC-DEPS-001](PRODUCTION-AUDIT.md)). |
| Guidance | Triage by exploitability in this app; **do not** `npm audit fix --force` blindly (breaks Next / exceljs / Prisma ranges). |

---

## 7. Error handling & soft-delete consistency

| Topic | Assessment |
|-------|------------|
| API errors | Structured JSON helpers (`lib/errors/*`); avoid leaking stacks in production responses (checklist item). |
| Health | Public `/api/health` is liveness-only — no dependency signal ([OPS-HEALTH-001](PRODUCTION-AUDIT.md)). |
| Soft-delete | Prisma extension auto-filters many models; **`RevenueShareReport` (and similar) omitted** from `SOFT_DELETE_MODELS` ([REL-PRISMA-001](PRODUCTION-AUDIT.md)). |
| Cron reliability | Reminder runner not idempotent ([REL-CRON-001](PRODUCTION-AUDIT.md)). |

---

## Priority map (security-focused)

1. **HIGH:** Excel parse DoS, shared rate limits, cron idempotency, TiDB pool docs/config  
2. **MED/HIGH:** Login timing equalization  
3. **MED:** Magic bytes on preview/attachments, migrate strategy, soft-delete list, npm triage, APM  
4. **LOW/MED:** Seed password process controls  

Full finding IDs and fix notes: [`PRODUCTION-AUDIT.md`](PRODUCTION-AUDIT.md).
