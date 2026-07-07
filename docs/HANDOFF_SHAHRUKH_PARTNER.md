# Handoff: Partner Portal — transferred from Hussnain to Shahrukh

**Effective:** July 2026  
**Decision:** Hussnain keeps **Auth + Admin** only. **Partner portal** moves to **Shahrukh** (same developer as OpCo portal).

**Full Cursor prompt:** paste everything below the `---` line in this file into Cursor Agent mode.

**Repo:** https://github.com/MetaZura-Studio/Dizlee-Reconciliation

---

## Why this changed

Originally Hussnain was assigned Auth, Admin, **and** Partner. To reduce Hussnain’s scope and let Shahrukh own both **actor sides of report upload** (OpCo + Partner), Partner portal ownership moved to Shahrukh.

| Area | Owner now |
|------|-----------|
| Shared login, NextAuth, middleware | Hussnain |
| Admin portal (`/admin/*`) | Hussnain |
| OpCo portal (`/opco/*`) | Shahrukh |
| **Partner portal (`/partner/*`)** | **Shahrukh** |
| Dizlee portal (`/dizlee/*`) | Haseeb |

Hussnain does **not** build Partner screens or `app/api/partner/` routes anymore.

---

## What Hussnain already built (do not rebuild)

| Feature | Status | Where |
|---------|--------|--------|
| Shared login `/login` | Done | `app/(auth)/login/`, `app/api/auth/` |
| NextAuth JWT + role redirect | Done | `lib/auth/`, `middleware.ts` |
| Session contract | Done | `docs/AUTH_SESSION.md` |
| Master seed (7 OpCos, 35 Partners, 44 users) | Done | `npm run seed`, `docs/SEED_DATA.md` |
| Admin portal shell + Users CRUD | Done | `app/(admin)/`, `lib/admin/` |
| Partner placeholder only | Scaffold | `app/(partner)/partner/page.tsx` |

**You inherit** the Partner scaffold and `lib/partner/auth.ts` stub — replace/extend them; do not rebuild login or NextAuth.

---

## Shahrukh — quick reference

### Your scope (OpCo **+** Partner)

| Portal | Folders |
|--------|---------|
| OpCo | `app/(opco)/`, `app/api/opco/`, `lib/opco/`, `components/opco/` |
| Partner | `app/(partner)/`, `app/api/partner/`, `lib/partner/`, `components/partner/` |

### NOT your scope

- `app/(admin)/`, `app/(auth)/` (except reading session) — Hussnain
- `app/(dizlee)/` — Haseeb
- UC-6B Consolidation UI/logic — Haseeb (Dizlee)
- ERD changes without Hussnain approval

### Partner test logins (after `npm run seed`)

Sign in at **`/login`** (not `/admin/login`). Password for all seed users: **`Password123!`**

| Email | Partner |
|-------|---------|
| `spotify@dizlee.com` | Spotify |
| `apple@dizlee.com` | Apple |
| `netflix@dizlee.com` | Netflix |

Full list: `prisma/seed-data/partners.ts` or `docs/SEED_DATA.md`

### Git workflow

```bash
git checkout develop
git pull origin develop
git checkout -b feature/shahrukh-partner-nav   # example
# work → commit → push → PR to develop
```

---

## Before opening Cursor — local setup

```bash
cd Dizlee-Reconciliation
git checkout develop
git pull origin develop
git checkout -b feature/shahrukh-partner-setup
npm install
npx prisma migrate deploy   # or: npx prisma migrate dev
npm run seed
npm run dev
```

Confirm:

- `http://localhost:3000/opco` — OpCo placeholder or your OpCo work
- `http://localhost:3000/partner` — Partner placeholder (you will replace this)
- `http://localhost:3000/login` — sign in as `spotify@dizlee.com` / `Password123!` → should redirect to `/partner`

---

## Then paste everything below into Cursor's chat (Agent mode)

---

I am Shahrukh. I own the **OpCo portal** and the **Partner portal** on the Dizlee Reconciliation Platform. Hussnain built shared Auth and Admin; Haseeb owns Dizlee. I do not touch their folders.

