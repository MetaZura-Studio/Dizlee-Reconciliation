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
| Forgot password (login pages) | `/reset-password?token=…` | **1 hour** |
| Logged-in change password | `/change-password` | — |

- Admin **create user** does not set a password — an invite email is sent.
- Tokens are single-use, stored hashed in `users.password_reset_token`.
- Outbound mail respects `app_settings.email_enabled` and DB SMTP host/port/sender; credentials stay in env vars.
- **Dev without SMTP / email disabled:** invite link is logged to the server console and returned in the create-user API response as `devPreviewUrl`.

Configure SMTP credentials in `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`). Host/port/sender can also be managed in Admin → Email Settings.

---

## Cookies & CSRF (S15)

Login uses **HTTP-only JWT cookies** (not `localStorage`). Cookie flags are set explicitly in [`lib/auth/cookies.ts`](../lib/auth/cookies.ts) and applied via [`lib/auth/options.ts`](../lib/auth/options.ts).

**Two concurrent sessions:** Admin and main portals use **separate cookie names** so both can stay signed in in different tabs on the same origin.

| Portal | Auth mount | Session cookie (HTTP) |
|--------|------------|------------------------|
| OpCo / Partner / Dizlee | `/api/auth` | `next-auth.session-token` |
| Admin | `/api/admin-auth` | `next-auth.admin-session-token` |

| Flag | Value | Why |
|------|--------|-----|
| `HttpOnly` | `true` | JavaScript on the page cannot read the session cookie |
| `SameSite` | `lax` | Other sites generally cannot send the cookie on cross-site POSTs (main CSRF defense for cookie sessions) |
| `Secure` | `true` on HTTPS (`NEXTAUTH_URL` starts with `https://`, or production without a URL override) | Cookie only sent over HTTPS |
| `Path` | `/` | Whole app |

**CSRF posture:** We do **not** add a separate CSRF token layer on every API. Protection is:

1. **SameSite=Lax** session + CSRF cookies (locked above; NextAuth also issues a CSRF cookie for its own sign-in flow)
2. Browser calls to `/api/*` are same-site from our portals; cross-site form POSTs from evil.com typically do not include the session cookie
3. Middleware + per-route session checks (S14) still require a valid logged-in user

**Not covered by SameSite alone:** rare cases (old browsers, some cross-site top-level GETs with Lax). Destructive actions stay behind authenticated POSTs and role checks.

---

## Environment variables

```env
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

In production, set `NEXTAUTH_URL` to your `https://…` origin so Secure cookie flags apply.
