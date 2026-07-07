# Partner Portal — Ownership Transfer

**From:** Hussnain  
**To:** Shahrukh  
**Date:** July 2026

---

## Summary

The **Partner portal** is no longer Hussnain’s responsibility. **Shahrukh** now owns both:

- **OpCo portal** (`/opco`)
- **Partner portal** (`/partner`)

Hussnain keeps **Auth** (shared login) and **Admin** (`/admin`) only.

---

## Why

- Hussnain focuses on platform setup: login, admin, users, settings.
- Shahrukh already builds OpCo report upload — Partner upload uses the same tables (`reports`, `report_line_items`).
- One developer for both sides of report submission is simpler.

---

## What changed for each developer

| Developer | Before | After |
|-----------|--------|-------|
| **Hussnain** | Auth + Admin + Partner | Auth + Admin only |
| **Shahrukh** | OpCo only | OpCo + Partner |
| **Haseeb** | Dizlee | Dizlee (unchanged) |

---

## Folders Shahrukh now owns (Partner)

```
app/(partner)/
app/api/partner/
lib/partner/
components/partner/
```

Hussnain does **not** add features here anymore.

---

## What Hussnain already built (Shahrukh should not rebuild)

- `/login` and NextAuth (`app/api/auth/`)
- `middleware.ts` (role-based route protection)
- Seed data: 35 Partner users (`spotify@dizlee.com`, etc.) — see `docs/SEED_DATA.md`
- Partner **placeholder page** only (`app/(partner)/partner/page.tsx`)

---

## Partner use cases — Shahrukh builds these

| UC | Feature |
|----|---------|
| UC-01-PARTNER | Side navigation |
| UC-02-PARTNER | Dashboard |
| UC-03-PARTNER | Upload Report |
| UC-04-PARTNER | View Reports |
| UC-05-PARTNER | Request Report Upload |
| UC-06-PARTNER | Upload Invoice |
| UC-07-PARTNER | View Invoices (+ lifecycle) |
| — | Notifications inbox |
| — | Replace upload after Dizlee approval |

---

## How Shahrukh starts

```bash
git checkout develop
git pull origin develop
npm install
npm run seed
npm run dev
```

Test Partner login: `http://localhost:3000/login`  
Email: `spotify@dizlee.com` / Password: `Password123!`

---

## Full technical handoff for Cursor

For detailed build instructions (paste into Cursor Agent):

**`docs/HANDOFF_SHAHRUKH_PARTNER.md`**

For ownership map across all three developers:

**`docs/USE_CASE_OWNERSHIP.md`**
