import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { verifyPassword } from "@/lib/auth/password";
import { writeUserSessionAuditLog } from "@/lib/auth/audit";
import {
  isAuthLoginScope,
  roleAllowedForLoginScope,
  type AuthLoginScope,
} from "@/lib/auth/scopes";
import { isAppRole, normalizeRoleCode } from "@/lib/auth/types";
import prisma from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  scope: z.string().optional(),
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
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
        let scope: AuthLoginScope = "main";
        if (rawScope && isAuthLoginScope(rawScope)) {
          scope = rawScope;
        }

        const user = await prisma.user.findFirst({
          where: {
            email: email.toLowerCase(),
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId && token.role) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.opcoId = token.opcoId ?? null;
        session.user.partnerId = token.partnerId ?? null;
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
