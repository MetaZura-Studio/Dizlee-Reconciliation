# Partner Portal — Shahrukh

Owned by Shahrukh. Full handoff: [`docs/HANDOFF_SHAHRUKH_PARTNER.md`](../../docs/HANDOFF_SHAHRUKH_PARTNER.md)

## Local dev environment (P0)

Branch: `feature/shahrukh-partner-setup`

### Setup checklist

| Step | Command / action | Status |
|------|------------------|--------|
| Clone + checkout `develop` | `git pull origin develop` | Done |
| Create branch | `git checkout -b feature/shahrukh-partner-setup` | Done |
| Env files | `cp .env.example .env` and `.env.local` | Done (shared with OpCo setup) |
| Install | `npm install` | Done |
| Migrate | `npx prisma migrate deploy` or `npx prisma migrate dev` | Done |
| Seed | `npm run seed` | Done |
| Dev server | `npm run dev` | Run `npm run dev` then open `/login` |
| Partner login | `http://localhost:3000/login` | `spotify@dizlee.com` / `Password123!` |
| Partner portal | `http://localhost:3000/partner` | Scaffold loads after login |
| Role isolation | Partner user visits `/opco` | Blocked by middleware |
| CI locally | `npm run lint && npm run typecheck && npm run test && npm run build` | Done (77 tests; run `npm install` if nodemailer missing) |

### Partner seed logins (after `npm run seed`)

| Email | Password | Partner |
|-------|----------|---------|
| `spotify@dizlee.com` | `Password123!` | Spotify |
| `apple@dizlee.com` | `Password123!` | Apple |
| `netflix@dizlee.com` | `Password123!` | Netflix |

Full list: [`docs/SEED_DATA.md`](../../docs/SEED_DATA.md)

See [`docs/AUTH_SESSION.md`](../../docs/AUTH_SESSION.md) for session contract.

### Finish P0 locally

```powershell
npx prisma migrate deploy
npm run seed
npm run dev
# Open http://localhost:3000/login → sign in as spotify@dizlee.com
# Confirm redirect to /partner
```

Then push: `git push -u origin feature/shahrukh-partner-setup` and open PR → `develop`.
