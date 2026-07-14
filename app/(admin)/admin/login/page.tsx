import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DizleeLogo } from "@/components/brand/dizlee-logo";
import { ADMIN_DEFAULT_ROUTE } from "@/lib/admin/navigation";
import { getAppSessionUser } from "@/lib/auth/session";

import { AdminLoginForm } from "./admin-login-form";

export default async function AdminLoginPage() {
  const user = await getAppSessionUser();

  if (user?.role === "admin") {
    redirect(ADMIN_DEFAULT_ROUTE);
  }

  return (
    <div className="flex min-h-screen items-center bg-canvas justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-surface p-8 shadow-sm">
        <div className="space-y-4">
          <DizleeLogo variant="full" priority className="h-10 px-2" />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Admin sign in</h1>
            <p className="text-sm text-foreground-muted">
              Platform administration only. OpCo, Dizlee, and Partner users must
              use the main sign-in page.
            </p>
          </div>
        </div>

        <Suspense fallback={<p className="text-sm text-foreground-subtle">Loading...</p>}>
          <AdminLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
