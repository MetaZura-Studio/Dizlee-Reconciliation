# Seed data reference

Master/reference data for local development. Safe to run repeatedly — all operations are idempotent upserts.

**Owner:** Hussnain (`prisma/seed.ts`, `prisma/seed-data/`)

---

## Run the seed

```bash
npm run seed
```

To wipe transactional data **and** replace OpCos / Partners / users from the seed roster:

```bash
npm run db:reset-orgs
```

Prerequisites:

1. MySQL running and `DATABASE_URL` set in `.env`
2. Schema applied: `npx prisma migrate deploy` (or `npx prisma db push` for local dev)

---

## What gets seeded

| Entity | Count | Notes |
|--------|------:|-------|
| OpCos | 7 | Zain markets (Kuwait, KSA, Iraq, Jordan, Bahrain, Sudan, South Sudan) |
| Partners | 51 | Real roster from OpCo/Partner Excel (spelling variants merged) |
| OpCo–Partner links | 109 | Per-market matrix; South Sudan has no partners yet |
| Users | 60 | 2 platform + 7 OpCo + 51 Partner |
| Currencies | 12 | USD, EUR, GBP, KWD, SAR, IQD, JOD, BHD, SDG, SSP, AED, OMR |
| Currency monthly rates | 23 | Jan + Jun 2026 sample rates |
| Lookup types + lookups | All SRS codes | USER_ROLE, REPORT_STATUS, etc. |
| App settings | 1 | Tolerance 2.5%, reminders, bank JSON |
| Notification templates | 6 | With email template versions (INVOICE_SENT has v1 + v2) |

**Not seeded:** reconciliations, consolidations, reports, invoices, notifications, audit logs, files.

---

## Login credentials

**Password for every seed user:** `Password123!`

### Platform users

| Email | Role | Sign in at |
|-------|------|------------|
| `admin@dizlee.com` | Admin | `/admin/login` |
| `client@dizlee.com` | Dizlee | `/login` |

### OpCo portal users

Pattern: `{opco-slug}@dizlee.com` → `/login`

| Email | OpCo |
|-------|------|
| `zain-kuwait@dizlee.com` | Zain Kuwait |
| `zain-ksa@dizlee.com` | Zain KSA |
| `zain-iraq@dizlee.com` | Zain Iraq |
| `zain-jordan@dizlee.com` | Zain Jordan |
| `zain-bahrain@dizlee.com` | Zain Bahrain |
| `zain-sudan@dizlee.com` | Zain Sudan |
| `zain-south-sudan@dizlee.com` | Zain South Sudan |

### Partner portal users

Pattern: `{partner-slug}@dizlee.com` → `/login`

Examples: `arpuplus@dizlee.com`, `digitalvirgo@dizlee.com`, `google@dizlee.com`, `marvel-media@dizlee.com`

Full partner list: `prisma/seed-data/partners.ts`

### Retired demo users

`opco@dizlee.com` and `partner@dizlee.com` are soft-deleted by the seed script. Any leftover emails not in the current OpCo/Partner roster are also soft-deleted. Use slug-based emails instead.

---

## Data files

| File | Purpose |
|------|---------|
| `prisma/seed-data/opcos.ts` | 7 Zain OpCos with stable IDs |
| `prisma/seed-data/partners.ts` | 72 partners with stable IDs |
| `prisma/seed-data/opco-partner-links.ts` | Link matrix (109 lanes) |
| `prisma/seed-data/currencies.ts` | Currency definitions |
| `prisma/seed-data/currency-rates.ts` | Monthly USD rates |
| `prisma/seed-data/lookups.ts` | Lookup type codes |
| `prisma/seed-data/app-settings.ts` | Default app settings |
| `prisma/seed-data/notification-templates.ts` | Email templates + versions |

---

## For Shahrukh and Haseeb

After pulling the branch with the seed changes:

```bash
npm install
npx prisma migrate deploy   # or db push
npm run db:reset-orgs       # wipe old orgs/users/tx data + seed
# or: npm run seed          # upsert only (does not hard-delete old orgs)
```

Then sign in with any slug email above. Session contract: `docs/AUTH_SESSION.md`.
