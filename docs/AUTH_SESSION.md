# Auth session contract

Login uses **NextAuth.js** (Credentials provider, JWT session) with **two separate entry points** on the same app (port 3000).

**Owner:** Hussnain (`app/(auth)/`, `app/(admin)/admin/login/`, `app/api/auth/`, `lib/auth/`, `middleware.ts`)

Other developers implement **portal-specific guards** in their own `lib/<portal>/auth.ts`. Do **not** import from `lib/admin/` or `lib/partner/`.

---

## Two login URLs

| URL | Who can sign in | Redirect after login |
|-----|-----------------|----------------------|
| `/login` | **OpCo, Dizlee, Partner only** | `/opco`, `/dizlee`, or `/partner` |
| `/admin/login` | **Admin only** | `/admin` |

**Rules:**
- Admin credentials on `/login` → **rejected** (invalid email/password)
- OpCo / Dizlee / Partner credentials on `/admin/login` → **rejected**
- Unauthenticated `/admin/*` (except `/admin/login`) → redirect to `/admin/login`
- Unauthenticated `/opco`, `/dizlee`, `/partner` → redirect to `/login`

Credentials include a hidden `scope` field: `main` or `admin` (enforced in `lib/auth/options.ts`).

---

## JWT / session fields

After login, `session.user` contains:

```typescript
{
  id: string;
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

**Allowed:** `@/lib/auth/options`, `@/lib/auth/types`  
**Not allowed:** `lib/admin/`, `lib/partner/`, `lib/dizlee/`

---

## Local dev seed users

```bash
npm run seed
```

**Password for all seed users:** `Password123!`

| Email | Role | Sign in at |
|-------|------|------------|
| `admin@dizlee.com` | Admin | `/admin/login` |
| `client@dizlee.com` | Dizlee | `/login` |
| `{opco-slug}@dizlee.com` | OpCo | `/login` |
| `{partner-slug}@dizlee.com` | Partner | `/login` |

Examples: `zain-jordan@dizlee.com`, `spotify@dizlee.com`

Full list (7 OpCos, 35 Partners, 44 users): **`docs/SEED_DATA.md`**

---

## Password flows

| Flow | URL | Expiry |
|------|-----|--------|
| Admin creates user → set-password email | `/set-password?token=…` | **1 hour** |
| Forgot password (login pages) | `/reset-password?token=…` | **24 hours** |
| Logged-in change password | `/change-password` | — |

- Admin **create user** does not set a password — an invite email is sent.
- Tokens are single-use, stored hashed in `users.password_reset_token`.
- **Dev without SMTP:** invite link is logged to the server console and returned in the create-user API response as `devPreviewUrl`.

Configure SMTP in `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`).

---

## Environment variables

```env
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

---

## Not in this release

- UC-02-COMMON Change Password UI
- UC-03-COMMON Forgot Password flow
- Outbound SMTP email
