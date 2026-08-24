/**
 * NextAuth configuration: credentials login, JWT sessions, and scoped role enforcement.
 * Consumed by the auth route handler and all getServerSession callers.
 * Login scope `admin` allows admin only; `main` allows opco, partner, and client roles.
 * JWT callback revalidates ACTIVE + not-deleted so suspend/delete kicks in within ~30s.
 */

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import {
  loadActiveAuthUser,
  shouldRevalidateAuthUser,
} from "@/lib/auth/active-user";
import { verifyPassword } from "@/lib/auth/password";
import { writeUserSessionAuditLog } from "@/lib/auth/audit";
import {
  AUTH_RATE_LIMITS,
  consumeRateLimit,
  normalizeRateLimitEmail,
} from "@/lib/auth/rate-limit";
import {
  isAuthLoginScope,
  roleAllowedForLoginScope,
  type AuthLoginScope,
} from "@/lib/auth/scopes";
import { isAppRole, normalizeRoleCode } from "@/lib/auth/types";
import { buildAuthCookies } from "@/lib/auth/cookies";
import prisma from "@/lib/prisma";
import type { JWT } from "next-auth/jwt";

function clearAuthClaims(token: JWT): JWT {
  token.userId = undefined;
  token.role = undefined;
  token.opcoId = undefined;
  token.partnerId = undefined;
  token.error = "InactiveUser";
  token.lastValidatedAt = Date.now();
  return token;
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  scope: z.string().optional(),
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    // Short-lived sessions: suspended/deleted users lose access within this window at worst.
    maxAge: 15 * 60,
    // Refresh the JWT often so inactive/suspended users are dropped quickly.
    updateAge: 60,
  },
  // Explicit cookie flags (SameSite=Lax, HttpOnly, Secure on HTTPS) — see docs/AUTH_SESSION.md
  cookies: buildAuthCookies(),
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        scope: { label: "Scope", type: "text" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password, scope: rawScope } = parsed.data;

        const emailKey = normalizeRateLimitEmail(email);
        const emailLimit = consumeRateLimit({
          key: `login:email:${emailKey}`,
          limit: AUTH_RATE_LIMITS.loginEmail.limit,
          windowMs: AUTH_RATE_LIMITS.loginEmail.windowMs,
        });
        if (!emailLimit.allowed) {
          return null;
        }

        let scope: AuthLoginScope = "main";
        if (rawScope && isAuthLoginScope(rawScope)) {
          scope = rawScope;
        }

        const user = await prisma.user.findFirst({
          where: {
            email: emailKey,
            isDeleted: false,
          },
          include: {
            role: true,
            status: true,
          },
        });

        if (!user?.passwordHash || user.status.code !== "ACTIVE") {
          return null;
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        const role = normalizeRoleCode(user.role.code);

        if (!roleAllowedForLoginScope(role, scope)) {
          return null;
        }

        if (role === "opco" && !user.opcoId) {
          return null;
        }

        if (role === "partner" && !user.partnerId) {
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        await writeUserSessionAuditLog({
          userId: user.id,
          action: "USER_LOGIN",
          role,
          email: user.email,
          scope,
        });

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role,
          opcoId: user.opcoId?.toString() ?? null,
          partnerId: user.partnerId?.toString() ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.opcoId = user.opcoId;
        token.partnerId = user.partnerId;
        token.error = undefined;
        token.lastValidatedAt = Date.now();
        return token;
      }

      if (!token.userId || token.error === "InactiveUser") {
        if (token.error === "InactiveUser") {
          return clearAuthClaims(token);
        }
        return token;
      }

      if (!shouldRevalidateAuthUser(token.lastValidatedAt)) {
        return token;
      }

      const active = await loadActiveAuthUser(token.userId);
      if (!active) {
        return clearAuthClaims(token);
      }

      token.userId = active.id;
      token.role = active.role;
      token.opcoId = active.opcoId;
      token.partnerId = active.partnerId;
      token.email = active.email;
      token.error = undefined;
      token.lastValidatedAt = Date.now();
      return token;
    },
    async session({ session, token }) {
      if (
        token.error === "InactiveUser" ||
        !token.userId ||
        !token.role ||
        !isAppRole(token.role)
      ) {
        // Leave session without app claims so portal/API guards treat as logged out.
        if (session.user) {
          delete (session.user as { id?: string }).id;
          delete (session.user as { role?: unknown }).role;
          session.user.opcoId = null;
          session.user.partnerId = null;
        }
        return session;
      }

      if (session.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.opcoId = token.opcoId ?? null;
        session.user.partnerId = token.partnerId ?? null;
        if (token.email) {
          session.user.email = token.email;
        }
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      const userId = token?.userId;
      const role = token?.role;
      const email = token?.email;

      if (
        typeof userId !== "string" ||
        typeof role !== "string" ||
        typeof email !== "string"
      ) {
        return;
      }

      const normalizedRole = isAppRole(role) ? role : normalizeRoleCode(role);

      await writeUserSessionAuditLog({
        userId: BigInt(userId),
        action: "USER_LOGOUT",
        role: normalizedRole,
        email,
      });
    },
  },
};
