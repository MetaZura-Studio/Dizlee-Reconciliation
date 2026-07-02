import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getAppSessionUser } from "@/lib/auth/session";

import { AdminLoginForm } from "./admin-login-form";

export default async function AdminLoginPage() {
  const user = await getAppSessionUser();

  if (user?.role === "admin") {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-zinc-200 p-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Admin sign in</h1>
          <p className="text-sm text-zinc-600">
            Platform administration only. OpCo, Dizlee, and Partner users must
            use the main sign-in page.
          </p>
        </div>

        <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>
          <AdminLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