**Ownership transfer:** Partner portal was moved from Hussnain to me. I build all Partner use cases listed below. Hussnain’s Phase 2 prompt no longer includes Partner work.

## Database / ERD rules (CRITICAL)

**Single source of truth:** `04_DATABASE_SCHEMA_FOR_CURSOR.md`

All 27 tables are migrated. Build application code against the existing schema.

### Never do without Hussnain’s explicit approval

- Change column names, types, constraints, or indexes in the ERD
- Edit Prisma models outside my block without approval
- Add tables/columns on my own
- Run migrations that alter Hussnain’s or Haseeb’s blocks

**If Cursor suggests schema changes, stop and ask Hussnain first.**

### What I can do

- **Read** Hussnain’s tables (`users`, `opcos`, `partners`, `opco_partner_links`, `notifications`, `lookups`, `files`, etc.) — read-only
- **Read** Haseeb’s tables (`invoices`, `reconciliations`, etc.) — read-only where needed for Partner invoice views
- **Write** my tables: `reports`, `report_line_items`, `report_change_requests` (Partner upload + change requests create rows here)
- **Write** `notifications` / `notification_recipients` / `notification_reads` only as allowed in `docs/USE_CASE_OWNERSHIP.md` (e.g. mark read in inbox; create request notifications per SRS)

Full mapping: `docs/USE_CASE_OWNERSHIP.md`

## My folder boundaries

| Path | Owner | I edit? |
|------|-------|---------|
| `app/(opco)/`, `app/api/opco/`, `lib/opco/`, `components/opco/` | Shahrukh | Yes |
| `app/(partner)/`, `app/api/partner/`, `lib/partner/`, `components/partner/` | Shahrukh | Yes |
| `app/(auth)/`, `app/api/auth/`, `lib/auth/`, `middleware.ts` | Hussnain | No (read only) |
| `app/(admin)/`, `app/api/admin/`, `lib/admin/`, `components/admin/` | Hussnain | No |
| `app/(dizlee)/`, `app/api/dizlee/`, `lib/dizlee/` | Haseeb | No |
| `prisma/schema.prisma` — Shahrukh block | Shahrukh | Only with Hussnain approval |

## Auth — shared login (already built by Hussnain)

I do **not** rebuild login or NextAuth.

1. Implement **`lib/partner/auth.ts`** (mirror `lib/opco/auth.ts`):
   - `getPartnerSession()` / `requirePartnerSession()`
   - Read JWT via `getServerSession(authOptions)` from `@/lib/auth/options`
   - Require `session.user.role === "partner"` and `session.user.partnerId`
   - Scope **all** Partner queries/APIs by `partnerId` from session

2. Partner users sign in at **`/login`** (main portal login, not `/admin/login`).

3. **Allowed imports:** `@/lib/auth/options`, `@/lib/auth/types`  
   **Do NOT import:** `lib/admin/`, `lib/dizlee/`, `lib/opco/` (except patterns, not code)

Example:

```typescript
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";

export async function requirePartnerSession() {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    session.user.role !== "partner" ||
    !session.user.partnerId
  ) {
    redirect("/login?callbackUrl=/partner");
  }
  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    role: "partner" as const,
    partnerId: session.user.partnerId,
  };
}
```

Session contract: `docs/AUTH_SESSION.md`

## OpCo vs Partner — same tables, different actor

Both portals upload **reports** into Shahrukh-owned tables (`reports`, `report_line_items`). Difference is **who uploads** and **which FK is set**:

| Field | OpCo upload | Partner upload |
|-------|-------------|----------------|
| `uploaded_by_user_id` | OpCo user | Partner user |
| `opco_id` | Session `opcoId` | From report context / linked OpCo |
| `partner_id` | Selected from `opco_partner_links` | Session `partnerId` |

For Partner report upload, the Partner selects which **linked OpCo** the report is for (read `opco_partner_links` where `partner_id` = my session partner).

