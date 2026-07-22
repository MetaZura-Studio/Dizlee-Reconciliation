"use client";

import { SessionProvider } from "next-auth/react";

import { NavigationProgress } from "@/components/ui/navigation-progress";
import { ToastProvider } from "@/components/ui/toast";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <NavigationProgress />
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}
