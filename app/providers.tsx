"use client";

import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";

import { NavigationProgress } from "@/components/ui/navigation-progress";
import { ToastProvider } from "@/components/ui/toast";

/**
 * Main portal SessionProvider must not wrap /admin — Admin uses a separate
 * NextAuth mount (`/api/admin-auth`) via AdminAuthProvider. Nesting both
 * SessionProviders made browser Admin sign-in set the wrong cookie while
 * the form then checked `/api/admin-auth/session` (looked like bad password).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute =
    pathname === "/admin" || (pathname?.startsWith("/admin/") ?? false);

  const inner = (
    <ToastProvider>
      <NavigationProgress />
      {children}
    </ToastProvider>
  );

  if (isAdminRoute) {
    return inner;
  }

  return <SessionProvider>{inner}</SessionProvider>;
}
