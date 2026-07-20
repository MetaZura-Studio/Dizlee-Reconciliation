import { Suspense } from "react";

import { DizleeLogo } from "@/components/brand/dizlee-logo";
import { ui } from "@/lib/ui/classes";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className={ui.authCard}>
        <div className="space-y-4">
          <DizleeLogo variant="full" priority className="h-10 px-2" />
          <div className="space-y-1">
            <h1 className={ui.pageTitle}>Sign in</h1>
          </div>
        </div>

        <Suspense fallback={<p className="text-sm text-foreground-subtle">Loading...</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
