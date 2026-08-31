import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DizleeLogo } from "@/components/brand/dizlee-logo";
import { ADMIN_DEFAULT_ROUTE } from "@/lib/admin/navigation";
import { getAdminAppSessionUser } from "@/lib/auth/session";
import { ui } from "@/lib/ui/classes";

import { AdminLoginForm } from "./admin-login-form";

export default async function AdminLoginPage() {
  const user = await getAdminAppSessionUser();

  if (user?.role === "admin") {
    redirect(ADMIN_DEFAULT_ROUTE);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className={ui.authCard}>
        <div className="space-y-4">
          <DizleeLogo variant="full" priority className="h-10 px-2" />
          <div className="space-y-1">
            <h1 className={ui.pageTitle}>Admin sign in</h1>
          </div>
        </div>

        <Suspense fallback={<p className="text-sm text-foreground-subtle">Loading...</p>}>
          <AdminLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