Reuse patterns from OpCo where sensible (Excel parse, validation, file storage) but keep **separate** `lib/partner/` and `components/partner/` — do not import OpCo modules into Partner routes.

## Build Partner use cases — in this order

Reference SRS: `SRS_Reconciliation_Professional.docx`

### Phase P1 — Partner navigation shell
- **UC-01-PARTNER:** Side navigation (Dashboard, Upload Report, Reports, Invoices, Notifications; footer Settings if in SRS)
- Layout + auth guard using `requirePartnerSession()`
- Land on Dashboard after login (`/partner` or `/partner/dashboard` per SRS)

### Phase P2 — Dashboard + Reports
- **UC-02-PARTNER:** Partner Dashboard — period-scoped submission summary for this partner
- **UC-03-PARTNER:** Upload Report (Partner) — Excel upload, OpCo dropdown from `opco_partner_links` (read-only on Hussnain’s tables)
- **UC-04-PARTNER:** View Reports (Partner) — paginated list, filters, detail modal
- **UC-05-PARTNER:** Request Report Upload — create row in `report_change_requests`; notify Dizlee via `notifications` (write per ownership doc)
- **Replace upload (follow-on):** After Dizlee approves reupload, show **Reupload corrected file** on report row; replace file + line items once; mark request COMPLETED

### Phase P3 — Invoices
- **UC-06-PARTNER:** Upload Invoice (Partner) — `PARTNER_TO_CLIENT` invoices into Haseeb’s `invoices` / `invoice_items` (write only fields Partner actor owns per SRS; read ownership doc)
- **UC-07-PARTNER:** View Invoices (Partner) — list + detail; **lifecycle tracker** tab per SRS

### Phase P4 — Notifications inbox
- Partner Notifications inbox (header bell → Inbox)
- List notifications for current Partner user (`notification_recipients`, `notification_reads`)
- View detail, mark read, dismiss
- **Do NOT compose/send** bulk notifications — that is Dizlee (Haseeb)

### Phase P5 — Self-QA
- Unit tests: Partner upload validation, auth scoping by `partnerId`
- Integration tests per `app/api/partner/*` route

## Cross-team dependencies (build with mocks first)

| I need | From | Workaround locally |
|--------|------|-------------------|
| OpCo–Partner links | Hussnain seed | `npm run seed` |
| Partner users | Hussnain seed | `spotify@dizlee.com` / `Password123!` |
| Dizlee approves reupload | Haseeb | Insert approved `report_change_requests` via Prisma Studio |
| Invoice lifecycle from Dizlee | Haseeb | Seed or manual DB rows for UC-07 testing |

Do **not** wait for Haseeb to finish — use seed + local DB fixtures.

## UI / code conventions

- Match OpCo portal styling (Tailwind, same table/modal patterns) for consistency
- Use Zod + API route handlers under `app/api/partner/`
- TanStack Table / client fetch patterns similar to `components/dizlee/` or `components/opco/` if already present
- File uploads: follow existing OpCo report upload pattern (`lib/opco/` — replicate logic in `lib/partner/`, do not cross-import)

## When Partner Phase 1 is done

1. PR to `develop` with description referencing UC-01-PARTNER
2. Coordinate with Hussnain for auth/session smoke test
3. Coordinate with Haseeb when Partner reports/invoices feed Dizlee reconciliation

Do not merge `develop` → `main` yourself.

---

## Related documents

| Doc | Purpose |
|-----|---------|
| `02_SHAHRUKH_HANDOFF_PROMPT.md` | OpCo portal (full prompt) |
| `docs/HANDOFF_SHAHRUKH.md` | OpCo quick reference |
| `docs/USE_CASE_OWNERSHIP.md` | Who builds which UC |
| `docs/AUTH_SESSION.md` | JWT fields, login URLs |
| `docs/SEED_DATA.md` | Seed users and partner list |
| `05_HUSSNAIN_PHASE2_PROMPT.md` | Hussnain scope (Auth + Admin only) |
