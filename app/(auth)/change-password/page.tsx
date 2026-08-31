import Link from "next/link";
import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { DizleeLogo } from "@/components/brand/dizlee-logo";
import { getPortalHomePath } from "@/lib/auth/roles";
import { getAnyAppSessionUser } from "@/lib/auth/session";
import { isAppRole } from "@/lib/auth/types";

export default async function ChangePasswordPage() {
  const user = await getAnyAppSessionUser();

  if (!user?.role || !isAppRole(user.role)) {
    redirect("/login");
  }

  const backPath = getPortalHomePath(user.role);

  return (
    <div className="flex min-h-screen items-center bg-canvas justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-surface p-8 shadow-sm">
        <div className="space-y-4">
          <DizleeLogo variant="full" priority className="h-10 px-2" />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Change password</h1>
            <p className="text-sm text-foreground-muted">
              Update your password. You will stay signed in after saving.
            </p>
          </div>
        </div>

        <ChangePasswordForm />

        <p className="text-sm">
          <Link href={backPath} className="text-foreground-muted underline hover:text-foreground">
            Back to portal
          </Link>
        </p>
      </div>
    </div>
  );
}
