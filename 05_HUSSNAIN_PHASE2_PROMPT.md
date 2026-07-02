# Cursor prompt — Hussnain (Phase 2: Auth + Admin + Partner portals)

**Repo:** https://github.com/MetaZura-Studio/Dizlee-Reconciliation

Phase 1 (bootstrap, ERD, CI) is complete. This prompt is for **ongoing development** of Auth, Admin, and Partner portals.

---

## Before opening Cursor — sync your local repo

```bash
cd Dizlee-Reconciliation
git checkout develop
git pull origin develop
git checkout -b feature/hussnain-admin-users
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

Confirm `/admin`, `/partner`, and `/login` routes work.

---

## Then paste everything below into Cursor's chat (Agent mode)

---

I am Hussnain, lead developer on the **Dizlee Reconciliation Platform**. Phase 1 scaffold, full ERD (27 tables), CI, and placeholder portals are done. I am building **Auth (shared)**, **Admin portal**, and **Partner portal** only. I do not touch Shahrukh's or Haseeb's folders.

## Database / ERD rules (CRITICAL)

**Single source of truth:** `04_DATABASE_SCHEMA_FOR_CURSOR.md`

All 27 tables are migrated. Prisma models exist in `prisma/schema.prisma`.

### What I must NEVER do without my own explicit approval (I am ERD owner)

- Let Cursor change the ERD or Prisma schema without deliberate review
- Allow other developers to merge schema changes without my PR review
- Revert **[FIX APPLIED]** items in the ERD doc

### What I CAN do

- Edit my Prisma block: `// ===== HUSSNAIN: Admin/Platform models =====`
- Approve and merge schema changes from Shahrukh/Haseeb when genuinely needed
- **Read** Shahrukh's and Haseeb's tables via Prisma (read-only) for cross-portal features (e.g. audit logs referencing reports)

**If Cursor suggests ERD changes, I review against `04_DATABASE_SCHEMA_FOR_CURSOR.md` before applying.**

---

## Work independently

| Principle | What it means for me |
|-----------|----------------------|
| **No blocking** | Admin, Auth, and Partner portals do not depend on OpCo/Dizlee UIs being finished |
| **Seed data** | `prisma/seed.ts` provides users, lookups, settings, links — extend seed as needed for my tests |
| **Scoped auth** | Each developer has their own `lib/<portal>/auth.ts` — I build `lib/admin/auth.ts` and `lib/partner/auth.ts`, not a shared middleware others import |

Full SRS → developer mapping: `docs/USE_CASE_OWNERSHIP.md`

---

## My ownership boundary

| Folder / file | I own it? |
|---------------|-----------|
| `app/(auth)/` | Yes — login, forgot/change password |
| `app/(admin)/`, `app/api/admin/` | Yes |
| `app/(partner)/`, `app/api/partner/` | Yes |
| `lib/admin/`, `lib/partner/` | Yes |
| `components/admin/`, `components/partner/` | Yes |
| `prisma/schema.prisma` — Hussnain block | Yes |
| `prisma/seed.ts` | Yes (coordinate with team — seed is shared) |
| `app/(opco)/`, `app/(dizlee)/` | **No** |
| Shahrukh's or Haseeb's Prisma blocks | **No** (review only) |

---

## Git workflow

- Branch from `develop`: `feature/hussnain-<task>`
- PR → `develop`, CI must pass, merge on GitHub
- Never push directly to `main` or `develop`

---

## Build these use cases, in this order

Reference SRS: `SRS_Reconciliation_Professional.docx`.

### Phase 1 — Auth (shared)
- UC-01-COMMON: User Login — **done** (NextAuth + `/login` + role redirect + middleware)
- Session contract: [`docs/AUTH_SESSION.md`](docs/AUTH_SESSION.md)
- UC-02-COMMON: Change Password
- UC-03-COMMON: Forgot Password — reset token, 24hr expiry, single-use

### Phase 2 — Admin navigation + shell
- UC-01-ADMIN: Access Side Navigation Bar

### Phase 3 — Admin user & settings
- UC-02: Create User
- UC-03: Edit User
- UC-04: Delete User (soft delete)
- UC-05: Set Email Notification Settings (+ Send test email → audit `EMAIL_TEST_SENT`)
- UC-06: Set Reminder Settings
- UC-07: Send Automatic Submission Reminders (stub cron-ready function)
- UC-09: Configure OpCo–Partner links
- UC-10: Set reconciliation tolerance
- UC-11: Manage currencies and monthly USD rates
- UC-12: Manage email templates (version history + revert)
- UC-13: Set default invoice bank details

### Phase 4 — Admin audit
- UC-08: View and export audit logs (CSV, filters)

### Phase 5 — Partner portal
- UC-01-PARTNER: Access Side Navigation Bar
- UC-02-PARTNER: View Dashboard (Partner)
- UC-03-PARTNER: Upload Report (Partner)
- UC-04-PARTNER: View Reports (Partner)
- UC-05-PARTNER: Request Report Upload (Partner) — `report_change_requests` (Shahrukh's table; I write from Partner API)
- UC-06-PARTNER: Upload Invoice (Partner)
- UC-07-PARTNER: View Invoices (Partner) — lifecycle tracker tab
- **Replace upload (follow-on):** After Dizlee approves reupload, **Reupload corrected file** on report row
- **Partner Notifications inbox** — list/read/dismiss notifications received by Partner users

### Phase 6 — Self-QA
- Unit tests for auth flows, user CRUD, settings validation
- Integration tests per Admin/Partner API route

---

## When Phase 2 is ready for team QA

Coordinate joint UAT with Shahrukh and Haseeb. Do not merge `develop` → `main` without staging validation.
