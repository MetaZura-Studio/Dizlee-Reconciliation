# Cursor prompt — Hussnain (repo bootstrap + CI/CD + Admin/Platform portal)

Paste everything below the line into Cursor's chat (Composer/Agent mode) in an **empty folder** that will become the repo root.

---

I am setting up a new production-grade Next.js application called **Dizlee Reconciliation Platform**. I am the lead developer (Hussnain) responsible for bootstrapping the repo, CI/CD, and my own portal (Partner Portal — actually Admin/Platform, see below). Two other developers (Shahrukh — OpCo Portal, Haseeb — Dizlee & Admin... wait, confirm role split below) will clone this repo after I push and build their own portals independently. Set this up so it is genuinely ready for them to clone and start immediately with zero setup friction.

## Tech stack (fixed — do not substitute)
- Next.js 14+ (App Router, TypeScript, strict mode)
- Prisma ORM, database is MySQL-wire-compatible (local dev: MySQL via Docker Compose; production target: TiDB Cloud — schema must stay 100% vanilla MySQL-compatible, no MySQL-specific extensions that TiDB doesn't support)
- NextAuth.js (Credentials provider, JWT session)
- Tailwind CSS + shadcn/ui
- React Hook Form + Zod
- TanStack Table + TanStack Query
- ExcelJS for Excel parsing/export
- Vercel Blob (or S3-compatible) for file storage — must NOT use any Vercel-only API; the app must also run as a plain `next build && next start` on a standalone Docker/Node server with zero code changes
- Vitest + React Testing Library + Playwright
- GitHub Actions for CI/CD, deploying to Vercel initially

## 1. Initialize the repo

- `npx create-next-app@latest` with TypeScript, App Router, Tailwind, ESLint, `src/` directory disabled (use root `app/`)
- Initialize git, set default branch to `main`
- Create a `develop` branch from `main`

## 2. Repository layout (build exactly this structure, empty placeholder files where noted)

```
app/
  (admin)/        -> Hussnain owns: users, settings, links, currencies, audit logs.
                      Must be reachable on its own port/URL within this same Next.js app
                      (separate route group + separate dev script, see below) so admin
                      can run independently of the OpCo/Partner/Dizlee portals.
  (auth)/         -> Hussnain owns: login, forgot/change password (shared across all roles)
  (dizlee)/       -> Haseeb owns — leave as empty placeholder folder with a README stub
  (opco)/         -> Shahrukh owns — leave as empty placeholder folder with a README stub
  (partner)/      -> Hussnain owns — leave as empty placeholder folder with a README stub
  api/            -> route handlers, mirror the folders above by owner
prisma/
  schema.prisma   -> ONE shared file, but with THREE clearly marked comment blocks:
                      // ===== HUSSNAIN: Admin/Platform models =====
                      // ===== SHAHRUKH: OpCo Portal models =====
                      // ===== HASEEB: Dizlee Portal models =====
                      Each developer only ever edits inside their own block.
  migrations/
lib/
  admin/          -> Hussnain's own auth/session check + validation schemas, scoped to Admin only
  partner/        -> Hussnain's own auth/session check + validation schemas, scoped to Partner only
  opco/           -> empty placeholder, Shahrukh builds his own here
  dizlee/         -> empty placeholder, Haseeb builds his own here
components/
  admin/          -> Hussnain's own data table, modal, file upload — scoped, not shared in v1
  partner/        -> Hussnain's own data table, modal, file upload — scoped, not shared in v1
  opco/           -> empty placeholder
  dizlee/         -> empty placeholder
tests/
  unit/
  integration/
  e2e/
.github/
  workflows/
    ci.yml
docs/
  HANDOFF_SHAHRUKH.md   -> place the Shahrukh handoff content I give you separately (see below)
  HANDOFF_HASEEB.md     -> place the Haseeb handoff content I give you separately (see below)
docker-compose.yml
.env.example
.env.local        (gitignored)
README.md
```

**Important:** do NOT build out Shahrukh's or Haseeb's actual screens/logic. Only create the empty placeholder folders listed above with a one-line `README.md` inside each saying "Owned by <name> — see /docs/HANDOFF_<NAME>.md". I only build my own Admin, Auth, and Partner portal work in this session.

## 3. Local database setup (MySQL via Docker, TiDB-compatible schema)

Create `docker-compose.yml` with a single MySQL 8 service for local development:

```yaml
services:
  mysql:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: devpassword
      MYSQL_DATABASE: dizlee_dev
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
volumes:
  mysql_data:
```

Each developer runs their own local MySQL via `docker compose up -d` — this is NOT shared between developers, each person has their own local instance. Keep the Prisma schema strictly vanilla-MySQL (no proprietary MySQL features) since production will run on TiDB Cloud, which is MySQL-wire-compatible but not 100% feature-identical (e.g. no stored procedures with complex MySQL-only syntax, avoid FULLTEXT indexes unless confirmed supported, avoid SPATIAL types unless confirmed).

Create `.env.example`:
```
DATABASE_URL="mysql://root:devpassword@localhost:3306/dizlee_dev"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
BLOB_READ_WRITE_TOKEN=""
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASSWORD=""
```

## 4. Prisma setup

- `npm install prisma @prisma/client`
- `npx prisma init --datasource-provider mysql`
- Build `schema.prisma` with the three comment-block sections above
- Under my (Hussnain's) block, model these tables from the ERD: `users`, `app_settings`, `currencies`, `currency_monthly_rates`, `opco_partner_links`, `audit_logs`, `lookups`, `lookup_types`, `notifications`, `notification_recipients`, `notification_reads`, `notification_attachments`, `notification_templates`, `email_template_versions`
- Apply the ERD fixes we already identified: normalize FK column types to match referenced PK types (BIGINT, not VARCHAR), drop the duplicate `created_at` on `notification_recipients`, enforce `app_settings` as a singleton (seed exactly one row with `id = 1`, document that the app must always upsert by `id: 1`, never insert a second row)
- Add a soft-delete pattern shared across all my tables: `is_deleted`, `deleted_at`, `deleted_by_user_id`
- Run first migration: `npx prisma migrate dev --name init_admin_platform_schema`

## 5. Auth (NextAuth, scoped to my own modules only)

- Install `next-auth`
- Credentials provider, JWT session strategy
- My own lightweight session/role check in `lib/admin/auth.ts` and `lib/partner/auth.ts` — do NOT build a single shared RBAC middleware that other developers' modules import. Each developer (including me) implements their own scoped check so no one depends on a shared piece.
- Implement: Login (UC-01-COMMON), Change Password (UC-02-COMMON), Forgot Password (UC-03-COMMON) — full flow with reset token, 24hr expiry, single-use
- Implement Admin side navigation shell (UC-01-ADMIN): sidebar with Audit logs, Users, Email Settings, Email Templates, Reminder Settings, OpCo partners, Reconciliation tolerance — collapsed/expanded state remembered, role-gated

## 6. My (Hussnain's) Admin module — build these use cases

- UC-02/03/04: Create / Edit / Delete User (soft delete, audit log USER_UPDATED / USER_DELETED, admin accounts excluded from this UI)
- UC-05: Set Email Notification Settings — including the **Send test email** action (audit event EMAIL_TEST_SENT), SMTP credentials read from server env vars only, never stored in DB
- UC-06: Set Reminder Settings
- UC-07: Send Automatic Submission Reminders (scheduled job — stub this as a documented cron-ready function for now; do not wire actual scheduling yet)
- UC-08: View and export audit logs (CSV export, filters: category/actor role/action/entity/date range)
- UC-09: Configure OpCo–Partner links
- UC-10: Set reconciliation tolerance (negligible difference %)
- UC-11: Manage currencies and monthly USD rates
- UC-12: Manage email templates (version history + revert)
- UC-13: Set default invoice bank details

## 7. My (Hussnain's) Partner Portal module — build these use cases

- UC-01-PARTNER: Access Side Navigation Bar
- UC-02-PARTNER: View Dashboard (Partner)
- UC-03-PARTNER: Upload Report (Partner)
- UC-04-PARTNER: View Reports (Partner)
- UC-05-PARTNER (UC-05-OPCO ID in SRS, Partner actor): Request Report Upload
- UC-06-PARTNER: Upload Invoice (Partner)
- UC-07-PARTNER: View Invoices (Partner) — including lifecycle tracker tab

## 8. CI/CD pipeline (GitHub Actions)

Create `.github/workflows/ci.yml` implementing this pipeline, exactly matching our dev plan:

- **Lint & type-check**: every push/PR — `eslint .` and `tsc --noEmit`
- **Unit & component tests**: every push/PR — `vitest run` with coverage threshold
- **Build**: every PR — `next build`
- **Prisma migration check**: every PR touching `prisma/` — spin up a throwaway MySQL 8 service container in the Actions job (use `services:` with `mysql:8.0` image), run `prisma migrate diff` / `prisma validate` against it
- **Preview deploy**: every PR — Vercel preview deployment, comment the URL on the PR (use the official `amondnet/vercel-action` or Vercel's own GitHub integration if installed instead)
- **E2E smoke tests**: on merge to `develop` — Playwright: login per role, upload report, run reconciliation, create invoice
- **Staging deploy**: on merge to `develop` — Vercel → staging environment
- **Production deploy**: on merge to `main` — Vercel → production, gated on manager/lead PR approval on the `develop → main` PR

Branch protection (document this in README, I will set the actual GitHub settings manually after push):
- `main`: protected, no direct pushes, requires PR + passing CI + 1 approval
- `develop`: protected, PRs merge here first

## 9. Root README.md

Write a clear root README covering: project description, tech stack, how to run locally (`docker compose up -d`, `cp .env.example .env.local`, `npm install`, `npx prisma migrate dev`, `npm run dev`), branch strategy, and a link to `/docs/HANDOFF_SHAHRUKH.md` and `/docs/HANDOFF_HASEEB.md` for the other two developers.

## 10. Final steps — do NOT run these yourself, just print them for me to run manually

After you've built everything above, STOP and print out, as plain shell commands for me to copy-paste myself (do not execute `git push` or anything that touches the remote):

```
git add .
git commit -m "chore: bootstrap repo, CI/CD, Admin + Partner portal (Hussnain)"
git push -u origin main
git push -u origin develop
```

Then remind me to:
1. Go to GitHub repo Settings → Branches → add protection rules for `main` and `develop` as described above
2. Add repo secrets: `DATABASE_URL` (staging/prod TiDB connection string), `NEXTAUTH_SECRET`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `BLOB_READ_WRITE_TOKEN`, SMTP secrets
3. Send the GitHub repo URL + clone instructions to Shahrukh and Haseeb along with their respective handoff docs in `/docs/`
