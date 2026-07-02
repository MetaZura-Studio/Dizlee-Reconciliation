# Auth session contract

Shared login is implemented with **NextAuth.js** (Credentials provider, JWT session). All portals use the same login page at `/login`.

**Owner:** Hussnain (`app/(auth)/`, `app/api/auth/`, `lib/auth/`, `middleware.ts`)

Other developers implement **portal-specific guards** in their own `lib/<portal>/auth.ts` by reading the same JWT session fields documented below. Do **not** import from `lib/admin/` or `lib/partner/`.

---

## Login flow

1. User opens `/login` and submits email + password.
2. NextAuth validates against the `users` table (`password_hash`, `role_id`, `status_id`).
3. On success, user is redirected by role:

| Role (JWT) | Lookup code | Portal home |
|------------|-------------|-------------|
| `admin` | `ADMIN` | `/admin` |
| `client` | `CLIENT` | `/dizlee` |
| `opco` | `OPCO` | `/opco` |
| `partner` | `PARTNER` | `/partner` |

4. `middleware.ts` blocks unauthenticated access to `/admin`, `/partner`, `/opco`, `/dizlee` and enforces role-to-portal matching.

---

## JWT / session fields

After login, `session.user` contains:

```typescript
{
  id: string;           // users.id as string
  email: string;
  name?: string | null;
  role: "admin" | "client" | "opco" | "partner";
  opcoId: string | null;    // required for role opco
  partnerId: string | null; // required for role partner
}
```

Type definitions: `lib/auth/types.ts`, `types/next-auth.d.ts`

### Reading session in a portal (example for Shahrukh)

```typescript
// lib/opco/auth.ts — Shahrukh owns this file
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

export async function requireOpcoSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "opco" || !session.user.opcoId) {
    return null;
  }
  return session.user;
}
```

**Allowed:** import `@/lib/auth/options` and `@/lib/auth/types` for session reads.  
**Not allowed:** import `lib/admin/` or `lib/partner/`.

---

## Local dev seed users

Run after migrate:

```bash
npm run seed
```

| Email | Password | Role | Portal |
|-------|----------|------|--------|
| `admin@dizlee.com` | `Password123!` | Admin | `/admin` |
| `client@dizlee.com` | `Password123!` | Dizlee | `/dizlee` |
| `opco@dizlee.com` | `Password123!` | OpCo | `/opco` |
| `partner@dizlee.com` | `Password123!` | Partner | `/partner` |

Seed also creates: USD currency, demo OpCo, demo Partner, and an OpCo–Partner link.

---

## Environment variables

```env
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

---

## Not in this release (Hussnain Phase 2 later)

- UC-02-COMMON Change Password UI
- UC-03-COMMON Forgot Password flow
- Outbound SMTP email
