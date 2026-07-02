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

| Email | Password | Role | Sign in at |
|-------|----------|------|------------|
| `admin@dizlee.com` | `Password123!` | Admin | `/admin/login` |
| `client@dizlee.com` | `Password123!` | Dizlee | `/login` |
| `opco@dizlee.com` | `Password123!` | OpCo | `/login` |
| `partner@dizlee.com` | `Password123!` | Partner | `/login` |

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
