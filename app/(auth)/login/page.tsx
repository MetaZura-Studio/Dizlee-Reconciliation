import { Suspense } from "react";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-zinc-200 p-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="text-sm text-zinc-600">
            OpCo, Dizlee, and Partner sign-in. You will be redirected to your
            portal after login.
          </p>
        </div>

        <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>
          <LoginForm />
        </Suspense>

        <p className="text-xs text-zinc-500">
          Local dev seed users are documented in{" "}
          <code className="rounded bg-zinc-100 px-1">docs/AUTH_SESSION.md</code>.
        </p>
      </div>
    </div>
  );
}
