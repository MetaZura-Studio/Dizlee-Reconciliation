"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { SetPasswordForm } from "@/components/auth/set-password-form";

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          This set-password link is invalid. Ask your administrator for a new invite
          or use forgot password from the sign-in page.
        </p>
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/forgot-password" className="text-zinc-700 underline hover:text-zinc-900">
            Forgot password
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
      onSuccess={() => {
        router.push("/login?message=PasswordSet");
      }}
    />
  );
}

export default function SetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-zinc-200 p-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Set your password</h1>
          <p className="text-sm text-zinc-600">
            Choose a password for your account. Invite links expire in 1 hour and
            can only be used once.
          </p>
        </div>

        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <SetPasswordContent />
        </Suspense>
      </div>
    </div>
  );
}
