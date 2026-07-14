import { Suspense } from "react";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { DizleeLogo } from "@/components/brand/dizlee-logo";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center bg-canvas justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-surface p-8 shadow-sm">
        <div className="space-y-4">
          <DizleeLogo variant="full" priority className="h-10 px-2" />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Forgot password?</h1>
            <p className="text-sm text-foreground-muted">
              Enter the email address for your account. We&apos;ll send you a link to
              reset your password.
            </p>
          </div>
        </div>

        <Suspense fallback={<p className="text-sm text-foreground-subtle">Loading…</p>}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
