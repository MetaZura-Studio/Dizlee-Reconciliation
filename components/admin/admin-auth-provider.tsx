"use client";

import { SessionProvider } from "next-auth/react";

import { ADMIN_AUTH_BASE_PATH } from "@/lib/auth/options";

/**
 * Admin subtree uses a separate NextAuth mount so Admin cookies do not
 * overwrite OpCo/Partner/Dizlee sessions on the same origin.
 */
export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath={ADMIN_AUTH_BASE_PATH} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}
