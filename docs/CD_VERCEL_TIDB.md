# CD — Vercel + TiDB Cloud

Continuous Integration already runs on GitHub Actions (`CI` workflow).  
This guide covers **Continuous Deployment**: MySQL on **TiDB Cloud**, app hosting on **Vercel**, deploys from `develop` / `main`.

**Future (Phase 2):** After production is stable here, Contabo VPS cutover is documented in [`CD_CONTABO_VPS.md`](CD_CONTABO_VPS.md). That path is **not** a substitute for finishing this Vercel + TiDB setup first.

## Architecture

| Piece | Role |
|-------|------|
| GitHub `develop` | Staging branch → Vercel Preview/Staging |
| GitHub `main` | Production branch → Vercel Production |
| TiDB Cloud | Hosted MySQL-compatible database (staging + production clusters recommended) |
| Vercel | Build, host Next.js, daily cron for submission reminders |
| GitHub Actions CI | Lint, test, build gate (unchanged) |

Suggested flow: feature PR → `develop` (auto deploy staging) → PR `develop` → `main` (production).

---

## 1. Create TiDB Cloud database

1. Sign up / log in at [TiDB Cloud](https://tidbcloud.com/).
2. Create a **Serverless** or **Dedicated** cluster (Serverless is fine to start).
3. Create a database, e.g. `dizlee_staging` (and later `dizlee_production`).
4. Create a user and note the password.
5. Open **Connect** → choose **MySQL** / Prisma connection string.
6. Allow public access or add Vercel’s egress as needed (Serverless usually allows password auth from anywhere with TLS).
7. Copy a URL like:

```text
mysql://USERNAME:PASSWORD@HOST:4000/dizlee_staging?sslaccept=strict&connection_limit=5
```

TiDB often uses port **4000**. Special characters in the password must be URL-encoded (e.g. `@` → `%40`).

**Serverless (Vercel):** always set a low Prisma `connection_limit` (e.g. `5`) on `DATABASE_URL`, or use an external pooler. Each Vercel instance opens its own pool — without a limit, concurrent lambdas can exhaust TiDB connections.

Keep **separate** connection strings for staging and production.

### Apply schema (first time)

From your laptop (with the staging URL):

```bash
export DATABASE_URL="mysql://USER:PASS@HOST:4000/dizlee_staging?sslaccept=strict&connection_limit=5"
npx prisma migrate deploy
npx prisma db seed   # optional for staging only — do not seed production lightly
```

Later deploys can run `migrate deploy` automatically via Vercel build (`npm run build:vercel`).

**Caution:** If Preview deployments share one database, concurrent `migrate deploy` during builds can race. Prefer a dedicated staging DB and production-only migrate, or serialize production deploys.

---

## 2. Create / link Vercel project

1. Go to [vercel.com](https://vercel.com) → **Add New Project**.
2. Import the GitHub repo `Dizlee-Reconciliation`.
3. Framework: **Next.js** (auto-detected).
4. Set **Build Command** to:

```text
npm run build:vercel
```

(`prisma migrate deploy && next build` — applies pending migrations on each deploy.)

5. Root directory: repo root. Node **22** if asked.
6. Do **not** commit secrets; set them in Vercel → **Settings → Environment Variables**.

### Environments

| Vercel env | Git branch | TiDB database |
|------------|------------|---------------|
| Preview / Staging | `develop` (and PRs) | staging cluster DB |
| Production | `main` | production cluster DB |

In Vercel **Git** settings:
- Production Branch: `main`
- Optionally assign `develop` to a Staging custom environment, or treat Preview deploys from `develop` as staging.

---

## 3. Environment variables (Vercel)

Set for **Preview** and **Production** as appropriate:

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | TiDB MySQL URL (different per environment) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Staging/production site URL, e.g. `https://your-app.vercel.app` |
| `CRON_SECRET` | Random secret; Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` |
| `EMAIL_ENABLED` | `true` when SMTP ready |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | Mail |
| `BLOB_READ_WRITE_TOKEN` | **Required for uploads on Vercel** — create a Private Blob store (Storage → Blob), connect to this project, include the read-write token. Without it, file uploads fail (no durable disk). |

Locally, if `BLOB_READ_WRITE_TOKEN` is unset, the app still writes to `.uploads/` on disk.

### Blob store checklist

1. Vercel → **Storage** → create **Private** Blob store (e.g. `dizlee-uploads`)
2. Connect to this project (Production + Preview)
3. Enable **read-write token** → env `BLOB_READ_WRITE_TOKEN` (prefix `BLOB`)
4. Redeploy after env is present
5. App code uses `@vercel/blob` via `lib/platform/storage/object-storage.ts`
| `SYSTEM_USER_ID` | Optional; else seed `admin@dizlee.com` |

After first deploy, update `NEXTAUTH_URL` to the final domain (custom domain or `*.vercel.app`).

---

## 4. Cron (automatic intimations / reminders)

`vercel.json` schedules:

```text
0 8 * * *  →  /api/admin/cron/submission-reminders
```

That is **08:00 UTC daily**. Change the schedule in `vercel.json` if you need another time.

Requirements:
- `CRON_SECRET` set in Vercel
- Admin → Reminder Settings: automatic sending **Enabled**
- Hobby plans may have cron limits; Pro is safer for production cron

---

## 5. GitHub (optional but recommended)

Branch protection (Settings → Branches):
- `main`: PR required, CI must pass, 1 approval
- `develop`: PR required, CI must pass

Vercel’s GitHub integration deploys on push; you do **not** need a separate “deploy” Actions workflow unless you prefer token-based deploys.

Repo secrets are only needed if you add a custom Actions deploy later (`VERCEL_TOKEN`, etc.). With Vercel Git integration, put secrets in **Vercel**, not GitHub.

---

## 6. First deploy checklist

1. [ ] TiDB staging DB created; `migrate deploy` (+ optional seed) succeeded  
2. [ ] Vercel project linked to GitHub  
3. [ ] Build command = `npm run build:vercel`  
4. [ ] Env vars set for Preview and Production  
5. [ ] Push or redeploy `develop` → open staging URL, login  
6. [ ] Smoke: login Admin + Dizlee, open dashboard  
7. [ ] Confirm cron appears under Vercel → Settings → Cron Jobs  
8. [ ] When ready: merge `develop` → `main` for production (separate TiDB + env)
9. [ ] Run [`PRE_PRODUCTION_SECURITY_CHECKLIST.md`](PRE_PRODUCTION_SECURITY_CHECKLIST.md) (auth, IDOR, cron, env)

---

## 7. Local vs cloud

| | Local | Staging / Prod |
|--|--------|----------------|
| DB | Docker / local MySQL | TiDB Cloud |
| App | `npm run dev` | Vercel |
| Reminders cron | Manual `curl` | Vercel Cron 08:00 UTC |
| CI | GitHub Actions | Same (gates merges) |

---

## Troubleshooting

- **Build fails on migrate** — check `DATABASE_URL`, TLS (`sslaccept=strict`), and that migrations folder is committed.
- **Login redirect loop** — `NEXTAUTH_URL` must match the browser URL (https).
- **Cron 401** — `CRON_SECRET` missing or mismatched.
- **Cron 503** — `CRON_SECRET` not configured in that environment.
- **Prisma + TiDB** — keep schema vanilla MySQL (already the project rule).

---

## Future: Contabo

When you move off Vercel onto a Contabo Cloud VPS, use the full handover: [`CD_CONTABO_VPS.md`](CD_CONTABO_VPS.md) (systemd, Caddy, local uploads, crontab, Vercel→Contabo cutover). Keep using this doc until that migration starts.
