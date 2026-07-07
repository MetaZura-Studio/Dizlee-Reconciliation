# How to use these files

| File | Who uses it | When |
|---|---|---|
| `01_HUSSNAIN_BOOTSTRAP_PROMPT.md` | Hussnain | **Done** — Phase 1 scaffold (historical reference) |
| `05_HUSSNAIN_PHASE2_PROMPT.md` | Hussnain | **Now** — Auth + Admin development |
| `02_SHAHRUKH_HANDOFF_PROMPT.md` | Shahrukh | OpCo portal |
| `docs/HANDOFF_SHAHRUKH_PARTNER.md` | Shahrukh | **Partner portal** (transferred from Hussnain) |
| `03_HASEEB_HANDOFF_PROMPT.md` | Haseeb | After pulling `develop` — Dizlee portal |
| `04_DATABASE_SCHEMA_FOR_CURSOR.md` | Everyone | **ERD — do not change without Hussnain approval** |
| `docs/USE_CASE_OWNERSHIP.md` | Everyone | SRS use case → developer mapping |

Quick references in `docs/HANDOFF_*.md`.

---

## What each developer does

1. Clone repo, checkout `develop`, run local setup (see handoff file at top).
2. Run `npm run seed` for local test data.
3. Create `feature/<name>-<task>` branch from `develop`.
4. Paste handoff prompt (below `---` line) into Cursor Agent mode.
5. Build only in owned folders — see `docs/USE_CASE_OWNERSHIP.md`.
6. Open PR → `develop`, wait for CI green, merge on GitHub.

**All three developers work in parallel.** No one waits for another portal to finish. Cross-team data is read via Prisma (read-only) or written only where the ownership doc allows (e.g. Haseeb writes `consolidations` for UC-6B).

---

## ERD rules (all developers)

- `04_DATABASE_SCHEMA_FOR_CURSOR.md` is the single source of truth.
- All 27 tables are already migrated — build app code against the existing schema.
- **Cursor must ask Hussnain explicitly before any ERD or Prisma schema change.**
- Table placement in Prisma blocks ≠ UI ownership (e.g. `consolidations` is in Shahrukh's block but implemented by Haseeb per SRS).

---

## Local databases

Each developer runs their **own** local MySQL (see `docs/LOCAL_DATABASE_SETUP.md`). Not shared. TiDB Cloud is for staging/production later.

---

## Sending handoffs to the team

Send Shahrukh:
- `02_SHAHRUKH_HANDOFF_PROMPT.md` (OpCo)
- `docs/HANDOFF_SHAHRUKH_PARTNER.md` (Partner — ownership transfer from Hussnain)
Send Haseeb the full `03_HASEEB_HANDOFF_PROMPT.md`.  
Repo URL: https://github.com/MetaZura-Studio/Dizlee-Reconciliation
