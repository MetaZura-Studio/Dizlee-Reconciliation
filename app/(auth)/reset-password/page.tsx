"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { SetPasswordForm } from "@/components/auth/set-password-form";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          This reset link is invalid. Request a new one from the sign-in page.
        </p>
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/forgot-password" className="text-zinc-700 underline hover:text-zinc-900">
            Request a new reset link
          </Link>
          <Link href="/login" className="text-zinc-700 underline hover:text-zinc-900">
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-zinc-200 p-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Reset your password</h1>
          <p className="text-sm text-zinc-600">
            Choose a new password for your account. This link expires in 24 hours
            and can only be used once.
          </p>
        </div>

        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <ResetPasswordContent />
        </Suspense>

        <p className="text-sm">
          <Link href="/login" className="text-zinc-700 underline hover:text-zinc-900">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
