# Handoff: Hussnain — Auth, Admin, Partner

**Full Cursor prompt:** [`05_HUSSNAIN_PHASE2_PROMPT.md`](../05_HUSSNAIN_PHASE2_PROMPT.md) — paste the section below the `---` line into Cursor Agent mode.

**Repo:** https://github.com/MetaZura-Studio/Dizlee-Reconciliation

---

## Quick reference

### Your scope
- `app/(auth)/`, `app/(admin)/`, `app/(partner)/`
- `app/api/admin/`, `app/api/partner/`
- `lib/admin/`, `lib/partner/`, `components/admin/`, `components/partner/`
- `prisma/schema.prisma` — **Hussnain block** + `prisma/seed.ts`
- ERD owner — all schema changes require your explicit approval

### Database (CRITICAL)
- **Source of truth:** [`04_DATABASE_SCHEMA_FOR_CURSOR.md`](../04_DATABASE_SCHEMA_FOR_CURSOR.md)
- Review PRs that touch `prisma/` — reject unapproved ERD changes

### Work independently
- Admin + Partner + Auth do not depend on OpCo/Dizlee portals being finished
- See [`USE_CASE_OWNERSHIP.md`](./USE_CASE_OWNERSHIP.md)

### Your use cases (summary)
| Phase | UCs |
|-------|-----|
| Auth | UC-01/02/03-COMMON |
| Admin | UC-01-ADMIN through UC-13, UC-08 audit |
| Partner | UC-01–07-PARTNER, Notifications inbox, Replace upload |

### Team handoffs to send
| Developer | Send them |
|-----------|-----------|
| Shahrukh | `02_SHAHRUKH_HANDOFF_PROMPT.md` |
| Haseeb | `03_HASEEB_HANDOFF_PROMPT.md` |

### Git workflow
- `feature/hussnain-<task>` → PR → `develop`
- Never push directly to `main` or `develop`
