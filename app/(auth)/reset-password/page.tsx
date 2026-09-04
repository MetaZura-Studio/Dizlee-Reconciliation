"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { SetPasswordForm } from "@/components/auth/set-password-form";
import { DizleeLogo } from "@/components/brand/dizlee-logo";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          This reset link is invalid. Request a new one from the sign-in page.
        </p>
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/forgot-password" className="text-foreground-muted underline hover:text-foreground">
            Request a new reset link
          </Link>
          <Link href="/login" className="text-foreground-muted underline hover:text-foreground">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SetPasswordForm
      token={token}
      variant="reset"
      onSuccess={() => {
        router.push("/login?message=PasswordReset");
      }}
    />
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center bg-canvas justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-surface p-8 shadow-sm">
        <div className="space-y-4">
          <DizleeLogo variant="full" priority className="h-10 px-2" />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Reset your password</h1>
            <p className="text-sm text-foreground-muted">
              Choose a new password for your account. This link expires in 1 hour
              and can only be used once.
            </p>
          </div>
        </div>

        <Suspense fallback={<p className="text-sm text-foreground-subtle">Loading…</p>}>
          <ResetPasswordContent />
        </Suspense>

        <p className="text-sm">
          <Link href="/login" className="text-foreground-muted underline hover:text-foreground">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
